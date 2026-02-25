<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { apiUrl } from '$lib/api';
  import { themeStore } from '$lib/stores/theme';

  let serverInfo: { ip: string; port: number; name: string; version: string } | null = null;
  let token = '';
  let newDeviceName = '';
  let pairing = false;
  let pairError = '';

  // Theme options
  type Theme = 'light' | 'dark' | 'system';
  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Clair', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
    { value: 'dark', label: 'Sombre', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
    { value: 'system', label: 'Systeme', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  onMount(async () => {
    if (browser) {
      token = localStorage.getItem('localmighty_token') || '';
    }

    try {
      const res = await fetch(apiUrl('/api/info'));
      if (res.ok) {
        serverInfo = await res.json();
      }
    } catch (e) {
      console.error('Failed to get server info');
    }
  });

  async function pairDevice() {
    if (!newDeviceName.trim()) {
      pairError = 'Entrez un nom pour cet appareil';
      return;
    }

    pairing = true;
    pairError = '';

    try {
      const res = await fetch(apiUrl('/api/auth/pair'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: newDeviceName }),
      });

      if (res.ok) {
        const data = await res.json();
        token = data.token;
        if (browser) {
          localStorage.setItem('localmighty_token', token);
        }
        newDeviceName = '';
      } else {
        pairError = 'Echec de l\'appairage';
      }
    } catch (e) {
      pairError = 'Erreur de connexion au serveur';
    }

    pairing = false;
  }

  function clearToken() {
    token = '';
    if (browser) {
      localStorage.removeItem('localmighty_token');
    }
  }
</script>

<div class="h-full overflow-y-auto p-6">
  <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Parametres</h1>

  <!-- Theme -->
  <div class="card p-6 mb-6">
    <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Apparence</h2>

    <div class="flex gap-2">
      {#each themeOptions as option}
        <button
          on:click={() => themeStore.set(option.value)}
          class="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                 {$themeStore === option.value
                   ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                   : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
        >
          <div class="w-10 h-10 rounded-full flex items-center justify-center
                      {$themeStore === option.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={option.icon} />
            </svg>
          </div>
          <span class="text-sm font-medium
                       {$themeStore === option.value
                         ? 'text-primary-600 dark:text-primary-400'
                         : 'text-gray-600 dark:text-gray-300'}">
            {option.label}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Server Info -->
  <div class="card p-6 mb-6">
    <h2 class="text-lg font-semibold mb-4">Informations du serveur</h2>

    {#if serverInfo}
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-500">Nom</span>
          <span class="font-medium">{serverInfo.name}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Version</span>
          <span class="font-medium">{serverInfo.version}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Adresse IP</span>
          <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">{serverInfo.ip}</code>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Port</span>
          <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">{serverInfo.port}</code>
        </div>
      </div>
    {:else}
      <p class="text-gray-500">Chargement...</p>
    {/if}
  </div>

  <!-- Token Management -->
  <div class="card p-6 mb-6">
    <h2 class="text-lg font-semibold mb-4">Authentification</h2>

    {#if token}
      <div class="space-y-4">
        <div>
          <p class="text-sm text-gray-500 mb-2">Token actuel</p>
          <code class="block p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm break-all">
            {token}
          </code>
        </div>

        <button on:click={clearToken} class="btn btn-secondary">
          Supprimer le token
        </button>
      </div>
    {:else}
      <div class="space-y-4">
        <p class="text-gray-500">
          Aucun token configure. Appairez un appareil pour generer un token.
        </p>

        <div class="flex gap-2">
          <input
            type="text"
            bind:value={newDeviceName}
            placeholder="Nom de l'appareil (ex: Mon PC)"
            class="input flex-1"
          />
          <button
            on:click={pairDevice}
            disabled={pairing}
            class="btn btn-primary"
          >
            {pairing ? 'Appairage...' : 'Appairer'}
          </button>
        </div>

        {#if pairError}
          <p class="text-red-500 text-sm">{pairError}</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Instructions -->
  <div class="card p-6">
    <h2 class="text-lg font-semibold mb-4">Connexion de l'application Android</h2>

    <ol class="space-y-3 text-gray-600 dark:text-gray-300">
      <li class="flex gap-3">
        <span class="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">1</span>
        <span>Assurez-vous que votre telephone et ce PC sont sur le meme reseau Wi-Fi</span>
      </li>
      <li class="flex gap-3">
        <span class="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">2</span>
        <span>Ouvrez l'application LocalMighty sur votre telephone</span>
      </li>
      <li class="flex gap-3">
        <span class="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">3</span>
        <span>Entrez l'adresse IP et le port affiches ci-dessus</span>
      </li>
      <li class="flex gap-3">
        <span class="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">4</span>
        <span>Accordez les permissions necessaires (SMS, Notifications)</span>
      </li>
      <li class="flex gap-3">
        <span class="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">5</span>
        <span>Appuyez sur "Connecter" pour demarrer la synchronisation</span>
      </li>
    </ol>
  </div>
</div>
