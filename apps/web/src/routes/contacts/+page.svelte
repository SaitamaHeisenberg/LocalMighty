<script lang="ts">
  import { onMount } from 'svelte';
  import { contactsStore, type Contact } from '$lib/stores/contacts';
  import { socketStore } from '$lib/stores/socket';
  import { phoneStatusStore } from '$lib/stores/status';

  let searchQuery = '';

  // Modal state
  let showModal = false;
  let selectedContact: Contact | null = null;
  let selectedPhone = '';
  let message = '';
  let sending = false;
  let sendSuccess = false;

  // Subscribe to contacts store
  $: contacts = $contactsStore;
  $: filteredContacts = searchQuery.trim()
    ? contactsStore.search(searchQuery)
    : contacts;

  // Only show loading if we have no contacts at all (first load)
  $: loading = contacts.length === 0 && !contactsStore.isLoaded();

  onMount(async () => {
    // Load contacts (returns immediately if cached, fetches in background)
    await contactsStore.load();
  });

  function openSmsModal(contact: Contact, phone?: string) {
    selectedContact = contact;
    selectedPhone = phone || contact.phoneNumbers[0] || '';
    message = '';
    sendSuccess = false;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    selectedContact = null;
    message = '';
    sending = false;
    sendSuccess = false;
  }

  async function sendSms() {
    if (!message.trim() || !selectedPhone) return;

    sending = true;
    const socket = socketStore.getSocket();

    if (socket) {
      socket.emit('send_sms', {
        address: selectedPhone,
        body: message.trim(),
      });

      sendSuccess = true;
      sending = false;
      message = '';

      // Close after 1.5s
      setTimeout(() => {
        closeModal();
      }, 1500);
    } else {
      sending = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      sendSms();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  }

</script>

<svelte:window on:keydown={showModal ? handleKeydown : undefined} />

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-lg font-semibold">Contacts</h2>
      <span class="text-sm text-gray-500">{contacts.length} contacts</span>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Rechercher un contact..."
        class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
               bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
               focus:ring-primary-500 dark:text-white"
      />
    </div>
  </div>

  <!-- Contact List -->
  <div class="flex-1 overflow-y-auto">
    {#if loading && contacts.length === 0}
      <div class="flex items-center justify-center h-32">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    {:else if filteredContacts.length === 0}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {#if searchQuery}
          <p>Aucun contact trouve pour "{searchQuery}"</p>
        {:else}
          <p>Aucun contact</p>
          <p class="text-sm">Connectez votre telephone pour synchroniser</p>
        {/if}
      </div>
    {:else}
      {#each filteredContacts as contact (contact.id)}
        <button
          on:click={() => openSmsModal(contact)}
          class="w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span class="text-primary-600 dark:text-primary-400 font-medium text-lg">
                {contact.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 dark:text-white">
                {contact.name}
              </p>
              <p class="text-sm text-primary-500 mt-0.5">
                {contact.phoneNumbers[0] || ''}
                {#if contact.phoneNumbers.length > 1}
                  <span class="text-gray-400">+{contact.phoneNumbers.length - 1}</span>
                {/if}
              </p>
            </div>

            <div class="p-2 text-primary-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</div>

<!-- SMS Modal -->
{#if showModal && selectedContact}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/50"
      on:click={closeModal}
    ></button>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <span class="text-primary-600 dark:text-primary-400 font-medium text-lg">
            {selectedContact.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900 dark:text-white">{selectedContact.name}</h3>
          <p class="text-sm text-gray-500">{selectedPhone}</p>
        </div>
        <button
          on:click={closeModal}
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-4">
        {#if sendSuccess}
          <div class="flex flex-col items-center justify-center py-8">
            <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="text-lg font-medium text-gray-900 dark:text-white">Message envoye !</p>
          </div>
        {:else}
          <!-- Phone selector if multiple numbers -->
          {#if selectedContact.phoneNumbers.length > 1}
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Numero
              </label>
              <select
                bind:value={selectedPhone}
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
                       focus:ring-primary-500 dark:text-white"
              >
                {#each selectedContact.phoneNumbers as phone}
                  <option value={phone}>{phone}</option>
                {/each}
              </select>
            </div>
          {/if}

          <!-- Message input -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              bind:value={message}
              placeholder="Tapez votre message..."
              rows="4"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
                     focus:ring-primary-500 dark:text-white resize-none"
            ></textarea>
            <p class="text-xs text-gray-400 mt-1">Ctrl + Entree pour envoyer</p>
          </div>

          <!-- Phone status warning -->
          {#if !$phoneStatusStore.connected}
            <div class="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
              Telephone non connecte
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer -->
      {#if !sendSuccess}
        <div class="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            on:click={closeModal}
            class="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600
                   text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
                   transition-colors"
          >
            Annuler
          </button>
          <button
            on:click={sendSms}
            disabled={!message.trim() || sending}
            class="flex-1 py-2 px-4 rounded-lg bg-primary-500 text-white
                   hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
          >
            {#if sending}
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Envoi...
            {:else}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Envoyer
            {/if}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
