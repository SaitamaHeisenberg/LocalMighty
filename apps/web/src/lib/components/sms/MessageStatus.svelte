<script lang="ts">
  import type { SmsDeliveryStatus } from '$lib/stores/smsStatus';

  export let status: SmsDeliveryStatus | undefined = undefined;
  export let type: 'inbox' | 'sent' | 'draft' | 'outbox' = 'sent';
  export let light = false;

  // For received messages, don't show status
  $: isOutgoing = type === 'sent' || type === 'outbox';

  // Determine display status
  $: displayStatus = isOutgoing ? (status || (type === 'sent' ? 'sent' : 'sending')) : null;
</script>

{#if displayStatus}
  <span class="inline-flex items-center ml-1" title={displayStatus === 'sending' ? 'Envoi en cours' : displayStatus === 'sent' ? 'Envoye' : displayStatus === 'delivered' ? 'Livre' : displayStatus === 'failed' ? 'Echec' : ''}>
    {#if displayStatus === 'sending'}
      <!-- Clock icon for sending -->
      <svg class="w-3.5 h-3.5 {light ? 'text-white/60' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    {:else if displayStatus === 'sent'}
      <!-- Single check for sent -->
      <svg class="w-4 h-4 {light ? 'text-white/70' : 'text-gray-400'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    {:else if displayStatus === 'delivered'}
      <!-- Double check for delivered -->
      <svg class="w-4 h-4 {light ? 'text-white/90' : 'text-blue-500'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2 13l4 4L16 7" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 13l4 4L22 7" />
      </svg>
    {:else if displayStatus === 'failed'}
      <!-- X for failed -->
      <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    {/if}
  </span>
{/if}
