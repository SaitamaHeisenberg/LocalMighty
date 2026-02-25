<script lang="ts">
  import ConversationList from '$lib/components/sms/ConversationList.svelte';
  import ModernChatView from '$lib/components/sms/ModernChatView.svelte';
  import { chatLayoutStore } from '$lib/stores/chatLayout';
</script>

<!-- Content based on layout -->
{#if $chatLayoutStore === 'classic'}
  <!-- Classic view with floating switch button -->
  <div class="relative h-full">
    <ConversationList />

    <!-- Floating button to switch to modern view -->
    <button
      on:click={() => chatLayoutStore.set('modern')}
      class="fixed bottom-20 right-6 z-50 flex items-center gap-2 px-4 py-3 text-sm font-medium
             rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
      title="Passer en vue moderne"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
      <span class="hidden sm:inline">Vue Moderne</span>
    </button>
  </div>
{:else}
  <!-- Modern view (has its own layout switcher in header) -->
  <ModernChatView />
{/if}
