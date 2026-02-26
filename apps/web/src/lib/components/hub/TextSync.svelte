<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { hubStore, type HubSyncStatus } from '$lib/stores/hub';

  let textContent = '';
  let copied = false;
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;

  const MAX_SIZE = 10240; // 10 Ko

  // Subscribe to store
  const unsubText = hubStore.text.subscribe((val) => {
    textContent = val;
  });

  let syncStatus: HubSyncStatus = 'disconnected';
  const unsubSync = hubStore.syncStatus.subscribe((val) => {
    syncStatus = val;
  });

  onMount(() => {
    hubStore.connect();
  });

  onDestroy(() => {
    hubStore.disconnect();
    unsubText();
    unsubSync();
    if (copyTimeout) clearTimeout(copyTimeout);
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
      // Fallback for older browsers
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
