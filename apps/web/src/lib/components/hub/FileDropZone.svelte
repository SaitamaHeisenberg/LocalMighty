<script lang="ts">
  import { hubStore, type HubFile, type HubFileRetention } from '$lib/stores/hub';

  let dragOver = false;
  let retention: HubFileRetention = '24h';
  let fileInput: HTMLInputElement;

  let files: HubFile[] = [];
  let uploading = false;
  let uploadProgress = 0;
  let copiedId: string | null = null;
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;

  const unsubFiles = hubStore.files.subscribe((val) => { files = val; });
  const unsubUploading = hubStore.uploading.subscribe((val) => { uploading = val; });
  const unsubProgress = hubStore.uploadProgress.subscribe((val) => { uploadProgress = val; });

  import { onDestroy } from 'svelte';
  onDestroy(() => {
    unsubFiles();
    unsubUploading();
    unsubProgress();
    if (copyTimeout) clearTimeout(copyTimeout);
  });

  const MAX_SIZE = 100 * 1024 * 1024; // 100 Mo

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      await uploadFiles(droppedFiles);
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      uploadFiles(input.files);
      input.value = '';
    }
  }

  async function uploadFiles(fileList: FileList) {
    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        alert(`${file.name} depasse la limite de 100 Mo`);
        continue;
      }
      await hubStore.uploadFile(file, retention);
    }
  }

  async function deleteFile(id: string) {
    await hubStore.deleteFile(id);
  }

  async function copyUrl(file: HubFile) {
    try {
      await navigator.clipboard.writeText(file.url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = file.url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copiedId = file.id;
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => { copiedId = null; }, 2000);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function formatExpiry(file: HubFile): string {
    if (!file.expiresAt) return 'Illimite';
    const remaining = file.expiresAt - Date.now();
    if (remaining <= 0) return 'Expire';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}j ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return '📦';
    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript')) return '📝';
    return '📎';
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <div class="flex items-center gap-3">
      <h3 class="font-semibold text-gray-900 dark:text-white">Fichiers partages</h3>
      <span class="text-xs text-gray-400">{files.length} fichier{files.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-500 dark:text-gray-400">Retention :</label>
      <select
        bind:value={retention}
        class="text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
          text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="1h">1 heure</option>
        <option value="24h">24 heures</option>
        <option value="7d">7 jours</option>
        <option value="unlimited">Illimite</option>
      </select>
    </div>
  </div>

  <!-- Drop zone + file list -->
  <div class="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
    <!-- Drop zone -->
    <button
      type="button"
      class="relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
        {dragOver
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
      on:click={() => fileInput.click()}
    >
      <input
        type="file"
        multiple
        bind:this={fileInput}
        on:change={handleFileSelect}
        class="hidden"
      />

      {#if uploading}
        <div class="flex flex-col items-center gap-2">
          <svg class="w-8 h-8 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm font-medium text-primary-600 dark:text-primary-400">{uploadProgress}%</span>
          <div class="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-primary-500 rounded-full transition-all" style="width: {uploadProgress}%"></div>
          </div>
        </div>
      {:else}
        <div class="flex flex-col items-center gap-1">
          <svg class="w-8 h-8 {dragOver ? 'text-primary-500' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span class="text-sm font-medium {dragOver ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}">
            {dragOver ? 'Deposez ici' : 'Glissez des fichiers ou cliquez'}
          </span>
          <span class="text-xs text-gray-400">Max 100 Mo par fichier</span>
        </div>
      {/if}
    </button>

    <!-- File list -->
    {#if files.length > 0}
      <div class="flex-1 overflow-y-auto space-y-2 min-h-0">
        {#each files as file (file.id)}
          <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 group">
            <!-- Icon -->
            <span class="text-lg flex-shrink-0">{getFileIcon(file.mimeType)}</span>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <a
                href={file.url}
                target="_blank"
                rel="noopener"
                class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-500 truncate block"
                title={file.originalName}
              >
                {file.originalName}
              </a>
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span>{formatSize(file.size)}</span>
                <span>·</span>
                <span title="Expiration">Expire dans {formatExpiry(file)}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <!-- Copy URL -->
              <button
                on:click={() => copyUrl(file)}
                class="p-1.5 rounded-lg transition-colors
                  {copiedId === file.id
                    ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}"
                title="Copier l'URL"
              >
                {#if copiedId === file.id}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                {:else}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                {/if}
              </button>

              <!-- Delete -->
              <button
                on:click={() => deleteFile(file.id)}
                class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Supprimer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else if !uploading}
      <div class="flex-1 flex items-center justify-center">
        <p class="text-sm text-gray-400">Aucun fichier partage</p>
      </div>
    {/if}
  </div>
</div>
