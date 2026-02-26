<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { hubStore, type HubSyncStatus, type HubTextHistoryEntry } from '$lib/stores/hub';

  let textContent = '';
  let copied = false;
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;
  let showHistory = false;
  let historyEntries: HubTextHistoryEntry[] = [];
  let copiedHistoryId: string | null = null;
  let historyCopyTimeout: ReturnType<typeof setTimeout> | null = null;

  const MAX_SIZE = 10240; // 10 Ko

  // Subscribe to store
  const unsubText = hubStore.text.subscribe((val) => {
    textContent = val;
  });

  let syncStatus: HubSyncStatus = 'disconnected';
  const unsubSync = hubStore.syncStatus.subscribe((val) => {
    syncStatus = val;
  });

  const unsubHistory = hubStore.textHistory.subscribe((val) => {
    historyEntries = val;
  });

  onMount(() => {
    hubStore.connect();
  });

  onDestroy(() => {
    hubStore.disconnect();
    unsubText();
    unsubSync();
    unsubHistory();
    if (copyTimeout) clearTimeout(copyTimeout);
    if (historyCopyTimeout) clearTimeout(historyCopyTimeout);
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    hubStore.updateText(target.value);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(textContent);
      copied = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => { copied = false; }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textContent;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copied = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => { copied = false; }, 2000);
    }
  }

  function clearText() {
    hubStore.updateText('');
  }

  async function toggleHistory() {
    showHistory = !showHistory;
    if (showHistory) {
      await hubStore.loadTextHistory();
    }
  }

  function restoreEntry(entry: HubTextHistoryEntry) {
    hubStore.restoreFromHistory(entry);
    showHistory = false;
  }

  async function copyEntry(entry: HubTextHistoryEntry) {
    try {
      await navigator.clipboard.writeText(entry.content);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = entry.content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copiedHistoryId = entry.id;
    if (historyCopyTimeout) clearTimeout(historyCopyTimeout);
    historyCopyTimeout = setTimeout(() => { copiedHistoryId = null; }, 2000);
  }

  async function clearHistory() {
    await hubStore.clearHistory();
  }

  function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'A l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  }

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max) + '...';
  }

  $: byteSize = new Blob([textContent]).size;
  $: sizeLabel = byteSize < 1024
    ? `${byteSize} o`
    : `${(byteSize / 1024).toFixed(1)} Ko`;
  $: isOverLimit = byteSize > MAX_SIZE;
</script>

<div class="flex flex-col h-full">
  <!-- Header bar -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center gap-3">
      <h3 class="font-semibold text-gray-900 dark:text-white">Clipboard partage</h3>
      <!-- Sync indicator -->
      <div class="flex items-center gap-1.5">
        {#if syncStatus === 'synced'}
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          <span class="text-xs text-green-600 dark:text-green-400">Synchronise</span>
        {:else if syncStatus === 'syncing'}
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span class="text-xs text-amber-600 dark:text-amber-400">Sync...</span>
        {:else if syncStatus === 'connected'}
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span class="text-xs text-blue-600 dark:text-blue-400">Connecte</span>
        {:else}
          <span class="w-2 h-2 rounded-full bg-gray-400"></span>
          <span class="text-xs text-gray-500">Deconnecte</span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      <!-- Size indicator -->
      <span class="text-xs {isOverLimit ? 'text-red-500 font-bold' : 'text-gray-400'}">
        {sizeLabel} / 10 Ko
      </span>

      <!-- History button -->
      <button
        on:click={toggleHistory}
        class="p-1.5 rounded-lg transition-colors
          {showHistory
            ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}"
        title="Historique"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <!-- Clear button -->
      {#if textContent.length > 0}
        <button
          on:click={clearText}
          class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Effacer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      {/if}

      <!-- Copy button -->
      <button
        on:click={copyToClipboard}
        disabled={textContent.length === 0}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          {copied
            ? 'bg-green-500 text-white'
            : textContent.length === 0
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 hover:bg-primary-600 text-white'}"
      >
        {#if copied}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Copie !
        {:else}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copier
        {/if}
      </button>
    </div>
  </div>

  <!-- History panel (collapsible) -->
  {#if showHistory}
    <div class="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 max-h-48 overflow-y-auto">
      {#if historyEntries.length === 0}
        <div class="px-4 py-6 text-center text-sm text-gray-400">Aucun historique</div>
      {:else}
        <div class="divide-y divide-gray-100 dark:divide-gray-700/50">
          {#each historyEntries as entry (entry.id)}
            <div class="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/30 group">
              <!-- Content preview -->
              <div class="flex-1 min-w-0">
                <p class="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{truncate(entry.content, 80)}</p>
                <span class="text-[10px] text-gray-400">{timeAgo(entry.createdAt)}</span>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <!-- Copy -->
                <button
                  on:click={() => copyEntry(entry)}
                  class="p-1 rounded transition-colors
                    {copiedHistoryId === entry.id
                      ? 'text-green-500'
                      : 'text-gray-400 hover:text-primary-500'}"
                  title="Copier"
                >
                  {#if copiedHistoryId === entry.id}
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  {:else}
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  {/if}
                </button>

                <!-- Restore -->
                <button
                  on:click={() => restoreEntry(entry)}
                  class="p-1 rounded text-gray-400 hover:text-amber-500 transition-colors"
                  title="Restaurer dans le clipboard"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>

        <!-- Clear history -->
        <div class="px-4 py-2 border-t border-gray-100 dark:border-gray-700/50">
          <button
            on:click={clearHistory}
            class="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Vider l'historique
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Textarea -->
  <div class="flex-1 p-4">
    <textarea
      value={textContent}
      on:input={handleInput}
      placeholder="Collez vos commandes, textes, URLs ici...&#10;&#10;Le contenu est synchronise en temps reel sur tous les navigateurs du reseau."
      class="w-full h-full resize-none rounded-lg border border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100
        font-mono text-sm leading-relaxed p-4
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
        placeholder:text-gray-400 dark:placeholder:text-gray-500"
      spellcheck="false"
    ></textarea>
  </div>
</div>
