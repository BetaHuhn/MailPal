<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let filter = $state<'all' | 'forwarded' | 'blocked'>('all');

	const entries = $derived(
		filter === 'all' ? data.entries : data.entries.filter((e) => e.action === filter)
	);

	const forwardedCount = $derived(data.entries.filter((e) => e.action === 'forwarded').length);
	const blockedCount = $derived(data.entries.filter((e) => e.action === 'blocked').length);

	function relativeTime(at: number): string {
		const diff = Date.now() - at;
		const mins = Math.floor(diff / 60_000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(at).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>Activity — MailPal</title>
</svelte:head>

<div class="min-h-screen bg-app-bg text-app-text">
	<div class="max-w-3xl mx-auto px-6 py-10 space-y-6">

		<!-- Header -->
		<div class="flex items-center gap-4">
			<a
				href="/"
				class="p-1.5 rounded-lg text-app-muted hover:text-app-text hover:bg-app-hover transition-colors"
				aria-label="Back to aliases"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<div>
				<h1 class="text-xl font-bold">Activity</h1>
				<p class="text-sm text-app-muted">Recent email events across all aliases</p>
			</div>
		</div>

		<!-- Summary + filter -->
		<div class="flex items-center gap-2 flex-wrap">
			{#each ([
				{ value: 'all', label: 'All', count: data.entries.length },
				{ value: 'forwarded', label: 'Forwarded', count: forwardedCount },
				{ value: 'blocked', label: 'Blocked', count: blockedCount },
			] as const) as opt}
				<button
					type="button"
					onclick={() => (filter = opt.value)}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors
						{filter === opt.value
							? 'border-app-hover bg-app-hover text-app-text font-medium'
							: 'border-app-border text-app-muted hover:border-app-hover hover:text-app-text'}"
				>
					{#if opt.value === 'forwarded'}
						<span class="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" aria-hidden="true"></span>
					{:else if opt.value === 'blocked'}
						<span class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" aria-hidden="true"></span>
					{/if}
					{opt.label}
					<span class="tabular-nums text-app-muted/60">{opt.count}</span>
				</button>
			{/each}
		</div>

		<!-- Log -->
		{#if entries.length === 0}
			<div class="text-center py-20 rounded-xl border border-app-border bg-app-surface/40">
				<svg class="w-10 h-10 mx-auto text-app-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				<p class="text-sm text-app-muted">No activity yet.</p>
				<p class="text-xs text-app-muted/60 mt-1">Events appear here after emails are received.</p>
			</div>
		{:else}
			<ol class="space-y-1" aria-label="Activity log">
				{#each entries as entry (`${entry.domain}/${entry.localPart}/${entry.at}`)}
					<li class="flex items-start gap-3 px-4 py-3 rounded-xl border border-app-border bg-app-surface hover:border-app-hover transition-colors">
						<!-- Action dot -->
						<span
							class="mt-0.5 w-2 h-2 rounded-full shrink-0 {entry.action === 'forwarded' ? 'bg-green-400' : 'bg-red-400'}"
							aria-label={entry.action}
						></span>

						<!-- Main content -->
						<div class="flex-1 min-w-0 space-y-0.5">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-mono text-sm text-app-text">{entry.localPart}@{entry.domain}</span>
								<span class="text-xs px-1.5 py-0.5 rounded font-medium
									{entry.action === 'forwarded'
										? 'bg-green-400/10 text-green-400'
										: 'bg-red-400/10 text-red-400'}">
									{entry.action}
								</span>
							</div>
							<div class="flex items-center gap-3 text-xs text-app-muted flex-wrap">
								<span class="truncate" title={entry.from}>from {entry.from}</span>
								<span class="shrink-0">→</span>
								<span class="truncate" title={entry.to}>{entry.to}</span>
							</div>
						</div>

						<!-- Timestamp -->
						<time
							datetime={new Date(entry.at).toISOString()}
							title={new Date(entry.at).toLocaleString()}
							class="text-xs text-app-muted/60 shrink-0 tabular-nums"
						>
							{relativeTime(entry.at)}
						</time>
					</li>
				{/each}
			</ol>
			<p class="text-center text-xs text-app-muted/50 pt-2">
				Showing the {entries.length} most recent event{entries.length === 1 ? '' : 's'}
				{#if filter !== 'all'}({filter}){/if}.
				Up to 50 events are stored per alias.
			</p>
		{/if}
	</div>
</div>
