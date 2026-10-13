<script lang="ts">
  import type { Snippet } from "svelte";
  import { Info, AlertTriangle, Lightbulb, XCircle } from "lucide-svelte";
  import { cn } from "../lib/utils";

  type Kind = "note" | "tip" | "warning" | "danger";
  let {
    type = "note",
    title,
    children,
  }: { type?: Kind; title?: string; children: Snippet } = $props();

  const meta: Record<Kind, { icon: any; label: string; cls: string }> = {
    note: { icon: Info, label: "Note", cls: "border-sky-500/40 bg-sky-500/5 [&_svg]:text-sky-500" },
    tip: { icon: Lightbulb, label: "Tip", cls: "border-emerald-500/40 bg-emerald-500/5 [&_svg]:text-emerald-500" },
    warning: { icon: AlertTriangle, label: "Warning", cls: "border-amber-500/40 bg-amber-500/5 [&_svg]:text-amber-500" },
    danger: { icon: XCircle, label: "Danger", cls: "border-destructive/40 bg-destructive/5 [&_svg]:text-destructive" },
  };
  const m = $derived(meta[type]);
</script>

<aside class={cn("my-6 rounded-lg border px-4 py-3 text-sm", m.cls)}>
  <div class="mb-1 flex items-center gap-2 font-semibold">
    <m.icon class="h-4 w-4" />
    {title ?? m.label}
  </div>
  <div class="text-foreground/90 [&>p]:my-1">
    {@render children()}
  </div>
</aside>
