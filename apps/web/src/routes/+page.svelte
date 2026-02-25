<script lang="ts">
  import { phoneStatusStore, statusStore } from '$lib/stores/status';
  import { threadsStore } from '$lib/stores/messages';
  import { notificationsStore } from '$lib/stores/notifications';
  import { connectionStatus } from '$lib/stores/socket';
  import { apiUrl } from '$lib/api';
  import { onMount } from 'svelte';

  let serverInfo: { ip: string; port: number } | null = null;

  onMount(async () => {
    try {
      const res = await fetch(apiUrl('/api/info'));
      if (res.ok) {
        serverInfo = await res.json();
      }
    } catch (e) {
      console.error('Failed to get server info');
    }

    // Load initial data
    threadsStore.load();
    notificationsStore.load();
  });

  $: unreadSms = $threadsStore.reduce((acc, t) => acc + t.unreadCount, 0);
  $: activeNotifs = $notificationsStore.filter((n) => !n.dismissed).length;
</script>

<div class="h-full overflow-y-auto p-6">
  <h1 class="text-2xl font-bold mb-6">Tableau de bord</h1>

  <!-- Status Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <!-- Connection Status -->
    <div class="card p-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center
          {$connectionStatus === 'connected' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}">
          <svg class="w-5 h-5 {$connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Serveur</p>
          <p class="font-semibold {$connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-900 dark:text-white'}">
            {$connectionStatus === 'connected' ? 'Connecte' : 'Deconnecte'}
          </p>
        </div>
      </div>
    </div>

    <!-- Phone Status -->
    <div class="card p-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center
          {$phoneStatusStore.connected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}">
          <svg class="w-5 h-5 {$phoneStatusStore.connected ? 'text-blue-600' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Telephone</p>
          <p class="font-semibold text-gray-900 dark:text-white">
            {$phoneStatusStore.connected ? ($phoneStatusStore.deviceName || 'Connecte') : 'Deconnecte'}
          </p>
        </div>
      </div>
    </div>

    <!-- SMS -->
    <a href="/sms" class="card p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Messages</p>
          <p class="font-semibold text-gray-900 dark:text-white">
            {$threadsStore.length} conversations
            {#if unreadSms > 0}
              <span class="text-primary-500">({unreadSms} non lus)</span>
            {/if}
          </p>
        </div>
      </div>
    </a>

    <!-- Notifications -->
    <a href="/notifications" class="card p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-gray-500">Notifications</p>
          <p class="font-semibold text-gray-900 dark:text-white">
            {activeNotifs} active{activeNotifs > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </a>
  </div>

  <!-- Battery (if phone connected) -->
  {#if $phoneStatusStore.connected}
    <div class="card p-4 mb-8">
      <h3 class="font-semibold mb-3">Batterie du telephone</h3>
      <div class="flex items-center gap-4">
        <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-500
              {$statusStore.batteryLevel > 50 ? 'bg-green-500' : $statusStore.batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'}"
            style="width: {$statusStore.batteryLevel}%"
          ></div>
        </div>
        <span class="font-medium">{$statusStore.batteryLevel}%</span>
        {#if $statusStore.isCharging}
          <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Server Info -->
  {#if serverInfo}
    <div class="card p-4">
      <h3 class="font-semibold mb-3">Informations de connexion</h3>
      <div class="space-y-2 text-sm">
        <p>
          <span class="text-gray-500">Adresse IP :</span>
          <code class="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">{serverInfo.ip}</code>
        </p>
        <p>
          <span class="text-gray-500">Port :</span>
          <code class="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">{serverInfo.port}</code>
        </p>
        <p class="text-gray-500 mt-4">
          Utilisez ces informations pour connecter l'application Android sur le meme reseau Wi-Fi.
        </p>
      </div>
    </div>
  {/if}
</div>
