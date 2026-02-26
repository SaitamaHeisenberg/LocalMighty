import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { apiUrl } from '$lib/api';
import {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  createVerification,
  verifyMasterPassword,
} from '$lib/services/vaultCrypto';

// Local types (mirrors shared but avoids SSR import issues)
export interface VaultEntry {
  id: string;
  label: string;
  username: string;
  passwordEncrypted: string;
  url: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface DecryptedVaultEntry {
  id: string;
  label: string;
  username: string;
  password: string; // decrypted
  url: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

const VAULT_EVENTS = {
  NEW: 'hub:vault:new',
  UPDATED: 'hub:vault:updated',
  DELETED: 'hub:vault:deleted',
} as const;

function createVaultStore() {
  const entries = writable<DecryptedVaultEntry[]>([]);
  const isSetup = writable(false);
  const isUnlocked = writable(false);
  const clipboardTimer = writable(0);

  let cryptoKey: CryptoKey | null = null;
  let clipboardInterval: ReturnType<typeof setInterval> | null = null;
  let clipboardClearTimeout: ReturnType<typeof setTimeout> | null = null;

  // Check if vault is initialized
  async function checkSetup(): Promise<boolean> {
    try {
      const res = await fetch(apiUrl('/api/hub/vault/meta'));
      if (res.ok) {
        const meta = await res.json();
        isSetup.set(meta.isSetup);
        return meta.isSetup;
      }
    } catch (err) {
      console.error('[VAULT] Check setup error:', err);
    }
    return false;
  }

  // First-time setup
  async function setupVault(masterPassword: string): Promise<boolean> {
    try {
      const salt = generateSalt();
      const key = await deriveKey(masterPassword, salt);
      const verificationBlob = await createVerification(key);

      const res = await fetch(apiUrl('/api/hub/vault/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salt, verificationBlob }),
      });

      if (res.ok) {
        cryptoKey = key;
        isSetup.set(true);
        isUnlocked.set(true);
        entries.set([]);
        return true;
      }
    } catch (err) {
      console.error('[VAULT] Setup error:', err);
    }
    return false;
  }

  // Unlock vault with master password
  async function unlock(masterPassword: string): Promise<boolean> {
    try {
      const res = await fetch(apiUrl('/api/hub/vault/meta'));
      if (!res.ok) return false;
      const meta = await res.json();
      if (!meta.isSetup) return false;

      const key = await deriveKey(masterPassword, meta.salt);
      const valid = await verifyMasterPassword(key, meta.verificationBlob);
      if (!valid) return false;

      cryptoKey = key;
      isUnlocked.set(true);

      // Load and decrypt entries
      await loadEntries();
      return true;
    } catch (err) {
      console.error('[VAULT] Unlock error:', err);
      return false;
    }
  }

  function lock() {
    cryptoKey = null;
    isUnlocked.set(false);
    entries.set([]);
    clearClipboardTimer();
  }

  async function loadEntries() {
    if (!cryptoKey) return;
    try {
      const res = await fetch(apiUrl('/api/hub/vault/entries'));
      if (!res.ok) return;
      const rawEntries: VaultEntry[] = await res.json();

      const decrypted: DecryptedVaultEntry[] = [];
      for (const entry of rawEntries) {
        try {
          const password = await decrypt(entry.passwordEncrypted, cryptoKey!);
          decrypted.push({ ...entry, password });
        } catch {
          // Can't decrypt - maybe different master password was used
          decrypted.push({ ...entry, password: '*** erreur dechiffrement ***' });
        }
      }
      entries.set(decrypted);
    } catch (err) {
      console.error('[VAULT] Load entries error:', err);
    }
  }

  async function addEntry(data: { label: string; username: string; password: string; url: string; notes: string }): Promise<boolean> {
    if (!cryptoKey) return false;
    try {
      const passwordEncrypted = await encrypt(data.password, cryptoKey);
      const res = await fetch(apiUrl('/api/hub/vault/entries'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: data.label,
          username: data.username,
          passwordEncrypted,
          url: data.url,
          notes: data.notes,
        }),
      });

      if (res.ok) {
        const entry: VaultEntry = await res.json();
        entries.update((list) => [...list, { ...entry, password: data.password }]);
        return true;
      }
    } catch (err) {
      console.error('[VAULT] Add entry error:', err);
    }
    return false;
  }

  async function updateEntry(id: string, data: { label: string; username: string; password: string; url: string; notes: string }): Promise<boolean> {
    if (!cryptoKey) return false;
    try {
      const passwordEncrypted = await encrypt(data.password, cryptoKey);
      const res = await fetch(apiUrl(`/api/hub/vault/entries/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: data.label,
          username: data.username,
          passwordEncrypted,
          url: data.url,
          notes: data.notes,
        }),
      });

      if (res.ok) {
        entries.update((list) => list.map((e) =>
          e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e
        ));
        return true;
      }
    } catch (err) {
      console.error('[VAULT] Update entry error:', err);
    }
    return false;
  }

  async function deleteEntry(id: string): Promise<boolean> {
    try {
      const res = await fetch(apiUrl(`/api/hub/vault/entries/${id}`), { method: 'DELETE' });
      if (res.ok) {
        entries.update((list) => list.filter((e) => e.id !== id));
        return true;
      }
    } catch (err) {
      console.error('[VAULT] Delete entry error:', err);
    }
    return false;
  }

  // Copy password with 30s auto-clear
  async function copyPassword(password: string) {
    if (!browser) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = password;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    // Start 30s countdown
    clearClipboardTimer();
    let remaining = 30;
    clipboardTimer.set(remaining);

    clipboardInterval = setInterval(() => {
      remaining--;
      clipboardTimer.set(remaining);
      if (remaining <= 0) {
        clearClipboardTimer();
      }
    }, 1000);

    clipboardClearTimeout = setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {});
      clipboardTimer.set(0);
    }, 30000);
  }

  function clearClipboardTimer() {
    if (clipboardInterval) {
      clearInterval(clipboardInterval);
      clipboardInterval = null;
    }
    if (clipboardClearTimeout) {
      clearTimeout(clipboardClearTimeout);
      clipboardClearTimeout = null;
    }
    clipboardTimer.set(0);
  }

  // Listen for real-time vault events from hub socket
  function handleSocketEvent(event: string, data: any) {
    if (!cryptoKey) return;

    if (event === VAULT_EVENTS.NEW || event === VAULT_EVENTS.UPDATED) {
      // Re-decrypt the entry
      decrypt(data.passwordEncrypted, cryptoKey!).then((password) => {
        if (event === VAULT_EVENTS.NEW) {
          entries.update((list) => {
            if (list.some((e) => e.id === data.id)) return list;
            return [...list, { ...data, password }];
          });
        } else {
          entries.update((list) => list.map((e) =>
            e.id === data.id ? { ...data, password } : e
          ));
        }
      }).catch(() => {});
    } else if (event === VAULT_EVENTS.DELETED) {
      entries.update((list) => list.filter((e) => e.id !== data.id));
    }
  }

  return {
    entries: { subscribe: entries.subscribe },
    isSetup: { subscribe: isSetup.subscribe },
    isUnlocked: { subscribe: isUnlocked.subscribe },
    clipboardTimer: { subscribe: clipboardTimer.subscribe },
    checkSetup,
    setupVault,
    unlock,
    lock,
    addEntry,
    updateEntry,
    deleteEntry,
    copyPassword,
    clearClipboardTimer,
    handleSocketEvent,
    VAULT_EVENTS,
  };
}

export const vaultStore = createVaultStore();
