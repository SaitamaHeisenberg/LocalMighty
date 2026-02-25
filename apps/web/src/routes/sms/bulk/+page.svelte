<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { contactsStore, type Contact } from '$lib/stores/contacts';
  import { socketStore } from '$lib/stores/socket';
  import { phoneStatusStore } from '$lib/stores/status';

  let searchQuery = '';
  let message = '';
  let selectedContacts: Map<string, { contact: Contact; phone: string }> = new Map();
  let sending = false;
  let sendProgress = 0;
  let sendComplete = false;
  let sendResults: { address: string; name: string; success: boolean }[] = [];

  $: contacts = $contactsStore;
  $: filteredContacts = searchQuery.trim()
    ? contactsStore.search(searchQuery)
    : contacts;

  $: selectedCount = selectedContacts.size;
  $: canSend = selectedCount > 0 && message.trim().length > 0 && !sending;

  onMount(async () => {
    await contactsStore.load();
  });

  function toggleContact(contact: Contact) {
    const key = contact.id;
    if (selectedContacts.has(key)) {
      selectedContacts.delete(key);
      selectedContacts = selectedContacts;
    } else {
      selectedContacts.set(key, {
        contact,
        phone: contact.phoneNumbers[0] || ''
      });
      selectedContacts = selectedContacts;
    }
  }

  function isSelected(contact: Contact): boolean {
    return selectedContacts.has(contact.id);
  }

  function selectAll() {
    filteredContacts.forEach(contact => {
      if (contact.phoneNumbers.length > 0) {
        selectedContacts.set(contact.id, {
          contact,
          phone: contact.phoneNumbers[0]
        });
      }
    });
    selectedContacts = selectedContacts;
  }

  function deselectAll() {
    selectedContacts.clear();
    selectedContacts = selectedContacts;
  }

  function updatePhone(contactId: string, phone: string) {
    const entry = selectedContacts.get(contactId);
    if (entry) {
      entry.phone = phone;
      selectedContacts = selectedContacts;
    }
  }

  async function sendBulkSms() {
    if (!canSend) return;

    const socket = socketStore.getSocket();
    if (!socket) return;

    sending = true;
    sendProgress = 0;
    sendResults = [];

    const recipients = Array.from(selectedContacts.values());
    const total = recipients.length;
    const messageBody = message.trim();

    // Send to each recipient with a small delay to avoid flooding
    for (let i = 0; i < recipients.length; i++) {
      const { contact, phone } = recipients[i];

      socket.emit('send_sms', {
        address: phone,
        body: messageBody
      });

      sendResults.push({
        address: phone,
        name: contact.name,
        success: true // Assume success, status updates will come via socket
      });

      sendProgress = Math.round(((i + 1) / total) * 100);

      // Small delay between sends (100ms)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    sending = false;
    sendComplete = true;
  }

  function reset() {
    sendComplete = false;
    sendResults = [];
    sendProgress = 0;
    message = '';
    selectedContacts.clear();
    selectedContacts = selectedContacts;
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200 dark:border-gray-800">
    <div class="flex items-center gap-3 mb-3">
      <a href="/sms" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </a>
      <h2 class="text-lg font-semibold">SMS en masse</h2>
      <span class="ml-auto text-sm text-primary-500 font-medium">
        {selectedCount} contact{selectedCount > 1 ? 's' : ''} selectionne{selectedCount > 1 ? 's' : ''}
      </span>
    </div>

    {#if !sendComplete}
      <!-- Search -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Rechercher des contacts..."
          class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
                 focus:ring-primary-500 dark:text-white"
        />
      </div>

      <!-- Quick actions -->
      <div class="flex gap-2 mt-3">
        <button
          on:click={selectAll}
          class="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Tout selectionner
        </button>
        <button
          on:click={deselectAll}
          class="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Tout deselectionner
        </button>
      </div>
    {/if}
  </div>

  {#if sendComplete}
    <!-- Send Results -->
    <div class="flex-1 p-4 overflow-y-auto">
      <div class="flex flex-col items-center justify-center py-8">
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2">Messages envoyes !</h3>
        <p class="text-gray-500 mb-6">{sendResults.length} SMS envoye{sendResults.length > 1 ? 's' : ''}</p>

        <div class="w-full max-w-md space-y-2 mb-6">
          {#each sendResults as result}
            <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-medium">{result.name}</p>
                <p class="text-sm text-gray-500">{result.address}</p>
              </div>
            </div>
          {/each}
        </div>

        <div class="flex gap-3">
          <button
            on:click={reset}
            class="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
          >
            Nouveau SMS en masse
          </button>
          <a
            href="/sms"
            class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Retour aux SMS
          </a>
        </div>
      </div>
    </div>
  {:else}
    <!-- Contact Selection -->
    <div class="flex-1 overflow-y-auto">
      {#if filteredContacts.length === 0}
        <div class="flex flex-col items-center justify-center h-32 text-gray-500">
          <p>Aucun contact trouve</p>
        </div>
      {:else}
        {#each filteredContacts as contact (contact.id)}
          {#if contact.phoneNumbers.length > 0}
            <button
              on:click={() => toggleContact(contact)}
              class="w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <!-- Checkbox -->
                <div class="flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center
                            {isSelected(contact) ? 'bg-primary-500 border-primary-500' : 'border-gray-300 dark:border-gray-600'}">
                  {#if isSelected(contact)}
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  {/if}
                </div>

                <!-- Avatar -->
                <div class="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <span class="text-primary-600 dark:text-primary-400 font-medium">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                  <p class="text-sm text-gray-500">{contact.phoneNumbers[0]}</p>
                </div>

                <!-- Phone selector for multiple numbers -->
                {#if isSelected(contact) && contact.phoneNumbers.length > 1}
                  <select
                    on:click|stopPropagation
                    on:change={(e) => updatePhone(contact.id, e.currentTarget.value)}
                    class="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    {#each contact.phoneNumbers as phone}
                      <option value={phone}>{phone}</option>
                    {/each}
                  </select>
                {/if}
              </div>
            </button>
          {/if}
        {/each}
      {/if}
    </div>

    <!-- Message Composer -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {#if !$phoneStatusStore.connected}
        <div class="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
          Telephone non connecte - les SMS seront envoyes des la reconnexion
        </div>
      {/if}

      {#if sending}
        <div class="mb-3">
          <div class="flex justify-between text-sm mb-1">
            <span>Envoi en cours...</span>
            <span>{sendProgress}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style="width: {sendProgress}%"
            ></div>
          </div>
        </div>
      {/if}

      <div class="flex gap-3">
        <textarea
          bind:value={message}
          placeholder="Tapez votre message..."
          rows="2"
          disabled={sending}
          class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2
                 focus:ring-primary-500 dark:text-white resize-none disabled:opacity-50"
        ></textarea>
        <button
          on:click={sendBulkSms}
          disabled={!canSend}
          class="px-6 py-2 rounded-lg bg-primary-500 text-white
                 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors flex items-center gap-2"
        >
          {#if sending}
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {:else}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          {/if}
          Envoyer
        </button>
      </div>

      <p class="text-xs text-gray-400 mt-2">
        {message.length} caractere{message.length > 1 ? 's' : ''}
        {#if selectedCount > 0}
          - sera envoye a {selectedCount} contact{selectedCount > 1 ? 's' : ''}
        {/if}
      </p>
    </div>
  {/if}
</div>
