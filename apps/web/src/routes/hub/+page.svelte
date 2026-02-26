<script lang="ts">
  import { browser } from '$app/environment';
  import TextSync from '$lib/components/hub/TextSync.svelte';
  import FileDropZone from '$lib/components/hub/FileDropZone.svelte';
  import PasswordVault from '$lib/components/hub/PasswordVault.svelte';
  import { hubStore } from '$lib/stores/hub';
  import { socketStore } from '$lib/stores/socket';

  let activeTab: 'partage' | 'vault' = 'partage';

  // SMS dialog state
  let showSmsDialog = false;
  let smsBody = '';
  let smsAddress = '';
  let smsSending = false;
  let smsSent = false;

  // EF-4.7: Paste password into hub textarea
  function handlePasteToTextarea(e: CustomEvent<{ text: string }>) {
    hubStore.updateText(e.detail.text);
    activeTab = 'partage';
  }

  // EF-5.3: Open SMS send dialog
  function handleSendSms(e: CustomEvent<{ text: string }>) {
    smsBody = e.detail.text;
    smsAddress = '';
    smsSending = false;
    smsSent = false;
    showSmsDialog = true;
  }

  function doSendSms() {
    if (!smsAddress.trim() || !smsBody.trim()) return;
    const socket = socketStore.getSocket();
    if (!socket?.connected) return;

    smsSending = true;
    socket.emit('send_sms', {
      address: smsAddress.trim(),
      body: smsBody.trim(),
    });

    smsSent = true;
    smsSending = false;
    setTimeout(() => { showSmsDialog = false; }, 1500);
  }

  function closeSmsDialog() {
    showSmsDialog = false;
  }
</script>

<div class="h-full flex flex-col">
  <!-- Page header + tabs -->
  <div class="px-6 pt-6 pb-0">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Hub Partage</h1>
    <p class="text-sm text-gray-500 mt-1">Partagez texte, fichiers et identifiants entre tous vos appareils du reseau.</p>

    <!-- Tabs -->
    <div class="flex gap-1 mt-4 border-b border-gray-200 dark:border-gray-700">
      <button
        on:click={() => activeTab = 'partage'}
        class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px
          {activeTab === 'partage'
            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-white dark:bg-gray-900'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Partage
      </button>
      <button
        on:click={() => activeTab = 'vault'}
        class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px
          {activeTab === 'vault'
            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-white dark:bg-gray-900'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Coffre-fort
      </button>
    </div>
  </div>

  <!-- Tab content -->
  {#if activeTab === 'partage'}
    <div class="flex-1 px-6 pb-6 pt-4 min-h-0 flex flex-col gap-4">
      <!-- Clipboard section (~40%) -->
      <div class="card flex flex-col overflow-hidden" style="flex: 2 1 0%">
        <TextSync />
      </div>

      <!-- File drop section (~60%) -->
      <div class="card flex flex-col overflow-hidden" style="flex: 3 1 0%">
        <FileDropZone />
      </div>
    </div>
  {:else}
    <div class="flex-1 px-6 pb-6 pt-4 min-h-0">
      <div class="card flex flex-col overflow-hidden h-full">
        <PasswordVault
          on:pasteToTextarea={handlePasteToTextarea}
          on:sendSms={handleSendSms}
        />
      </div>
    </div>
  {/if}
</div>

<!-- SMS Send Dialog -->
{#if showSmsDialog}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={closeSmsDialog} role="dialog">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl" on:click|stopPropagation role="document">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Envoyer par SMS</h3>

      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">Numero de telephone</label>
          <input
            type="tel"
            bind:value={smsAddress}
            placeholder="+33612345678"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
              text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            on:keydown={(e) => e.key === 'Enter' && doSendSms()}
          />
        </div>

        <div>
          <label class="text-xs text-gray-500 mb-1 block">Message</label>
          <textarea
            bind:value={smsBody}
            rows="3"
            class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
              text-sm font-mono text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          ></textarea>
        </div>

        {#if smsSent}
          <div class="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            SMS envoye !
          </div>
        {:else}
          <div class="flex gap-2 justify-end">
            <button
              on:click={closeSmsDialog}
              class="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              on:click={doSendSms}
              disabled={!smsAddress.trim() || !smsBody.trim() || smsSending}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                {smsAddress.trim() && smsBody.trim() && !smsSending
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}"
            >
              Envoyer
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
