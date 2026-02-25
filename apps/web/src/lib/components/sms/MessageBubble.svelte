<script lang="ts">
  import type { SmsMessage } from '$lib/stores/messages';
  import { formatTime } from '$lib/utils/formatters';

  export let message: SmsMessage;

  $: isSent = message.type === 'sent' || message.type === 'outbox';
</script>

<div class="flex {isSent ? 'justify-end' : 'justify-start'}">
  <div
    class="max-w-[75%] rounded-2xl px-4 py-2 {isSent
      ? 'bg-primary-500 text-white rounded-br-md'
      : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'}"
  >
    <p class="whitespace-pre-wrap break-words">{message.body}</p>
    <div class="flex items-center justify-end gap-1 mt-1">
      <span class="text-xs {isSent ? 'text-primary-100' : 'text-gray-400'}">
        {formatTime(message.date)}
      </span>
      {#if isSent}
        <svg class="w-4 h-4 {message.type === 'sent' ? 'text-primary-100' : 'text-primary-200'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if message.type === 'sent'}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          {/if}
        </svg>
      {/if}
    </div>
  </div>
</div>
