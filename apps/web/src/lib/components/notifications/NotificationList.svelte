<script lang="ts">
  import { notificationsStore, type AppNotification } from '$lib/stores/notifications';
  import { onMount } from 'svelte';
  import NotificationItem from './NotificationItem.svelte';

  let loading = true;

  onMount(async () => {
    await notificationsStore.load();
    loading = false;
  });

  $: activeNotifications = $notificationsStore.filter((n) => !n.dismissed);
</script>

<div class="flex flex-col h-full">
  <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
    <h2 class="text-lg font-semibold">Notifications</h2>
    {#if activeNotifications.length > 0}
      <button
        on:click={() => {
          activeNotifications.forEach((n) => notificationsStore.dismiss(n.id));
        }}
        class="text-sm text-primary-500 hover:text-primary-600"
      >
        Tout effacer
      </button>
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center h-32">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    {:else if activeNotifications.length === 0}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <p>Aucune notification</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-100 dark:divide-gray-800">
        {#each activeNotifications as notification (notification.id)}
          <NotificationItem
            {notification}
            onDismiss={() => notificationsStore.dismiss(notification.id)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>
