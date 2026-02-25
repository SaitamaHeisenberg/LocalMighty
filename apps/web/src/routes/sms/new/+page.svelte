<script lang="ts">
  import { goto } from '$app/navigation';
  import { socketStore } from '$lib/stores/socket';
  import { phoneStatusStore } from '$lib/stores/status';
  import { contactsStore, type Contact } from '$lib/stores/contacts';
  import { onMount } from 'svelte';

  let phoneNumber = '';
  let contactName = '';
  let message = '';
  let sending = false;
  let error = '';

  // Contact search
  let searchQuery = '';
  let searchResults: Contact[] = [];
  let showSuggestions = false;
  let searchTimeout: ReturnType<typeof setTimeout>;

  onMount(async () => {
    await contactsStore.load();
  });

  function formatPhoneInput(value: string): string {
    // Remove non-digits except +
    return value.replace(/[^\d+]/g, '');
  }

  async function searchContacts(query: string) {
    if (query.length < 2) {
      searchResults = [];
      showSuggestions = false;
      return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      searchResults = await contactsStore.search(query);
      showSuggestions = searchResults.length > 0;
    }, 200);
  }

  function selectContact(contact: Contact) {
    if (contact.phoneNumbers.length > 0) {
      phoneNumber = contact.phoneNumbers[0];
      contactName = contact.name;
    }
    searchQuery = contact.name;
    showSuggestions = false;
  }

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    searchQuery = value;
    contactName = '';
    searchContacts(value);
  }

  function handleSearchBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  }

  async function sendMessage() {
    if (!phoneNumber.trim() || !message.trim()) {
      error = 'Entrez un numéro et un message';
      return;
    }

    if (!$phoneStatusStore.connected) {
      error = 'Téléphone non connecté';
      return;
    }

    sending = true;
    error = '';

    const socket = socketStore.getSocket();
    if (socket) {
      socket.emit('send_sms', {
        address: phoneNumber.trim(),
        body: message.trim(),
      });

      // Wait a bit then go back
      setTimeout(() => {
        goto('/sms');
      }, 500);
    } else {
      error = 'Connexion au serveur perdue';
      sending = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      sendMessage();
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
    <a href="/sms" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </a>
    <h2 class="text-lg font-semibold">Nouveau message</h2>
  </div>

  <!-- Form -->
  <div class="flex-1 p-4 space-y-4">
    <!-- Contact Search -->
    <div class="relative">
      <label for="contact" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Destinataire
      </label>
      <input
        id="contact"
        type="text"
        value={searchQuery}
        on:input={handleSearchInput}
        on:focus={() => searchQuery.length >= 2 && (showSuggestions = searchResults.length > 0)}
        on:blur={handleSearchBlur}
        placeholder="Rechercher un contact ou entrer un numéro..."
        class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600
               bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
               focus:ring-primary-500 dark:text-white"
      />

      <!-- Contact Suggestions -->
      {#if showSuggestions}
        <div class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {#each searchResults as contact}
            <button
              type="button"
              on:click={() => selectContact(contact)}
              class="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-primary-600 dark:text-primary-400 font-medium">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div class="min-w-0">
                <p class="font-medium text-gray-900 dark:text-white truncate">{contact.name}</p>
                <p class="text-sm text-gray-500 truncate">{contact.phoneNumbers[0] || ''}</p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Phone Number -->
    <div>
      <label for="phone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Numéro de téléphone
        {#if contactName}
          <span class="text-primary-500 ml-1">({contactName})</span>
        {/if}
      </label>
      <input
        id="phone"
        type="tel"
        bind:value={phoneNumber}
        on:input={(e) => { phoneNumber = formatPhoneInput(e.currentTarget.value); contactName = ''; }}
        placeholder="+225 07 XX XX XX XX"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600
               bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
               focus:ring-primary-500 dark:text-white text-lg"
      />
    </div>

    <!-- Message -->
    <div>
      <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Message
      </label>
      <textarea
        id="message"
        bind:value={message}
        on:keydown={handleKeydown}
        placeholder="Tapez votre message..."
        rows="5"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600
               bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
               focus:ring-primary-500 dark:text-white resize-none"
      ></textarea>
      <p class="text-xs text-gray-400 mt-1">Ctrl + Entrée pour envoyer</p>
    </div>

    <!-- Error -->
    {#if error}
      <div class="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {error}
      </div>
    {/if}

    <!-- Phone Status Warning -->
    {#if !$phoneStatusStore.connected}
      <div class="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
        Téléphone non connecté. Le message sera envoyé quand le téléphone se reconnectera.
      </div>
    {/if}
  </div>

  <!-- Send Button -->
  <div class="p-4 border-t border-gray-200 dark:border-gray-800">
    <button
      on:click={sendMessage}
      disabled={!phoneNumber.trim() || !message.trim() || sending}
      class="w-full py-3 bg-primary-500 text-white rounded-xl font-medium
             hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
             transition-colors flex items-center justify-center gap-2"
    >
      {#if sending}
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Envoi en cours...
      {:else}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        Envoyer
      {/if}
    </button>
  </div>
</div>
