<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { threadsStore } from '$lib/stores/messages';
  import { formatPhoneNumber } from '$lib/utils/formatters';
  import { socketStore } from '$lib/stores/socket';
  import { toast } from '$lib/stores/toast';
  import ConversationDetail from '$lib/components/sms/ConversationDetail.svelte';

  $: threadId = $page.params.threadId;
  $: thread = $threadsStore.find((t) => t.threadId === threadId);
  $: address = thread?.address || '';
  $: displayName = thread?.contactName || formatPhoneNumber(address);

  function callNumber() {
    if (!address) return;
    const socket = socketStore.getSocket();
    if (socket) {
      socket.emit('dial_number', { number: address });
      toast('Appel en cours...', 'success');
    } else {
      toast('Non connecte au telephone', 'error');
    }
  }

  function copyNumber() {
    if (!address) return;

    // Try modern clipboard API first, fallback to execCommand
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(address).then(() => {
        toast('Numero copie', 'success');
      }).catch(() => {
        fallbackCopy(address);
      });
    } else {
      fallbackCopy(address);
    }
  }

  function fallbackCopy(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      toast('Numero copie', 'success');
    } catch {
      toast('Erreur lors de la copie', 'error');
    }
    document.body.removeChild(textarea);
  }

  let showDeleteConfirm = false;
  let deleting = false;

  async function deleteConversation() {
    console.log('[DELETE] Starting delete for threadId:', threadId);
    if (!threadId || deleting) {
      console.log('[DELETE] Blocked - threadId:', threadId, 'deleting:', deleting);
      return;
    }

    deleting = true;
    console.log('[DELETE] Set deleting = true');
    try {
      console.log('[DELETE] Calling threadsStore.deleteThread...');
      const success = await threadsStore.deleteThread(threadId);
      console.log('[DELETE] Result:', success);
      if (success) {
        console.log('[DELETE] Success - showing toast and redirecting');
        toast('Conversation supprimee', 'success');
        goto('/sms');
      } else {
        console.log('[DELETE] Failed - showing error toast');
        toast('Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('[DELETE] Exception:', error);
      toast('Erreur lors de la suppression', 'error');
    } finally {
      console.log('[DELETE] Finally block - resetting state');
      deleting = false;
      showDeleteConfirm = false;
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
    <a href="/sms" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </a>

    <div class="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
      <span class="text-primary-600 dark:text-primary-400 font-medium">
        {displayName.charAt(0).toUpperCase()}
      </span>
    </div>

    <div class="flex-1">
      <h2 class="font-semibold">{displayName}</h2>
      {#if thread?.contactName}
        <p class="text-xs text-gray-500">{formatPhoneNumber(address)}</p>
      {/if}
    </div>

    <!-- Copy Number Button -->
    <button
      on:click={copyNumber}
      class="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      title="Copier le numero"
    >
      <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>

    <!-- Call Button -->
    <button
      on:click={callNumber}
      class="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
      title="Appeler {displayName}"
    >
      <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    </button>

    <!-- Delete Button -->
    <button
      on:click={() => showDeleteConfirm = true}
      class="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      title="Supprimer la conversation"
    >
      <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-hidden">
    <ConversationDetail {threadId} {address} />
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={() => showDeleteConfirm = false}>
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl" on:click|stopPropagation>
      <h3 class="text-lg font-semibold mb-2">Supprimer la conversation ?</h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        Cette action supprimera tous les messages de cette conversation. Cette action est irreversible.
      </p>
      <div class="flex gap-3 justify-end">
        <button
          on:click={() => showDeleteConfirm = false}
          disabled={deleting}
          class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          on:click={deleteConversation}
          disabled={deleting}
          class="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {#if deleting}
            <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            Suppression...
          {:else}
            Supprimer
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
