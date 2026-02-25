<script lang="ts">
  import type { SmsMessage } from '$lib/stores/messages';
  import { smsStatusStore, type SmsDeliveryStatus } from '$lib/stores/smsStatus';
  import { formatTime } from '$lib/utils/formatters';
  import MessageStatus from './MessageStatus.svelte';

  export let message: SmsMessage;

  $: isSent = message.type === 'sent' || message.type === 'outbox';

  // Get status from store (for recently sent messages)
  let status: SmsDeliveryStatus | undefined;

  // Subscribe to status changes
  const unsubscribe = smsStatusStore.subscribe((map) => {
    const entry = map.get(message.id);
    if (entry) {
      status = entry.status;
    }
  });
</script>

<div class="flex {isSent ? 'justify-end' : 'justify-start'}">
  <div
    class="max-w-[75%] rounded-2xl px-4 py-2 {isSent
      ? 'bg-primary-500 text-white rounded-br-md'
      : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'}"
  >
    <p class="whitespace-pre-wrap break-words">{message.body}</p>
    <div class="flex items-center justify-end gap-0.5 mt-1">
      <span class="text-xs {isSent ? 'text-primary-100' : 'text-gray-400'}">
        {formatTime(message.date)}
      </span>
      {#if isSent}
        <MessageStatus {status} type={message.type} light={true} />
      {/if}
    </div>
  </div>
</div>
