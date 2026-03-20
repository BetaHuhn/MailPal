<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog } from 'bits-ui';

	let {
		open,
		title,
		subtitle = '',
		onClose,
		children
	}: {
		open: boolean;
		title: string;
		subtitle?: string;
		onClose: () => void;
		children: Snippet;
	} = $props();
</script>

<Dialog.Root {open} onOpenChange={(v) => { if (!v) onClose(); }}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl border border-app-border bg-app-surface shadow-2xl w-full max-w-xl text-app-text focus:outline-none"
		>
			<div class="flex items-center justify-between px-6 py-4 border-b border-app-border">
				<div>
					<Dialog.Title class="font-semibold text-app-text">{title}</Dialog.Title>
					{#if subtitle}
						<p class="text-xs text-app-muted mt-0.5 font-mono">{subtitle}</p>
					{/if}
				</div>
				<Dialog.Close
					class="p-1.5 text-app-muted hover:text-app-text hover:bg-app-hover rounded-lg transition-colors"
					aria-label="Close dialog"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</Dialog.Close>
			</div>

			{@render children()}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
