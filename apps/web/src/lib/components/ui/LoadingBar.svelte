<script lang="ts">
  import { loadingStore } from '$lib/stores/loading';
  import { fade } from 'svelte/transition';
</script>

{#if $loadingStore.active}
  <div
    class="fixed top-0 left-0 right-0 z-[90] h-1 bg-gray-200 dark:bg-gray-800 overflow-hidden"
    transition:fade={{ duration: 150 }}
  >
    <div
      class="h-full bg-primary-500 animate-loading-bar"
      style="width: {$loadingStore.progress}%"
    ></div>
  </div>
{/if}

<style>
  @keyframes loading {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
  }

  .animate-loading-bar {
    animation: loading 1.5s ease-in-out infinite;
  }
</style>
