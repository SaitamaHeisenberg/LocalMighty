<script lang="ts">
  import { phoneStatusStore, statusStore } from '$lib/stores/status';
  import { threadsStore, type SmsThread } from '$lib/stores/messages';
  import { notificationsStore } from '$lib/stores/notifications';
  import { callsStore } from '$lib/stores/calls';
  import { connectionStatus } from '$lib/stores/socket';
  import { apiUrl } from '$lib/api';
  import { onMount } from 'svelte';
  import { formatRelativeTime, formatPhoneNumber } from '$lib/utils/formatters';

  let serverInfo: { ip: string; port: number } | null = null;
  let stats = { totalMessages: 0, todayMessages: 0, weekMessages: 0 };

  onMount(async () => {
    try {
      const res = await fetch(apiUrl('/api/info'));
      if (res.ok) {
        serverInfo = await res.json();
      }
    } catch (e) {
      console.error('Failed to get server info');
    }

    // Load stats
    try {
      const statsRes = await fetch(apiUrl('/api/messages/stats'));
      if (statsRes.ok) {
        stats = await statsRes.json();
      }
    } catch (e) {
      console.error('Failed to get stats');
    }

    // Load initial data
    threadsStore.load();
    notificationsStore.load();
    callsStore.load();
  });

  $: unreadSms = $threadsStore.reduce((acc, t) => acc + t.unreadCount, 0);
  $: activeNotifs = $notificationsStore.filter((n) => !n.dismissed).length;
  $: recentThreads = $threadsStore.slice(0, 5);
  $: recentNotifs = $notificationsStore.filter(n => !n.dismissed).slice(0, 3);
  $: recentCalls = $callsStore.slice(0, 5);
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

  <!-- Actions Rapides -->
  <div class="card p-4 mb-8">
    <h3 class="font-semibold mb-4">Actions rapides</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <a href="/sms/new" class="flex flex-col items-center gap-2 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
        <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span class="text-sm font-medium text-primary-700 dark:text-primary-300">Nouveau SMS</span>
      </a>
      <a href="/sms/bulk" class="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
        <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <span class="text-sm font-medium text-blue-700 dark:text-blue-300">SMS en masse</span>
      </a>
      <a href="/contacts" class="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
        <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <span class="text-sm font-medium text-green-700 dark:text-green-300">Contacts</span>
      </a>
      <a href="/settings" class="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <div class="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Parametres</span>
      </a>
    </div>
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

  <!-- Statistiques SMS -->
  <div class="card p-4 mb-8">
    <h3 class="font-semibold mb-4">Statistiques SMS</h3>
    <div class="grid grid-cols-3 gap-4">
      <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p class="text-2xl font-bold text-primary-500">{stats.todayMessages}</p>
        <p class="text-xs text-gray-500 mt-1">Aujourd'hui</p>
      </div>
      <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p class="text-2xl font-bold text-blue-500">{stats.weekMessages}</p>
        <p class="text-xs text-gray-500 mt-1">Cette semaine</p>
      </div>
      <div class="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p class="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.totalMessages}</p>
        <p class="text-xs text-gray-500 mt-1">Total</p>
      </div>
    </div>
  </div>

  <!-- Derniers SMS -->
  {#if recentThreads.length > 0}
    <div class="card p-4 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Derniers messages</h3>
        <a href="/sms" class="text-sm text-primary-500 hover:text-primary-600">Voir tout</a>
      </div>
      <div class="space-y-3">
        {#each recentThreads as thread (thread.threadId)}
          <a
            href="/sms/{thread.threadId}"
            class="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <span class="text-primary-600 font-medium">
                {(thread.contactName || thread.address).charAt(0).toUpperCase()}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {thread.contactName || formatPhoneNumber(thread.address)}
                </p>
                <span class="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {formatRelativeTime(thread.lastDate)}
                </span>
              </div>
              <p class="text-sm text-gray-500 truncate">{thread.lastMessage}</p>
            </div>
            {#if thread.unreadCount > 0}
              <span class="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                {thread.unreadCount}
              </span>
            {/if}
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Derniers Appels -->
  {#if recentCalls.length > 0}
    <div class="card p-4 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Derniers appels</h3>
        <a href="/calls" class="text-sm text-primary-500 hover:text-primary-600">Voir tout</a>
      </div>
      <div class="space-y-3">
        {#each recentCalls as call (call.id)}
          <div class="flex items-center gap-3 p-2 -mx-2">
            <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              {call.type === 'missed' ? 'bg-red-100 dark:bg-red-900/30' :
               call.type === 'incoming' ? 'bg-green-100 dark:bg-green-900/30' :
               'bg-blue-100 dark:bg-blue-900/30'}">
              {#if call.type === 'missed'}
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              {:else if call.type === 'incoming'}
                <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" transform="rotate(-45 12 12)" />
                </svg>
              {:else}
                <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {call.contactName || formatPhoneNumber(call.number)}
              </p>
              <p class="text-sm text-gray-500">
                {call.type === 'missed' ? 'Manque' : call.type === 'incoming' ? 'Entrant' : 'Sortant'}
                {#if call.duration > 0}
                  · {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                {/if}
              </p>
            </div>
            <span class="text-xs text-gray-500 flex-shrink-0">
              {formatRelativeTime(call.date)}
            </span>
          </div>
        {/each}
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
