<script lang="ts">
  import { ChevronRight } from "lucide-svelte";
  import { cn } from "../lib/utils";

  type Link = { title: string; href: string; id: string };
  type Group = { label: string; slug: string; links: Link[] };

  let {
    nav,
    current,
    base = "",
  }: { nav: Group[]; current: string; base?: string } = $props();

  const b = base.replace(/\/$/, "");
  const full = (href: string) => `${b}${href}`;

  // Open the group containing the current page; remember user toggles.
  let open = $state<Record<string, boolean>>(
    Object.fromEntries(
      nav.map((g) => [g.slug, true]),
    ),
  );
</script>

<nav aria-label="Docs" class="space-y-6 text-sm">
  {#each nav as group}
    {#if group.links.length}
      <div>
        <button
          type="button"
          class="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 text-left font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
          onclick={() => (open[group.slug] = !open[group.slug])}
          aria-expanded={open[group.slug]}
        >
          {group.label}
          <ChevronRight class={cn("h-4 w-4 text-muted-foreground transition-transform", open[group.slug] && "rotate-90")} />
        </button>
        {#if open[group.slug]}
          <ul class="ml-2 border-l">
            {#each group.links as link}
              <li>
                <a
                  href={full(link.href)}
                  aria-current={current === link.href ? "page" : undefined}
                  class={cn(
                    "-ml-px block border-l py-1.5 pl-4 pr-2 text-muted-foreground transition hover:border-foreground/40 hover:text-foreground",
                    current === link.href && "border-primary font-medium text-foreground",
                  )}
                >
                  {link.title}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  {/each}
</nav>
