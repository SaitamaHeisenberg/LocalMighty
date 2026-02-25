<script lang="ts">
  import ConversationList from '$lib/components/sms/ConversationList.svelte';
  import ModernChatView from '$lib/components/sms/ModernChatView.svelte';
  import { chatLayoutStore, modernThemeStore } from '$lib/stores/chatLayout';
</script>

<!-- Layout Switcher - Fixed top right -->
<div class="fixed top-20 right-6 z-50 flex flex-col gap-2">
  <!-- Main layout toggle -->
  <button
    on:click={() => chatLayoutStore.toggle()}
    class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-lg
           {$chatLayoutStore === 'modern'
             ? 'bg-gray-700 text-white hover:bg-gray-600'
             : 'bg-blue-600 text-white hover:bg-blue-700'}
           transition-all"
  >
    {#if $chatLayoutStore === 'classic'}
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
      Vue Moderne
    {:else}
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      Vue Classique
    {/if}
  </button>

  <!-- Modern view theme toggle (only visible in modern mode) -->
  {#if $chatLayoutStore === 'modern'}
    <button
      on:click={() => modernThemeStore.toggle()}
      class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-md
             {$modernThemeStore === 'dark-blue'
               ? 'bg-blue-500 text-white hover:bg-blue-400'
               : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}
             transition-all"
    >
      {#if $modernThemeStore === 'light'}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        Theme Bleu
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Theme Clair
      {/if}
    </button>
  {/if}
</div>

<!-- Content based on layout -->
{#if $chatLayoutStore === 'classic'}
  <ConversationList />
{:else}
  <ModernChatView />
{/if}
