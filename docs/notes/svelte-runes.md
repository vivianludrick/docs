---
title: Svelte 5 runes
description: The handful of runes I actually use.
order: 1
tags: [svelte]
---

## `$state`

```svelte
<script lang="ts">
  let count = $state(0);
</script>

<button onclick={() => count++}>{count}</button>
```

## `$derived`

```ts
const doubled = $derived(count * 2);
const expensive = $derived.by(() => {
  // multi-line computation
  return count ** 2;
});
```

## `$props`

```svelte
<script lang="ts">
  let { title, children }: { title: string; children?: Snippet } = $props();
</script>
```

## `$effect`

Runs after the DOM updates. Return a function to clean up.

```ts
$effect(() => {
  const id = setInterval(() => count++, 1000);
  return () => clearInterval(id);
});
```
