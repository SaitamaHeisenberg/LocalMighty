<script lang="ts">
  import { threadsStore, type SmsThread } from '$lib/stores/messages';
  import { formatRelativeTime, formatPhoneNumber, truncate } from '$lib/utils/formatters';
  import { onMount } from 'svelte';

  let loading = true;

  onMount(async () => {
    await threadsStore.load();
    loading = false;
  });
</script>

<div class="flex flex-col h-full">
  <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
    <h2 class="text-lg font-semibold">Messages</h2>
    <a
      href="/sms/new"
      class="flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Nouveau
    </a>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center h-32">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    {:else if $threadsStore.length === 0}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p>Aucun message</p>
        <p class="text-sm">Connectez votre telephone pour synchroniser</p>
      </div>
    {:else}
      {#each $threadsStore as thread (thread.threadId)}
        <a
          href="/sms/{thread.threadId}"
          class="block p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span class="text-primary-600 dark:text-primary-400 font-medium">
                {(thread.contactName || thread.address).charAt(0).toUpperCase()}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {thread.contactName || formatPhoneNumber(thread.address)}
                </p>
                <span class="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatRelativeTime(thread.lastDate)}
                </span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {truncate(thread.lastMessage, 50)}
              </p>
            </div>

            {#if thread.unreadCount > 0}
              <span class="flex-shrink-0 px-2 py-0.5 bg-primary-500 text-white text-xs font-medium rounded-full">
                {thread.unreadCount}
              </span>
            {/if}
          </div>
        </a>
      {/each}
    {/if}
  </div>
</div>
