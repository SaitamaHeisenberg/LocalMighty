<script lang="ts">
  import { connectionStatus } from '$lib/stores/socket';
  import { statusStore, phoneStatusStore } from '$lib/stores/status';

  export let connected: boolean = false;
  export let battery: number = 0;
  export let charging: boolean = false;

  $: batteryColor = battery > 50 ? 'text-green-500' : battery > 20 ? 'text-yellow-500' : 'text-red-500';
</script>

<footer class="h-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center px-4 text-sm">
  <div class="flex items-center gap-4">
    <!-- Connection Status -->
    <div class="flex items-center gap-2">
      {#if $connectionStatus === 'connected'}
        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
        <span class="text-green-600 dark:text-green-400">Connecte</span>
      {:else if $connectionStatus === 'connecting'}
        <span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
        <span class="text-yellow-600 dark:text-yellow-400">Connexion...</span>
      {:else}
        <span class="w-2 h-2 bg-red-500 rounded-full"></span>
        <span class="text-red-600 dark:text-red-400">Deconnecte</span>
      {/if}
    </div>

    <!-- Phone Status -->
    {#if $phoneStatusStore.connected}
      <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <span>|</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>{$phoneStatusStore.deviceName || 'Telephone'}</span>
      </div>

      <!-- Battery -->
      <div class="flex items-center gap-1 {batteryColor}">
        {#if $statusStore.isCharging}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        {:else}
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="2" y="7" width="18" height="10" rx="2" stroke="currentColor" stroke-width="2" fill="none" />
            <rect x="20" y="10" width="2" height="4" fill="currentColor" />
            <rect x="4" y="9" width="{($statusStore.batteryLevel / 100) * 14}" height="6" fill="currentColor" />
          </svg>
        {/if}
        <span>{$statusStore.batteryLevel}%</span>
      </div>
    {/if}
  </div>

  <div class="ml-auto text-gray-400 text-xs">
    LocalMighty v1.0.0
  </div>
</footer>
