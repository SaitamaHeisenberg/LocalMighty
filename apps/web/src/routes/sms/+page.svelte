<script lang="ts">
  import ConversationList from '$lib/components/sms/ConversationList.svelte';
  import ModernChatView from '$lib/components/sms/ModernChatView.svelte';
  import { chatLayoutStore, modernThemeStore } from '$lib/stores/chatLayout';
</script>

<!-- Layout Switcher -->
<div class="absolute top-20 right-4 z-50 flex items-center gap-2">
  {#if $chatLayoutStore === 'modern'}
    <button
      on:click={() => modernThemeStore.toggle()}
      class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg
             bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300
             hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
      title="Changer le style"
    >
      {#if $modernThemeStore === 'light'}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Light
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        Blue
      {/if}
    </button>
  {/if}

  <button
    on:click={() => chatLayoutStore.toggle()}
    class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg
           bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
    title="Changer de presentation"
  >
    {#if $chatLayoutStore === 'classic'}
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
      Vue Moderne
    {:else}
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      Vue Classique
    {/if}
  </button>
</div>

<!-- Content based on layout -->
{#if $chatLayoutStore === 'classic'}
  <ConversationList />
{:else}
  <ModernChatView />
{/if}
