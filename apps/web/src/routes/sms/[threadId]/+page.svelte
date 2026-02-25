<script lang="ts">
  import { page } from '$app/stores';
  import { threadsStore } from '$lib/stores/messages';
  import { formatPhoneNumber } from '$lib/utils/formatters';
  import ConversationDetail from '$lib/components/sms/ConversationDetail.svelte';

  $: threadId = $page.params.threadId;
  $: thread = $threadsStore.find((t) => t.threadId === threadId);
  $: address = thread?.address || '';
  $: displayName = thread?.contactName || formatPhoneNumber(address);
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

    <div>
      <h2 class="font-semibold">{displayName}</h2>
      {#if thread?.contactName}
        <p class="text-xs text-gray-500">{formatPhoneNumber(address)}</p>
      {/if}
    </div>
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-hidden">
    <ConversationDetail {threadId} {address} />
  </div>
</div>
