<script lang="ts">
  import TextSync from '$lib/components/hub/TextSync.svelte';
</script>

<div class="h-full flex flex-col">
  <!-- Page header -->
  <div class="px-6 pt-6 pb-2">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Hub Partage</h1>
    <p class="text-sm text-gray-500 mt-1">Partagez du texte en temps reel entre tous vos appareils sur le reseau local.</p>
  </div>

  <!-- Clipboard section -->
  <div class="flex-1 px-6 pb-6 min-h-0">
    <div class="card h-full flex flex-col overflow-hidden">
      <TextSync />
    </div>
  </div>
</div>
