<script lang="ts">
  import { messagesStore, type SmsMessage } from '$lib/stores/messages';
  import { formatTime, formatDate } from '$lib/utils/formatters';
  import { onMount, afterUpdate } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import ReplyInput from './ReplyInput.svelte';

  export let threadId: string;
  export let address: string;

  let loading = true;
  let messagesContainer: HTMLDivElement;

  onMount(async () => {
    await messagesStore.loadThreadMessages(threadId);
    loading = false;
    scrollToBottom();
  });

  afterUpdate(() => {
    scrollToBottom();
  });

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Group messages by date
  function groupMessagesByDate(messages: SmsMessage[]): Map<string, SmsMessage[]> {
    const groups = new Map<string, SmsMessage[]>();

    for (const msg of messages) {
      const dateKey = new Date(msg.date).toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(msg);
    }

    return groups;
  }

  $: groupedMessages = groupMessagesByDate($messagesStore);
</script>

<div class="flex flex-col h-full">
  <!-- Messages -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if loading}
      <div class="flex items-center justify-center h-32">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    {:else}
      {#each [...groupedMessages] as [dateKey, messages]}
        <div class="flex justify-center">
          <span class="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-full text-xs text-gray-500">
            {formatDate(new Date(dateKey).getTime())}
          </span>
        </div>

        {#each messages as message (message.id)}
          <MessageBubble {message} />
        {/each}
      {/each}

      {#if $messagesStore.length === 0}
        <div class="flex flex-col items-center justify-center h-32 text-gray-500">
          <p>Aucun message dans cette conversation</p>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Reply Input -->
  <ReplyInput {threadId} {address} />
</div>
