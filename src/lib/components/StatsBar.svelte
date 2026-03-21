<script lang="ts">
	import type { AliasConfig } from '$lib/types.js';

	let { aliases }: { aliases: AliasConfig[] } = $props();

	const totalAliases = $derived(aliases.length);
	const activeAliases = $derived(aliases.filter((a) => a.enabled).length);
	const totalForwarded = $derived(aliases.reduce((s, a) => s + a.forwardedCount, 0));
	const totalBlocked = $derived(aliases.reduce((s, a) => s + a.blockedCount, 0));

	function fmt(n: number): string {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 10_000) return `${Math.round(n / 1000)}k`;
		if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
		return n.toString();
	}

	const stats = $derived([
		{ label: 'Total aliases', value: fmt(totalAliases), title: totalAliases.toString() },
		{ label: 'Active', value: fmt(activeAliases), title: activeAliases.toString() },
		{ label: 'Forwarded', value: fmt(totalForwarded), title: totalForwarded.toString() },
		{ label: 'Blocked', value: fmt(totalBlocked), title: totalBlocked.toString() },
	]);
</script>

<dl
	class="grid grid-cols-4 divide-x divide-app-border rounded-xl border border-app-border bg-app-surface overflow-hidden"
	aria-label="Overview statistics"
>
	{#each stats as stat (stat.label)}
		<div class="px-4 py-3 flex flex-col gap-0.5">
			<dt class="text-[11px] text-app-muted uppercase tracking-wide leading-none">{stat.label}</dt>
			<dd class="text-lg font-bold text-app-text tabular-nums leading-tight" title={stat.title}>{stat.value}</dd>
		</div>
	{/each}
</dl>
