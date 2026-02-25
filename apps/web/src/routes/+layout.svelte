<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/layout/Header.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import StatusBar from '$lib/components/layout/StatusBar.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';
  import LoadingBar from '$lib/components/ui/LoadingBar.svelte';
  import { socketStore } from '$lib/stores/socket';
  import { statusStore } from '$lib/stores/status';
  import { desktopNotifications } from '$lib/services/desktopNotifications';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  onMount(async () => {
    if (browser) {
      const token = localStorage.getItem('localmighty_token');
      socketStore.connect(token || undefined);

      // Request notification permission
      if (desktopNotifications.isSupported() && desktopNotifications.getPermission() === 'default') {
        await desktopNotifications.requestPermission();
      }
    }
  });

  onDestroy(() => {
    if (browser) {
      socketStore.disconnect();
    }
  });
</script>

<LoadingBar />
<Toast />

<div class="h-screen flex flex-col">
  <Header />

  <div class="flex-1 flex overflow-hidden">
    <Sidebar />

    <main class="flex-1 overflow-hidden bg-white dark:bg-gray-900">
      <slot />
    </main>
  </div>

  <StatusBar />
</div>
