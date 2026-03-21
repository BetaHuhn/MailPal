<script lang="ts">
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		selectedCount,
		onEnable,
		onDisable,
		onDelete,
		onClear,
	}: {
		selectedCount: number;
		onEnable: () => void;
		onDisable: () => void;
		onDelete: () => void;
		onClear: () => void;
	} = $props();
</script>

{#if selectedCount > 0}
	<div
		transition:slide={{ duration: 200, easing: cubicOut, axis: 'y' }}
		class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-2 pl-3 rounded-2xl border border-app-border bg-app-surface shadow-2xl shadow-black/30"
	>
		<span class="text-xs font-medium text-app-muted pr-2 border-r border-app-border tabular-nums">
			{selectedCount} selected
		</span>
		<button
			type="button"
			onclick={onEnable}
			class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-app-accent hover:bg-app-hover transition-colors"
		>
			<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			Enable
			<kbd class="ml-0.5 px-1 py-0.5 rounded border border-app-border/60 bg-app-hover/60 text-[12px] font-mono text-app-muted/70">e</kbd>
		</button>
		<button
			type="button"
			onclick={onDisable}
			class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-app-muted hover:bg-app-hover hover:text-app-text transition-colors"
		>
			<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<circle cx="12" cy="12" r="10" stroke-width="2" />
				<path stroke-linecap="round" stroke-width="2" d="M4.93 4.93l14.14 14.14" />
			</svg>
			Disable
			<kbd class="ml-0.5 px-1 py-0.5 rounded border border-app-border/60 bg-app-hover/60 text-[12px] font-mono text-app-muted/70">d</kbd>
		</button>
		<button
			type="button"
			onclick={onDelete}
			class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors"
		>
			<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
			Delete
			<kbd class="ml-0.5 px-1 py-0.5 rounded border border-red-400/30 bg-red-400/10 text-[12px] font-mono text-red-400/70">⌫</kbd>
		</button>
		<button
			type="button"
			onclick={onClear}
			class="p-1.5 rounded-lg text-app-muted/60 hover:text-app-muted hover:bg-app-hover transition-colors"
			aria-label="Clear selection"
		>
			<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
{/if}
