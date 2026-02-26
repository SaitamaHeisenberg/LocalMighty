<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { vaultStore, type DecryptedVaultEntry } from '$lib/stores/vault';
  import { generatePassword, DEFAULT_OPTIONS, type PasswordOptions } from '$lib/services/passwordGenerator';
  import { generateTOTP, getTimeRemaining, isValidBase32 } from '$lib/services/totp';

  const dispatch = createEventDispatcher<{
    pasteToTextarea: { text: string };
    sendSms: { text: string };
  }>();

  // State
  let vaultSetup = false;
  let vaultUnlocked = false;
  let vaultEntries: DecryptedVaultEntry[] = [];
  let clipCountdown = 0;

  // Form state
  let masterPassword = '';
  let masterConfirm = '';
  let masterError = '';
  let showForm = false;
  let editingId: string | null = null;
  let formLabel = '';
  let formUsername = '';
  let formPassword = '';
  let formTotpSecret = '';
  let formUrl = '';
  let formNotes = '';
  let showPassword = false;
  let searchQuery = '';

  // Password generator
  let showGenerator = false;
  let genOptions: PasswordOptions = { ...DEFAULT_OPTIONS };

  // Visibility per entry
  let visiblePasswords: Set<string> = new Set();

  // TOTP live codes
  let totpCodes: Record<string, string> = {};
  let totpRemaining = 30;
  let totpInterval: ReturnType<typeof setInterval> | null = null;

  // Subscriptions
  const unsubSetup = vaultStore.isSetup.subscribe((v) => { vaultSetup = v; });
  const unsubUnlocked = vaultStore.isUnlocked.subscribe((v) => { vaultUnlocked = v; });
  const unsubEntries = vaultStore.entries.subscribe((v) => {
    vaultEntries = v;
    refreshTotpCodes();
  });
  const unsubClip = vaultStore.clipboardTimer.subscribe((v) => { clipCountdown = v; });

  onMount(async () => {
    await vaultStore.checkSetup();
    startTotpTimer();
  });

  onDestroy(() => {
    unsubSetup();
    unsubUnlocked();
    unsubEntries();
    unsubClip();
    vaultStore.clearClipboardTimer();
    if (totpInterval) clearInterval(totpInterval);
  });

  function startTotpTimer() {
    totpInterval = setInterval(() => {
      totpRemaining = getTimeRemaining();
      if (totpRemaining === 30) {
        refreshTotpCodes();
      }
    }, 1000);
  }

  function refreshTotpCodes() {
    const codes: Record<string, string> = {};
    for (const entry of vaultEntries) {
      if (entry.totpSecret && isValidBase32(entry.totpSecret)) {
        try {
          codes[entry.id] = generateTOTP(entry.totpSecret);
        } catch { /* skip */ }
      }
    }
    totpCodes = codes;
    totpRemaining = getTimeRemaining();
  }

  // Setup vault
  async function handleSetup() {
    masterError = '';
    if (masterPassword.length < 4) {
      masterError = 'Minimum 4 caracteres';
      return;
    }
    if (masterPassword !== masterConfirm) {
      masterError = 'Les mots de passe ne correspondent pas';
      return;
    }
    const ok = await vaultStore.setupVault(masterPassword);
    if (!ok) masterError = 'Erreur lors de la creation';
    masterPassword = '';
    masterConfirm = '';
  }

  // Unlock
  async function handleUnlock() {
    masterError = '';
    const ok = await vaultStore.unlock(masterPassword);
    if (!ok) {
      masterError = 'Mot de passe incorrect';
    }
    masterPassword = '';
  }

  // Lock
  function handleLock() {
    vaultStore.lock();
    visiblePasswords = new Set();
    totpCodes = {};
  }

  // Open new entry form
  function openNewForm() {
    editingId = null;
    formLabel = '';
    formUsername = '';
    formPassword = '';
    formTotpSecret = '';
    formUrl = '';
    formNotes = '';
    showPassword = false;
    showForm = true;
  }

  // Open edit form
  function openEditForm(entry: DecryptedVaultEntry) {
    editingId = entry.id;
    formLabel = entry.label;
    formUsername = entry.username;
    formPassword = entry.password;
    formTotpSecret = entry.totpSecret;
    formUrl = entry.url;
    formNotes = entry.notes;
    showPassword = false;
    showForm = true;
  }

  // Save entry
  async function saveEntry() {
    if (!formLabel.trim() || !formPassword.trim()) return;

    const data = {
      label: formLabel.trim(),
      username: formUsername.trim(),
      password: formPassword,
      totpSecret: formTotpSecret.replace(/\s/g, '').toUpperCase(),
      url: formUrl.trim(),
      notes: formNotes.trim(),
    };

    let ok: boolean;
    if (editingId) {
      ok = await vaultStore.updateEntry(editingId, data);
    } else {
      ok = await vaultStore.addEntry(data);
    }

    if (ok) {
      showForm = false;
      refreshTotpCodes();
    }
  }

  function cancelForm() {
    showForm = false;
  }

  // Delete entry
  async function deleteEntry(id: string) {
    await vaultStore.deleteEntry(id);
  }

  // Copy password
  async function copyPwd(password: string) {
    await vaultStore.copyPassword(password);
  }

  // Copy TOTP code
  let copiedTotp: string | null = null;
  let totpCopyTimeout: ReturnType<typeof setTimeout> | null = null;
  async function copyTotpCode(code: string, id: string) {
    try { await navigator.clipboard.writeText(code); } catch {
      const ta = document.createElement('textarea');
      ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copiedTotp = id;
    if (totpCopyTimeout) clearTimeout(totpCopyTimeout);
    totpCopyTimeout = setTimeout(() => { copiedTotp = null; }, 2000);
  }

  // Copy username
  let copiedUsername: string | null = null;
  let usernameCopyTimeout: ReturnType<typeof setTimeout> | null = null;
  async function copyUser(username: string, id: string) {
    try { await navigator.clipboard.writeText(username); } catch {
      const ta = document.createElement('textarea');
      ta.value = username; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copiedUsername = id;
    if (usernameCopyTimeout) clearTimeout(usernameCopyTimeout);
    usernameCopyTimeout = setTimeout(() => { copiedUsername = null; }, 2000);
  }

  // Toggle password visibility
  function toggleVisible(id: string) {
    if (visiblePasswords.has(id)) {
      visiblePasswords.delete(id);
    } else {
      visiblePasswords.add(id);
    }
    visiblePasswords = visiblePasswords;
  }

  // Password generator
  function useGenerated() {
    formPassword = generatePassword(genOptions);
    showGenerator = false;
  }

  function regenerate() {
    formPassword = generatePassword(genOptions);
  }

  // EF-4.7: Paste password to hub textarea
  function pasteToTextarea(text: string) {
    dispatch('pasteToTextarea', { text });
  }

  // EF-5.3: Send via SMS
  function sendViaSms(text: string) {
    dispatch('sendSms', { text });
  }

  // Filter entries
  $: filteredEntries = searchQuery.trim()
    ? vaultEntries.filter((e) => {
        const q = searchQuery.toLowerCase();
        return e.label.toLowerCase().includes(q)
          || e.username.toLowerCase().includes(q)
          || e.url.toLowerCase().includes(q);
      })
    : vaultEntries;
</script>

<div class="flex flex-col h-full">
  {#if !vaultSetup}
    <!-- SETUP STATE -->
    <div class="flex-1 flex items-center justify-center p-8">
      <div class="max-w-sm w-full">
        <div class="text-center mb-6">
          <svg class="w-12 h-12 mx-auto text-primary-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Creer le coffre-fort</h3>
          <p class="text-sm text-gray-500 mt-1">Choisissez un mot de passe maitre pour proteger vos identifiants.</p>
        </div>

        <div class="space-y-3">
          <input
            type="password"
            bind:value={masterPassword}
            placeholder="Mot de passe maitre"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="password"
            bind:value={masterConfirm}
            placeholder="Confirmer le mot de passe"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            on:keydown={(e) => e.key === 'Enter' && handleSetup()}
          />
          {#if masterError}
            <p class="text-xs text-red-500">{masterError}</p>
          {/if}
          <button
            on:click={handleSetup}
            class="w-full py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
          >
            Creer le coffre-fort
          </button>
        </div>
      </div>
    </div>

  {:else if !vaultUnlocked}
    <!-- LOCKED STATE -->
    <div class="flex-1 flex items-center justify-center p-8">
      <div class="max-w-sm w-full">
        <div class="text-center mb-6">
          <svg class="w-12 h-12 mx-auto text-amber-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Coffre-fort verrouille</h3>
          <p class="text-sm text-gray-500 mt-1">Saisissez votre mot de passe maitre pour acceder a vos identifiants.</p>
        </div>

        <div class="space-y-3">
          <input
            type="password"
            bind:value={masterPassword}
            placeholder="Mot de passe maitre"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
              text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            on:keydown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          {#if masterError}
            <p class="text-xs text-red-500">{masterError}</p>
          {/if}
          <button
            on:click={handleUnlock}
            class="w-full py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
          >
            Deverrouiller
          </button>
        </div>
      </div>
    </div>

  {:else}
    <!-- UNLOCKED STATE -->
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-3">
        <h3 class="font-semibold text-gray-900 dark:text-white">Coffre-fort</h3>
        <span class="text-xs text-gray-400">{vaultEntries.length} entree{vaultEntries.length !== 1 ? 's' : ''}</span>
        {#if clipCountdown > 0}
          <span class="text-xs text-amber-500 animate-pulse">Presse-papier efface dans {clipCountdown}s</span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <button
          on:click={openNewForm}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Ajouter
        </button>
        <button
          on:click={handleLock}
          class="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          title="Verrouiller"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Add/Edit form -->
    {#if showForm}
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 space-y-2.5">
        <div class="flex gap-2">
          <input bind:value={formLabel} placeholder="Label *" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          <input bind:value={formUsername} placeholder="Utilisateur" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>

        <div class="flex gap-2">
          <div class="flex-1 relative">
            {#if showPassword}
              <input type="text" bind:value={formPassword} placeholder="Mot de passe *" class="w-full px-3 py-2 pr-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            {:else}
              <input type="password" bind:value={formPassword} placeholder="Mot de passe *" class="w-full px-3 py-2 pr-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            {/if}
            <div class="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
              <button on:click={() => showPassword = !showPassword} class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Voir/masquer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {#if showPassword}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  {:else}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  {/if}
                </svg>
              </button>
              <button on:click={() => showGenerator = !showGenerator} class="p-1 rounded text-gray-400 hover:text-primary-500" title="Generateur">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Generator panel -->
        {#if showGenerator}
          <div class="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-500 w-16">Longueur</label>
              <input type="range" bind:value={genOptions.length} min="8" max="64" class="flex-1" />
              <span class="text-xs text-gray-600 dark:text-gray-400 w-6 text-right">{genOptions.length}</span>
            </div>
            <div class="flex flex-wrap gap-3 text-xs">
              <label class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <input type="checkbox" bind:checked={genOptions.uppercase} /> ABC
              </label>
              <label class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <input type="checkbox" bind:checked={genOptions.lowercase} /> abc
              </label>
              <label class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <input type="checkbox" bind:checked={genOptions.numbers} /> 123
              </label>
              <label class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <input type="checkbox" bind:checked={genOptions.symbols} /> !@#
              </label>
            </div>
            <div class="flex gap-2">
              <button on:click={regenerate} class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                Regenerer
              </button>
              <button on:click={useGenerated} class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                Utiliser
              </button>
            </div>
            {#if formPassword}
              <p class="font-mono text-xs text-gray-600 dark:text-gray-400 break-all bg-gray-50 dark:bg-gray-900 p-2 rounded">{formPassword}</p>
            {/if}
          </div>
        {/if}

        <!-- TOTP secret -->
        <input bind:value={formTotpSecret} placeholder="Secret TOTP (base32, optionnel)" class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500" />

        <div class="flex gap-2">
          <input bind:value={formUrl} placeholder="URL (optionnel)" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>

        <textarea bind:value={formNotes} placeholder="Notes (optionnel)" rows="2" class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"></textarea>

        <div class="flex gap-2 justify-end">
          <button on:click={cancelForm} class="px-4 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Annuler
          </button>
          <button
            on:click={saveEntry}
            disabled={!formLabel.trim() || !formPassword.trim()}
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              {formLabel.trim() && formPassword.trim()
                ? 'bg-primary-500 hover:bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}"
          >
            {editingId ? 'Modifier' : 'Enregistrer'}
          </button>
        </div>
      </div>
    {/if}

    <!-- Search -->
    {#if vaultEntries.length > 3}
      <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50">
        <input
          bind:value={searchQuery}
          placeholder="Rechercher..."
          class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
            text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
    {/if}

    <!-- Entry list -->
    <div class="flex-1 overflow-y-auto min-h-0">
      {#if filteredEntries.length === 0}
        <div class="flex items-center justify-center h-full">
          <p class="text-sm text-gray-400">{searchQuery ? 'Aucun resultat' : 'Aucune entree - cliquez Ajouter'}</p>
        </div>
      {:else}
        <div class="divide-y divide-gray-100 dark:divide-gray-700/50">
          {#each filteredEntries as entry (entry.id)}
            <div class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 group">
              <div class="flex items-start gap-3">
                <!-- Label + URL -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.label}</span>
                    {#if entry.url}
                      <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener" class="text-xs text-primary-500 hover:text-primary-600 truncate max-w-48">
                        {entry.url}
                      </a>
                    {/if}
                  </div>

                  <!-- Username -->
                  {#if entry.username}
                    <div class="flex items-center gap-1 mt-0.5">
                      <span class="text-xs text-gray-500 truncate">{entry.username}</span>
                      <button
                        on:click={() => copyUser(entry.username, entry.id)}
                        class="p-0.5 rounded text-gray-300 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Copier l'utilisateur"
                      >
                        {#if copiedUsername === entry.id}
                          <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                        {:else}
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        {/if}
                      </button>
                    </div>
                  {/if}

                  <!-- Password -->
                  <div class="flex items-center gap-1 mt-1">
                    <span class="text-xs font-mono text-gray-600 dark:text-gray-400">
                      {visiblePasswords.has(entry.id) ? entry.password : '••••••••••••'}
                    </span>
                    <button
                      on:click={() => toggleVisible(entry.id)}
                      class="p-0.5 rounded text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Voir/masquer"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {#if visiblePasswords.has(entry.id)}
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        {:else}
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        {/if}
                      </svg>
                    </button>
                    <button
                      on:click={() => copyPwd(entry.password)}
                      class="p-0.5 rounded text-gray-300 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Copier le mot de passe (efface dans 30s)"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                    </button>
                    <!-- Paste to textarea -->
                    <button
                      on:click={() => pasteToTextarea(entry.password)}
                      class="p-0.5 rounded text-gray-300 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Coller dans le textarea Hub"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                    <!-- Send via SMS -->
                    <button
                      on:click={() => sendViaSms(entry.password)}
                      class="p-0.5 rounded text-gray-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Envoyer par SMS"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>

                  <!-- TOTP code -->
                  {#if totpCodes[entry.id]}
                    <div class="flex items-center gap-2 mt-1.5">
                      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                        <span class="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-300 tracking-widest">
                          {totpCodes[entry.id].slice(0, 3)} {totpCodes[entry.id].slice(3)}
                        </span>
                        <svg class="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" stroke-width="2" stroke-dasharray="{(totpRemaining / 30) * 62.83}" stroke-dashoffset="0" transform="rotate(-90 12 12)" class="transition-all duration-1000" />
                        </svg>
                        <span class="text-[10px] text-indigo-400">{totpRemaining}s</span>
                      </div>
                      <button
                        on:click={() => copyTotpCode(totpCodes[entry.id], entry.id)}
                        class="p-0.5 rounded text-gray-300 hover:text-indigo-500 transition-colors"
                        title="Copier le code TOTP"
                      >
                        {#if copiedTotp === entry.id}
                          <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                        {:else}
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        {/if}
                      </button>
                    </div>
                  {/if}

                  {#if entry.notes}
                    <p class="text-[10px] text-gray-400 mt-1 truncate">{entry.notes}</p>
                  {/if}
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    on:click={() => openEditForm(entry)}
                    class="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    title="Modifier"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    on:click={() => deleteEntry(entry.id)}
                    class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Supprimer"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
