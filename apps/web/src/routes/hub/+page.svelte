<script lang="ts">
  import TextSync from '$lib/components/hub/TextSync.svelte';
  import FileDropZone from '$lib/components/hub/FileDropZone.svelte';
</script>

<div class="h-full flex flex-col">
  <!-- Page header -->
  <div class="px-6 pt-6 pb-2">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Hub Partage</h1>
    <p class="text-sm text-gray-500 mt-1">Partagez texte et fichiers en temps reel entre tous vos appareils du reseau.</p>
  </div>

  <!-- Two-section layout -->
  <div class="flex-1 px-6 pb-6 min-h-0 flex flex-col gap-4">
    <!-- Clipboard section (~40%) -->
    <div class="card flex flex-col overflow-hidden" style="flex: 2 1 0%">
      <TextSync />
    </div>

    <!-- File drop section (~60%) -->
    <div class="card flex flex-col overflow-hidden" style="flex: 3 1 0%">
      <FileDropZone />
    </div>
  </div>
</div>
