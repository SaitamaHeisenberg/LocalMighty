<script lang="ts" generics="T">
  import { onMount, tick } from 'svelte';

  export let items: T[] = [];
  export let itemHeight = 72;
  export let overscan = 5;

  let container: HTMLDivElement;
  let scrollTop = 0;
  let containerHeight = 0;

  $: totalHeight = items.length * itemHeight;
  $: startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  $: endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
  $: visibleItems = items.slice(startIndex, endIndex).map((item, i) => ({
    item,
    index: startIndex + i,
  }));
  $: offsetY = startIndex * itemHeight;

  function handleScroll() {
    scrollTop = container.scrollTop;
  }

  onMount(() => {
    containerHeight = container.clientHeight;
    const resizeObserver = new ResizeObserver(() => {
      containerHeight = container.clientHeight;
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  });
</script>

<div
  bind:this={container}
  on:scroll={handleScroll}
  class="h-full overflow-y-auto"
>
  <div style="height: {totalHeight}px; position: relative;">
    <div style="transform: translateY({offsetY}px);">
      {#each visibleItems as { item, index } (index)}
        <div style="height: {itemHeight}px;">
          <slot {item} {index} />
        </div>
      {/each}
    </div>
  </div>
</div>
