<script lang="ts">
  import { threadsStore, messagesStore, type SmsThread, type SmsMessage } from '$lib/stores/messages';
  import { chatLayoutStore, modernThemeStore, compactModeStore } from '$lib/stores/chatLayout';
  import { smsStatusStore, type SmsDeliveryStatus } from '$lib/stores/smsStatus';
  import { formatRelativeTime, formatPhoneNumber, formatTime, truncate } from '$lib/utils/formatters';
  import { socketStore } from '$lib/stores/socket';
  import { toast } from '$lib/stores/toast';
  import { onMount } from 'svelte';
  import { notificationSound } from '$lib/services/notificationSound';
  import TemplateSelector from './TemplateSelector.svelte';
  import { exportService, type ExportFormat } from '$lib/services/exportService';

  // Get status for a message
  function getStatus(messageId: string): SmsDeliveryStatus | undefined {
    let status: SmsDeliveryStatus | undefined;
    smsStatusStore.subscribe((map) => {
      const entry = map.get(messageId);
      if (entry) status = entry.status;
    })();
    return status;
  }

  let loading = true;
  let selectedThread: SmsThread | null = null;
  let messagesContainer: HTMLDivElement;
  let replyMessage = '';
  let soundEnabled = notificationSound.isEnabled();

  function toggleSound() {
    soundEnabled = !soundEnabled;
    notificationSound.setEnabled(soundEnabled);
    // Play a test sound when enabling
    if (soundEnabled) {
      notificationSound.play();
    }
  }

  onMount(async () => {
    await threadsStore.load();
    loading = false;
    // Auto-select first thread
    if ($threadsStore.length > 0) {
      selectThread($threadsStore[0]);
    }
  });

  async function selectThread(thread: SmsThread) {
    selectedThread = thread;
    await messagesStore.loadThreadMessages(thread.threadId);
    setTimeout(scrollToBottom, 100);
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function getAvatarColor(name: string): string {
    const colors = [
      '#e67e22', '#3498db', '#2ecc71', '#9b59b6', '#e74c3c',
      '#1abc9c', '#f39c12', '#34495e', '#16a085', '#d35400'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  function isSent(msg: SmsMessage): boolean {
    return msg.type === 'sent' || msg.type === 'outbox';
  }

  function sendReply() {
    if (!replyMessage.trim() || !selectedThread) return;

    const socket = socketStore.getSocket();

    if (socket) {
      socket.emit('send_sms', {
        address: selectedThread.address,
        body: replyMessage.trim(),
      });
      toast('SMS envoye', 'success');
      replyMessage = '';
    } else {
      toast('Non connecte au telephone', 'error');
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  }

  function handleTemplateSelect(e: CustomEvent<string>) {
    replyMessage = e.detail;
  }

  function callNumber() {
    if (!selectedThread) return;

    const socket = socketStore.getSocket();
    if (socket) {
      socket.emit('dial_number', { number: selectedThread.address });
      toast('Appel en cours...', 'success');
    } else {
      toast('Non connecte au telephone', 'error');
    }
  }

  function copyNumber() {
    if (!selectedThread) return;
    const text = selectedThread.address;

    // Try modern clipboard API first, fallback to execCommand
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        toast('Numero copie', 'success');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
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
    if (!selectedThread || deleting) return;

    deleting = true;
    try {
      const success = await threadsStore.deleteThread(selectedThread.threadId);
      if (success) {
        toast('Conversation supprimee', 'success');
        selectedThread = null;
      } else {
        toast('Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast('Erreur lors de la suppression', 'error');
    } finally {
      deleting = false;
      showDeleteConfirm = false;
    }
  }

  let showExportMenu = false;

  function exportConversation(format: ExportFormat) {
    if (!selectedThread) return;
    exportService.exportConversation($messagesStore, selectedThread, format);
    showExportMenu = false;
    toast(`Conversation exportee en ${format.toUpperCase()}`, 'success');
  }

  $: displayName = selectedThread?.contactName || (selectedThread ? formatPhoneNumber(selectedThread.address) : '');
</script>

<div class="modern-chat-container h-full flex {$modernThemeStore === 'dark-blue' ? 'theme-dark-blue' : 'theme-light'}">
  <!-- Sidebar / Conversations -->
  <aside class="sidebar w-72 flex-shrink-0 flex flex-col border-r overflow-hidden">
    <div class="sidebar-header p-3 border-b flex items-center justify-between">
      <h2 class="font-semibold">Conversations</h2>
      <!-- Layout controls -->
      <div class="flex items-center gap-1">
        <button
          on:click={toggleSound}
          class="p-1.5 rounded hover:bg-black/10 transition-colors"
          title={soundEnabled ? 'Desactiver le son' : 'Activer le son'}
        >
          {#if soundEnabled}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          {/if}
        </button>
        <button
          on:click={() => modernThemeStore.toggle()}
          class="p-1.5 rounded hover:bg-black/10 transition-colors"
          title={$modernThemeStore === 'light' ? 'Theme Bleu' : 'Theme Clair'}
        >
          {#if $modernThemeStore === 'light'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          {/if}
        </button>
        <button
          on:click={() => compactModeStore.toggle()}
          class="p-1.5 rounded hover:bg-black/10 transition-colors"
          title={$compactModeStore ? 'Mode compact active' : 'Mode normal'}
        >
          {#if $compactModeStore}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          {/if}
        </button>
        <button
          on:click={() => chatLayoutStore.set('classic')}
          class="p-1.5 rounded hover:bg-black/10 transition-colors"
          title="Vue Classique"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      {#if loading}
        <div class="flex items-center justify-center h-32">
          <div class="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full opacity-50"></div>
        </div>
      {:else}
        {#each $threadsStore as thread (thread.threadId)}
          <button
            on:click={() => selectThread(thread)}
            class="contact-item w-full text-left flex items-center border-b transition-colors
                   {selectedThread?.threadId === thread.threadId ? 'active' : ''}
                   {$compactModeStore ? 'py-2 px-3' : 'p-4'}"
          >
            <div
              class="avatar rounded-full flex items-center justify-center text-white font-medium mr-3 flex-shrink-0 {$compactModeStore ? 'w-8 h-8 text-sm' : 'w-11 h-11'}"
              style="background-color: {getAvatarColor(thread.contactName || thread.address)}"
            >
              {(thread.contactName || thread.address).charAt(0).toUpperCase()}
            </div>
            <div class="contact-info flex-1 min-w-0">
              <div class="flex justify-between items-center">
                <span class="name font-semibold {$compactModeStore ? 'text-xs' : 'text-sm'} truncate">
                  {thread.contactName || formatPhoneNumber(thread.address)}
                </span>
                <span class="date text-xs opacity-60 ml-2 flex-shrink-0">
                  {formatRelativeTime(thread.lastDate)}
                </span>
              </div>
              {#if !$compactModeStore}
                <p class="text-sm opacity-70 truncate mt-0.5">
                  {truncate(thread.lastMessage, 35)}
                </p>
              {/if}
            </div>
            {#if thread.unreadCount > 0}
              <span class="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {thread.unreadCount}
              </span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  <!-- Chat Window -->
  <main class="chat-window flex-1 flex flex-col overflow-hidden">
    {#if selectedThread}
      <!-- Chat Header -->
      <header class="chat-header flex items-center justify-between px-5 py-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
            style="background-color: {getAvatarColor(displayName)}"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <h2 class="font-semibold">{displayName}</h2>
        </div>
        <div class="header-tools flex items-center gap-2 opacity-70">
          <button
            on:click={copyNumber}
            class="p-2 hover:opacity-100 transition-opacity rounded-full hover:bg-blue-500/20"
            title="Copier le numero"
          >
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            on:click={callNumber}
            class="call-btn p-2 hover:opacity-100 transition-opacity rounded-full hover:bg-green-500/20"
            title="Appeler {displayName}"
          >
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button class="p-2 hover:opacity-100 transition-opacity" title="Rechercher">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button class="p-2 hover:opacity-100 transition-opacity" title="Actualiser">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <!-- Export dropdown -->
          <div class="relative">
            <button
              on:click={() => showExportMenu = !showExportMenu}
              class="p-2 hover:opacity-100 transition-opacity"
              title="Exporter"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            {#if showExportMenu}
              <div class="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                <button
                  on:click={() => exportConversation('txt')}
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Texte (.txt)
                </button>
                <button
                  on:click={() => exportConversation('csv')}
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Excel (.csv)
                </button>
                <button
                  on:click={() => exportConversation('json')}
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  JSON
                </button>
              </div>
            {/if}
          </div>
          <!-- Delete button -->
          <button
            on:click={() => showDeleteConfirm = true}
            class="p-2 hover:opacity-100 transition-opacity rounded-full hover:bg-red-500/20"
            title="Supprimer la conversation"
          >
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Messages -->
      <div bind:this={messagesContainer} class="messages-container flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {#each $messagesStore as message (message.id)}
          {@const status = getStatus(message.id)}
          <div class="message {isSent(message) ? 'sent' : 'received'}">
            <p class="whitespace-pre-wrap break-words">{message.body}</p>
            <div class="message-meta">
              <span class="message-time">{formatTime(message.date)}</span>
              {#if isSent(message)}
                <span class="message-status" title={status === 'delivered' ? 'Livre' : status === 'sent' ? 'Envoye' : status === 'failed' ? 'Echec' : 'En attente'}>
                  {#if status === 'failed'}
                    <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  {:else if status === 'delivered'}
                    <svg class="w-4 h-4 status-delivered" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2 13l4 4L16 7" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 13l4 4L22 7" />
                    </svg>
                  {:else if status === 'sending' || message.type === 'outbox'}
                    <svg class="w-3.5 h-3.5 status-sending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  {:else}
                    <svg class="w-4 h-4 status-sent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  {/if}
                </span>
              {/if}
            </div>
          </div>
        {/each}

        {#if $messagesStore.length === 0}
          <div class="flex-1 flex items-center justify-center opacity-50">
            <p>Aucun message</p>
          </div>
        {/if}
      </div>

      <!-- Chat Footer -->
      <footer class="chat-footer p-4 border-t">
        <div class="flex gap-3">
          <input
            type="text"
            bind:value={replyMessage}
            on:keydown={handleKeydown}
            placeholder="Tapez votre message..."
            class="input-area flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none"
          />
          <button
            on:click={sendReply}
            disabled={!replyMessage.trim()}
            class="send-btn px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div class="toolbar flex justify-between items-center mt-3 text-sm opacity-60">
          <div class="flex gap-3 items-center">
            <TemplateSelector on:select={handleTemplateSelect} />
            <button class="hover:opacity-100" title="Camera">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button class="hover:opacity-100" title="Emoji">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <span>{replyMessage.length}</span>
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
        </div>
      </footer>
    {:else}
      <div class="flex-1 flex items-center justify-center opacity-50">
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>Selectionnez une conversation</p>
        </div>
      </div>
    {/if}
  </main>
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

<style>
  /* Theme Light (Christiano style) */
  .theme-light .sidebar {
    background: #ffffff;
    color: #333;
    border-color: #eee;
  }
  .theme-light .sidebar-header {
    border-color: #eee;
  }
  .theme-light .contact-item {
    border-color: rgba(0, 0, 0, 0.05);
  }
  .theme-light .contact-item:hover {
    background: #f8f9fa;
  }
  .theme-light .contact-item.active {
    background: #f0f0f0;
  }

  .theme-light .chat-window {
    background: #ffffff;
  }
  .theme-light .chat-header {
    border-bottom: 1px solid #eee;
    color: #333;
  }
  .theme-light .messages-container {
    background: #f4f7f9;
  }

  .theme-light .message {
    max-width: 75%;
    padding: 12px 16px;
    border-radius: 4px;
    position: relative;
    font-size: 0.9rem;
  }
  .theme-light .message.sent {
    align-self: flex-end;
    background: #d1e1e9;
    color: #444;
  }
  .theme-light .message.sent::after {
    content: '';
    position: absolute;
    top: 0;
    right: -8px;
    width: 0;
    height: 0;
    border: 8px solid transparent;
    border-left-color: #d1e1e9;
    border-top: 0;
  }
  .theme-light .message.received {
    align-self: flex-start;
    background: #eeeeee;
    color: #444;
  }
  .theme-light .message.received::after {
    content: '';
    position: absolute;
    top: 0;
    left: -8px;
    width: 0;
    height: 0;
    border: 8px solid transparent;
    border-right-color: #eeeeee;
    border-top: 0;
  }
  .theme-light .message-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 6px;
  }
  .theme-light .message-time {
    font-size: 0.7em;
    opacity: 0.6;
  }
  .theme-light .message-status {
    display: flex;
    align-items: center;
  }
  .theme-light .status-sent {
    color: rgba(0, 0, 0, 0.4);
  }
  .theme-light .status-delivered {
    color: #3498db;
  }
  .theme-light .status-sending {
    color: rgba(0, 0, 0, 0.3);
  }

  .theme-light .chat-footer {
    background: #fff;
    border-color: #eee;
  }
  .theme-light .input-area {
    background: #f5f5f5;
    border: 1px solid #ddd;
    color: #333;
  }
  .theme-light .input-area:focus {
    border-color: #3498db;
  }
  .theme-light .send-btn {
    background: #3498db;
    color: white;
  }
  .theme-light .send-btn:hover:not(:disabled) {
    background: #2980b9;
  }

  /* Theme Dark Blue (Ashley style) */
  .theme-dark-blue .sidebar {
    background: #333;
    color: #eee;
    border-color: #444;
  }
  .theme-dark-blue .sidebar-header {
    border-color: #444;
  }
  .theme-dark-blue .contact-item {
    border-color: #444;
  }
  .theme-dark-blue .contact-item:hover {
    background: #3a3a3a;
  }
  .theme-dark-blue .contact-item.active {
    background: #444;
    border-left: 4px solid #3498db;
  }

  .theme-dark-blue .chat-window {
    background: #ffffff;
  }
  .theme-dark-blue .chat-header {
    background: #3498db;
    color: white;
  }
  .theme-dark-blue .header-tools {
    color: white;
  }
  .theme-dark-blue .messages-container {
    background: #ffffff;
  }

  .theme-dark-blue .message {
    max-width: 75%;
    padding: 12px 16px;
    border-radius: 4px;
    position: relative;
    font-size: 0.9rem;
  }
  .theme-dark-blue .message.sent {
    align-self: flex-end;
    background: #e3f2fd;
    color: #2c3e50;
    border: 1px solid #bbdefb;
  }
  .theme-dark-blue .message.sent::after {
    content: '';
    position: absolute;
    top: 0;
    right: -8px;
    width: 0;
    height: 0;
    border: 8px solid transparent;
    border-left-color: #e3f2fd;
    border-top: 0;
  }
  .theme-dark-blue .message.received {
    align-self: flex-start;
    background: #f5f5f5;
    color: #333;
  }
  .theme-dark-blue .message.received::after {
    content: '';
    position: absolute;
    top: 0;
    left: -8px;
    width: 0;
    height: 0;
    border: 8px solid transparent;
    border-right-color: #f5f5f5;
    border-top: 0;
  }
  .theme-dark-blue .message-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 6px;
  }
  .theme-dark-blue .message-time {
    font-size: 0.7em;
    opacity: 0.6;
  }
  .theme-dark-blue .message-status {
    display: flex;
    align-items: center;
  }
  .theme-dark-blue .status-sent {
    color: rgba(0, 0, 0, 0.4);
  }
  .theme-dark-blue .status-delivered {
    color: #3498db;
  }
  .theme-dark-blue .status-sending {
    color: rgba(0, 0, 0, 0.3);
  }

  .theme-dark-blue .chat-footer {
    background: #333;
    border-color: #444;
  }
  .theme-dark-blue .toolbar {
    color: #aaa;
  }
  .theme-dark-blue .input-area {
    background: #444;
    border: none;
    color: white;
  }
  .theme-dark-blue .input-area::placeholder {
    color: #888;
  }
  .theme-dark-blue .send-btn {
    background: #3498db;
    color: white;
  }
  .theme-dark-blue .send-btn:hover:not(:disabled) {
    background: #2980b9;
  }
</style>
