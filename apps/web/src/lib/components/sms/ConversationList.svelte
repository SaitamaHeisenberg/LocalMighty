<script lang="ts">
  import { threadsStore, searchStore, type SmsThread, type SearchResult } from '$lib/stores/messages';
  import { formatRelativeTime, formatPhoneNumber, truncate } from '$lib/utils/formatters';
  import { onMount } from 'svelte';

  let loading = true;
  let searchQuery = '';
  let searching = false;
  let showResults = false;

  onMount(async () => {
    await threadsStore.load();
    loading = false;
  });

  async function handleSearch() {
    if (searchQuery.length < 2) {
      searchStore.clear();
      showResults = false;
      return;
    }
    searching = true;
    showResults = true;
    await searchStore.search(searchQuery);
    searching = false;
  }

  function clearSearch() {
    searchQuery = '';
    searchStore.clear();
    showResults = false;
  }

  function highlightMatch(text: string, query: string): string {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>');
  }
</script>

<div class="flex flex-col h-full">
  <div class="p-4 border-b border-gray-200 dark:border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-semibold">Messages</h2>
      <a
        href="/sms/new"
        class="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nouveau
      </a>
    </div>

    <!-- Search Bar -->
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {#if searching}
          <div class="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
        {:else}
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        {/if}
      </div>
      <input
        type="text"
        bind:value={searchQuery}
        on:input={handleSearch}
        placeholder="Rechercher dans les messages..."
        class="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
      />
      {#if searchQuery}
        <button
          on:click={clearSearch}
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Search Results -->
  {#if showResults && searchQuery.length >= 2}
    <div class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
      <div class="p-2 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200 dark:border-gray-800">
        Resultats pour "{searchQuery}" ({$searchStore.length})
      </div>
      {#if $searchStore.length === 0 && !searching}
        <div class="flex flex-col items-center justify-center h-32 text-gray-500">
          <svg class="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm">Aucun resultat</p>
        </div>
      {:else}
        {#each $searchStore as result (result.id)}
          <a
            href="/sms/{result.threadId}?highlight={result.id}"
            class="block p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <span class="text-primary-600 dark:text-primary-400 text-sm font-medium">
                  {(result.contactName || result.address).charAt(0).toUpperCase()}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {result.contactName || formatPhoneNumber(result.address)}
                  </p>
                  <span class="text-xs text-gray-400">
                    {formatRelativeTime(result.date)}
                  </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {@html highlightMatch(truncate(result.body, 100), searchQuery)}
                </p>
              </div>
            </div>
          </a>
        {/each}
      {/if}
    </div>
  {:else}

  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center h-32">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    {:else if $threadsStore.length === 0}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p>Aucun message</p>
        <p class="text-sm">Connectez votre telephone pour synchroniser</p>
      </div>
    {:else}
      {#each $threadsStore as thread (thread.threadId)}
        <a
          href="/sms/{thread.threadId}"
          class="block p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span class="text-primary-600 dark:text-primary-400 font-medium">
                {(thread.contactName || thread.address).charAt(0).toUpperCase()}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {thread.contactName || formatPhoneNumber(thread.address)}
                </p>
                <span class="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatRelativeTime(thread.lastDate)}
                </span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {truncate(thread.lastMessage, 50)}
              </p>
            </div>

            {#if thread.unreadCount > 0}
              <span class="flex-shrink-0 px-2 py-0.5 bg-primary-500 text-white text-xs font-medium rounded-full">
                {thread.unreadCount}
              </span>
            {/if}
          </div>
        </a>
      {/each}
    {/if}
  </div>
  {/if}
</div>
