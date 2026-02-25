<script lang="ts">
  import type { AppNotification } from '$lib/stores/notifications';
  import { formatRelativeTime } from '$lib/utils/formatters';
  import { socketStore } from '$lib/stores/socket';
  import { toast } from '$lib/stores/toast';

  export let notification: AppNotification;
  export let onDismiss: () => void;

  let showQuickReply = false;
  let replyMessage = '';
  let sending = false;

  // Check if this is an SMS notification
  $: isSmsNotification = notification.appName.toLowerCase().includes('message') ||
    notification.appName.toLowerCase().includes('sms') ||
    notification.packageName?.includes('mms');

  // Check if notification supports direct reply (WhatsApp, Telegram, etc.)
  $: canReply = notification.canReply === true;

  // Try to extract phone number from title (usually contact name or number)
  $: phoneNumber = notification.title?.match(/[\d+\-\s()]{10,}/)?.[0]?.replace(/[\s\-()]/g, '') || '';

  // Generate a color based on app name
  function getAppColor(appName: string): string {
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
    ];

    let hash = 0;
    for (let i = 0; i < appName.length; i++) {
      hash = appName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  function toggleQuickReply() {
    showQuickReply = !showQuickReply;
    if (!showQuickReply) {
      replyMessage = '';
    }
  }

  async function sendQuickReply() {
    if (!replyMessage.trim()) return;

    sending = true;
    const socket = socketStore.getSocket();

    if (socket) {
      // For SMS notifications with phone number, send SMS
      if (isSmsNotification && phoneNumber) {
        socket.emit('send_sms', {
          address: phoneNumber,
          body: replyMessage.trim(),
        });
        toast('SMS envoye', 'success');
      }
      // For other notifications with direct reply support
      else if (canReply) {
        socket.emit('reply_notif', {
          notificationId: notification.id,
          message: replyMessage.trim(),
        });
        toast('Reponse envoyee', 'success');
      }

      replyMessage = '';
      showQuickReply = false;
      onDismiss();
    } else {
      toast('Non connecte au telephone', 'error');
    }

    sending = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuickReply();
    }
    if (e.key === 'Escape') {
      showQuickReply = false;
      replyMessage = '';
    }
  }

  // Can we reply to this notification?
  $: showReplyButton = canReply || (isSmsNotification && phoneNumber);
</script>

<div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
  <div class="flex gap-3">
    <!-- App Icon -->
    <div class="flex-shrink-0 w-10 h-10 {getAppColor(notification.appName)} rounded-lg flex items-center justify-center">
      <span class="text-white font-medium text-sm">
        {notification.appName.charAt(0).toUpperCase()}
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
          {notification.appName}
        </span>
        <span class="text-xs text-gray-400">
          {formatRelativeTime(notification.timestamp)}
        </span>
        {#if canReply}
          <span class="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
            Reponse directe
          </span>
        {/if}
      </div>

      {#if notification.title}
        <p class="font-medium text-gray-900 dark:text-white mt-0.5 truncate">
          {notification.title}
        </p>
      {/if}

      {#if notification.text}
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
          {notification.text}
        </p>
      {/if}

      <!-- Quick Reply -->
      {#if showQuickReply && showReplyButton}
        <div class="mt-2 flex gap-2">
          <input
            type="text"
            bind:value={replyMessage}
            on:keydown={handleKeydown}
            placeholder={canReply ? `Repondre a ${notification.appName}...` : 'Reponse rapide...'}
            class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
                   focus:ring-primary-500 dark:text-white"
            autofocus
          />
          <button
            on:click={sendQuickReply}
            disabled={!replyMessage.trim() || sending}
            class="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg
                   hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if sending}
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            {/if}
          </button>
        </div>
      {/if}
    </div>

    <!-- Action Buttons -->
    <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {#if showReplyButton}
        <button
          on:click|stopPropagation={toggleQuickReply}
          class="p-1.5 text-primary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
          title="Repondre"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      {/if}

      <button
        on:click|stopPropagation={onDismiss}
        class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        title="Ignorer"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</div>
