<script lang="ts">
  import { templatesStore, type SmsTemplate } from '$lib/services/smsTemplates';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ select: string }>();

  let isOpen = false;
  let showManager = false;
  let newName = '';
  let newBody = '';
  let newCategory = 'Rapide';
  let buttonEl: HTMLButtonElement;
  let dropdownStyle = '';

  $: categories = templatesStore.getCategories($templatesStore);

  function updateDropdownPosition() {
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      dropdownStyle = `position: fixed; bottom: ${window.innerHeight - rect.top + 8}px; left: ${rect.left}px;`;
    }
  }

  function selectTemplate(template: SmsTemplate) {
    dispatch('select', template.body);
    isOpen = false;
  }

  function addTemplate() {
    if (!newName.trim() || !newBody.trim()) return;
    templatesStore.add({
      name: newName.trim(),
      body: newBody.trim(),
      category: newCategory,
    });
    newName = '';
    newBody = '';
  }

  function deleteTemplate(id: string) {
    templatesStore.remove(id);
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.template-dropdown')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="template-dropdown relative">
  <button
    bind:this={buttonEl}
    type="button"
    on:click|stopPropagation={() => { updateDropdownPosition(); isOpen = !isOpen; }}
    class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
    title="Templates rapides"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  </button>

  {#if isOpen}
    <div
      style={dropdownStyle}
      class="w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[9999]"
      on:click|stopPropagation
    >
      {#if showManager}
        <!-- Template Manager -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-sm">Gerer les templates</h3>
            <button on:click={() => showManager = false} class="text-gray-400 hover:text-gray-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            bind:value={newName}
            placeholder="Nom du template"
            class="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 mb-2"
          />
          <textarea
            bind:value={newBody}
            placeholder="Contenu du message"
            rows="2"
            class="w-full px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 mb-2 resize-none"
          ></textarea>
          <div class="flex gap-2">
            <select bind:value={newCategory} class="flex-1 px-2 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600">
              {#each categories as cat}
                <option value={cat}>{cat}</option>
              {/each}
              <option value="Autre">Autre</option>
            </select>
            <button
              on:click={addTemplate}
              disabled={!newName.trim() || !newBody.trim()}
              class="px-3 py-1.5 bg-primary-500 text-white text-sm rounded hover:bg-primary-600 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        </div>

        <div class="max-h-48 overflow-y-auto">
          {#each $templatesStore as template (template.id)}
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{template.name}</p>
                <p class="text-xs text-gray-500 truncate">{template.body}</p>
              </div>
              <button
                on:click={() => deleteTemplate(template.id)}
                class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded ml-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {:else}
        <!-- Template Selector -->
        <div class="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span class="text-xs font-medium text-gray-500 uppercase">Templates</span>
          <button
            on:click={() => showManager = true}
            class="text-xs text-primary-500 hover:text-primary-600"
          >
            Gerer
          </button>
        </div>

        <div class="max-h-64 overflow-y-auto">
          {#each categories as category}
            <div class="px-2 py-1 text-xs font-medium text-gray-400 uppercase bg-gray-50 dark:bg-gray-900">
              {category}
            </div>
            {#each $templatesStore.filter(t => t.category === category) as template (template.id)}
              <button
                on:click={() => selectTemplate(template)}
                class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <p class="text-sm font-medium">{template.name}</p>
                <p class="text-xs text-gray-500 truncate">{template.body}</p>
              </button>
            {/each}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
