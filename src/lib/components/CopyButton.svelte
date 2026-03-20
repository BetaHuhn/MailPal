<script lang="ts">
	import { Tooltip } from 'bits-ui';

	let { text }: { text: string } = $props();

	let copied = $state(false);

	async function copy(e: MouseEvent) {
		e.stopPropagation();
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<Tooltip.Root delayDuration={300}>
	<Tooltip.Trigger
		onclick={copy}
		class="p-1 text-app-muted hover:text-app-text rounded transition-colors"
		aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
	>
		{#if copied}
			<svg class="w-3 h-3 text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
			</svg>
		{:else}
			<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
			</svg>
		{/if}
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
			sideOffset={4}
		>
			{copied ? 'Copied!' : 'Copy to clipboard'}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
