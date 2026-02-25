<script lang="ts">
  import { goto } from '$app/navigation';
  import { phoneStatusStore } from '$lib/stores/status';

  let searchQuery = '';

  function handleSearch(e: Event) {
    e.preventDefault();
    if (searchQuery.trim()) {
      goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }
</script>

<header class="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4">
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
    <h1 class="text-lg font-semibold">LocalMighty</h1>
  </div>

  <!-- Global Search -->
  <form on:submit={handleSearch} class="flex-1 max-w-md mx-4">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Rechercher..."
        class="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
               bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2
               focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white"
      />
    </div>
  </form>

  <div class="flex items-center gap-4">
    {#if $phoneStatusStore.connected}
      <div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span>{$phoneStatusStore.deviceName || 'Telephone connecte'}</span>
      </div>
    {:else}
      <div class="flex items-center gap-2 text-sm text-gray-500">
        <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
        <span>Telephone deconnecte</span>
      </div>
    {/if}
  </div>
</header>
