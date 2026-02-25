<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { formatRelativeTime, formatPhoneNumber, truncate } from '$lib/utils/formatters';

  interface SearchResult {
    id: string;
    threadId: string;
    address: string;
    contactName?: string;
    body: string;
    date: number;
    type: string;
  }

  let query = '';
  let results: SearchResult[] = [];
  let loading = false;
  let searched = false;

  onMount(() => {
    const q = $page.url.searchParams.get('q');
    if (q) {
      query = q;
      search();
    }
  });

  async function search() {
    if (!query.trim()) return;

    loading = true;
    searched = true;

    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}&limit=100`);
      if (res.ok) {
        results = await res.json();
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      loading = false;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    search();
  }

  function highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
  }
</script>

<div class="flex flex-col h-full">
  <div class="p-4 border-b border-gray-200 dark:border-gray-800">
    <h2 class="text-lg font-semibold mb-3">Recherche</h2>

    <form on:submit={handleSubmit} class="flex gap-2">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          bind:value={query}
          placeholder="Rechercher dans tous les SMS..."
          class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
                 focus:ring-primary-500 dark:text-white"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600
               disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {#if loading}
          <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        {:else}
          Rechercher
        {/if}
      </button>
    </form>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center h-32">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    {:else if searched && results.length === 0}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>Aucun resultat pour "{query}"</p>
      </div>
    {:else if !searched}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p>Entrez un terme de recherche</p>
      </div>
    {:else}
      <div class="p-2">
        <p class="text-sm text-gray-500 mb-2 px-2">{results.length} resultat{results.length > 1 ? 's' : ''}</p>

        {#each results as result (result.id)}
          <a
            href="/sms/{result.threadId}"
            class="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <span class="text-primary-600 dark:text-primary-400 font-medium">
                  {(result.contactName || result.address).charAt(0).toUpperCase()}
                </span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center mb-1">
                  <p class="font-medium text-gray-900 dark:text-white">
                    {result.contactName || formatPhoneNumber(result.address)}
                  </p>
                  <span class="text-xs text-gray-400">
                    {formatRelativeTime(result.date)}
                  </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {@html highlightMatch(truncate(result.body, 100), query)}
                </p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
