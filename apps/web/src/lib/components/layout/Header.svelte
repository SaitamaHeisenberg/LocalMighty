<script lang="ts">
  import { goto } from '$app/navigation';
  import { phoneStatusStore } from '$lib/stores/status';
  import { browser } from '$app/environment';

  let searchQuery = '';
  let searchInput: HTMLInputElement;

  function handleSearch(e: Event) {
    e.preventDefault();
    if (searchQuery.trim()) {
      goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+K or Cmd+K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
    // Escape to blur search
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput?.blur();
      searchQuery = '';
    }
  }

  if (browser) {
    document.addEventListener('keydown', handleKeydown);
  }
</script>

<header class="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4">
  <!-- Logo + Title (clickable) -->
  <a href="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity flex-shrink-0">
    <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
    <h1 class="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">LocalMighty</h1>
  </a>

  <!-- Global Search -->
  <form on:submit={handleSearch} class="flex-1 max-w-md">
    <div class="relative group">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:this={searchInput}
        bind:value={searchQuery}
        placeholder="Rechercher SMS, contacts..."
        class="w-full pl-9 pr-16 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
               bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2
               focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-700
               dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
      />
      <div class="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-400">
        <kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">
          Ctrl+K
        </kbd>
      </div>
    </div>
  </form>

  <!-- Quick Actions (right side) -->
  <div class="flex items-center gap-1 flex-shrink-0">
    <a
      href="/sms/new"
      class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
             bg-primary-500 text-white hover:bg-primary-600 transition-colors"
      title="Nouveau SMS"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span class="hidden sm:inline">SMS</span>
    </a>
    <a
      href="/calls"
      class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
             bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
             hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title="Appels"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      <span class="hidden sm:inline">Appels</span>
    </a>
    <a
      href="/contacts"
      class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
             bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
             hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title="Contacts"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span class="hidden sm:inline">Contacts</span>
    </a>
  </div>

  <!-- Phone Status -->
  <div class="flex items-center gap-2 flex-shrink-0">
    {#if $phoneStatusStore.connected}
      <div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span class="hidden lg:inline">{$phoneStatusStore.deviceName || 'Connecte'}</span>
      </div>
    {:else}
      <div class="flex items-center gap-2 text-sm text-gray-500">
        <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
        <span class="hidden lg:inline">Deconnecte</span>
      </div>
    {/if}
  </div>
</header>
