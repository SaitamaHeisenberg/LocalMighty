<script lang="ts">
  import { socketStore } from '$lib/stores/socket';
  import { phoneStatusStore } from '$lib/stores/status';

  export let threadId: string;
  export let address: string;

  let message = '';
  let sending = false;
  let textarea: HTMLTextAreaElement;

  async function sendMessage() {
    if (!message.trim() || sending) return;

    sending = true;
    const socket = socketStore.getSocket();

    if (socket) {
      socket.emit('send_sms', {
        address,
        body: message.trim(),
        threadId,
      });
    }

    message = '';
    sending = false;

    // Reset textarea height
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize() {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }
</script>

<div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
  {#if !$phoneStatusStore.connected}
    <div class="text-center text-sm text-gray-500 py-2">
      Telephone non connecte - impossible d'envoyer
    </div>
  {:else}
    <div class="flex gap-2 items-end">
      <textarea
        bind:this={textarea}
        bind:value={message}
        on:keydown={handleKeydown}
        on:input={autoResize}
        placeholder="Ecrire un message..."
        rows="1"
        class="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600
               bg-gray-50 dark:bg-gray-800 px-4 py-2.5 focus:outline-none focus:ring-2
               focus:ring-primary-500 dark:text-white max-h-[120px]"
      ></textarea>

      <button
        on:click={sendMessage}
        disabled={!message.trim() || sending}
        class="p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600
               disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  {/if}
</div>
