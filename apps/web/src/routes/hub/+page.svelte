<script lang="ts">
  import TextSync from '$lib/components/hub/TextSync.svelte';
  import FileDropZone from '$lib/components/hub/FileDropZone.svelte';
  import PasswordVault from '$lib/components/hub/PasswordVault.svelte';

  let activeTab: 'partage' | 'vault' = 'partage';
</script>

<div class="h-full flex flex-col">
  <!-- Page header + tabs -->
  <div class="px-6 pt-6 pb-0">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Hub Partage</h1>
    <p class="text-sm text-gray-500 mt-1">Partagez texte, fichiers et identifiants entre tous vos appareils du reseau.</p>

    <!-- Tabs -->
    <div class="flex gap-1 mt-4 border-b border-gray-200 dark:border-gray-700">
      <button
        on:click={() => activeTab = 'partage'}
        class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px
          {activeTab === 'partage'
            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-white dark:bg-gray-900'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Partage
      </button>
      <button
        on:click={() => activeTab = 'vault'}
        class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px
          {activeTab === 'vault'
            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-white dark:bg-gray-900'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Coffre-fort
      </button>
    </div>
  </div>

  <!-- Tab content -->
  {#if activeTab === 'partage'}
    <div class="flex-1 px-6 pb-6 pt-4 min-h-0 flex flex-col gap-4">
      <!-- Clipboard section (~40%) -->
      <div class="card flex flex-col overflow-hidden" style="flex: 2 1 0%">
        <TextSync />
      </div>

      <!-- File drop section (~60%) -->
      <div class="card flex flex-col overflow-hidden" style="flex: 3 1 0%">
        <FileDropZone />
      </div>
    </div>
  {:else}
    <div class="flex-1 px-6 pb-6 pt-4 min-h-0">
      <div class="card flex flex-col overflow-hidden h-full">
        <PasswordVault />
      </div>
    </div>
  {/if}
</div>
