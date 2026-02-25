<script lang="ts">
  import { onMount } from 'svelte';
  import { callsStore, type CallLogEntry, type CallType } from '$lib/stores/calls';
  import { contactsStore } from '$lib/stores/contacts';
  import { socketStore } from '$lib/stores/socket';
  import { phoneStatusStore } from '$lib/stores/status';

  let loading = true;
  let filter: 'all' | CallType = 'all';
  let dialNumber = '';
  let showDialer = false;

  $: calls = $callsStore;
  $: filteredCalls = filter === 'all'
    ? calls
    : calls.filter(c => c.type === filter);

  $: missedCount = calls.filter(c => c.type === 'missed').length;
  $: incomingCount = calls.filter(c => c.type === 'incoming').length;
  $: outgoingCount = calls.filter(c => c.type === 'outgoing').length;

  onMount(async () => {
    await callsStore.load();
    await contactsStore.load();
    loading = false;

    // Listen for new calls
    const socket = socketStore.getSocket();
    if (socket) {
      socket.on('call_log_update', (call: CallLogEntry) => {
        callsStore.addCall(call);
      });
    }
  });

  function formatDuration(seconds: number): string {
    if (seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getCallIcon(type: CallType): string {
    switch (type) {
      case 'incoming': return 'incoming';
      case 'outgoing': return 'outgoing';
      case 'missed': return 'missed';
      case 'rejected': return 'rejected';
      default: return 'voicemail';
    }
  }

  function getCallColor(type: CallType): string {
    switch (type) {
      case 'incoming': return 'text-green-500';
      case 'outgoing': return 'text-blue-500';
      case 'missed': return 'text-red-500';
      case 'rejected': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  }

  function getContactName(number: string): string | null {
    const contact = contactsStore.findByPhone(number);
    return contact?.name || null;
  }

  function dialFromPC() {
    if (!dialNumber.trim()) return;

    const socket = socketStore.getSocket();
    if (socket) {
      socket.emit('dial_number', { number: dialNumber.trim() });
      dialNumber = '';
      showDialer = false;
    }
  }

  function callBack(number: string) {
    const socket = socketStore.getSocket();
    if (socket) {
      socket.emit('dial_number', { number });
    }
  }

  function addDigit(digit: string) {
    dialNumber += digit;
  }

  function removeDigit() {
    dialNumber = dialNumber.slice(0, -1);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && showDialer) {
      showDialer = false;
    }
    // Allow typing digits when dialer is open
    if (showDialer && /^[0-9*#]$/.test(e.key)) {
      addDigit(e.key);
    }
    if (showDialer && e.key === 'Backspace') {
      removeDigit();
    }
    if (showDialer && e.key === 'Enter' && dialNumber.trim()) {
      dialFromPC();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-semibold">Journal d'appels</h2>
      <button
        on:click={() => showDialer = !showDialer}
        class="px-3 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        Composer
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto pb-2">
      <button
        on:click={() => filter = 'all'}
        class="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
               {filter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}"
      >
        Tous ({calls.length})
      </button>
      <button
        on:click={() => filter = 'missed'}
        class="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
               {filter === 'missed' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}"
      >
        Manques ({missedCount})
      </button>
      <button
        on:click={() => filter = 'incoming'}
        class="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
               {filter === 'incoming' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}"
      >
        Entrants ({incomingCount})
      </button>
      <button
        on:click={() => filter = 'outgoing'}
        class="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
               {filter === 'outgoing' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}"
      >
        Sortants ({outgoingCount})
      </button>
    </div>
  </div>

  <!-- Call List -->
  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center h-32">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    {:else if filteredCalls.length === 0}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <p>Aucun appel</p>
        <p class="text-sm">Connectez votre telephone pour synchroniser</p>
      </div>
    {:else}
      {#each filteredCalls as call (call.id)}
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <!-- Call type icon -->
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                        {call.type === 'missed' ? 'bg-red-100 dark:bg-red-900/30' :
                         call.type === 'incoming' ? 'bg-green-100 dark:bg-green-900/30' :
                         'bg-blue-100 dark:bg-blue-900/30'}">
              {#if call.type === 'incoming'}
                <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              {:else if call.type === 'outgoing'}
                <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 4l3 3m0 0l3-3m-3 3V10" />
                </svg>
              {:else if call.type === 'missed'}
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              {:else}
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              {/if}
            </div>

            <!-- Call info -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white">
                {call.contactName || getContactName(call.number) || call.number}
              </p>
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <span class="{getCallColor(call.type)}">
                  {call.type === 'incoming' ? 'Entrant' :
                   call.type === 'outgoing' ? 'Sortant' :
                   call.type === 'missed' ? 'Manque' :
                   call.type === 'rejected' ? 'Rejete' : 'Messagerie'}
                </span>
                <span>-</span>
                <span>{formatDuration(call.duration)}</span>
              </div>
            </div>

            <!-- Time and callback -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">{formatDate(call.date)}</span>
              <button
                on:click={() => callBack(call.number)}
                disabled={!$phoneStatusStore.connected}
                class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rappeler"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<!-- Dialer Modal (floating) -->
{#if showDialer}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/50"
      on:click={() => showDialer = false}
    ></button>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 class="font-semibold text-gray-900 dark:text-white text-lg">Composer un numero</h3>
        <button
          on:click={() => showDialer = false}
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-4">
        <!-- Phone status warning -->
        {#if !$phoneStatusStore.connected}
          <div class="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
            Telephone non connecte
          </div>
        {/if}

        <!-- Number input -->
        <div class="mb-4">
          <input
            type="tel"
            bind:value={dialNumber}
            placeholder="Entrez ou collez un numero"
            class="w-full text-2xl text-center py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600
                   bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500
                   dark:text-white font-mono tracking-wider"
          />
        </div>

        <!-- Dial pad -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'] as digit}
            <button
              on:click={() => addDigit(digit)}
              class="py-4 text-2xl font-medium rounded-xl bg-gray-100 dark:bg-gray-800
                     hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                     active:scale-95 transform"
            >
              {digit}
            </button>
          {/each}
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-center">
          <button
            on:click={removeDigit}
            class="p-4 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title="Effacer"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
          <button
            on:click={dialFromPC}
            disabled={!dialNumber.trim() || !$phoneStatusStore.connected}
            class="px-8 py-4 rounded-full bg-green-500 text-white hover:bg-green-600
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                   flex items-center gap-2 font-medium"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Appeler
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
