<script lang="ts">
	import type { AliasConfig } from '$lib/types.js';
	import { Tooltip } from 'bits-ui';
	import CopyButton from './CopyButton.svelte';

	let {
		alias,
		showDomain,
		color,
		onEdit,
		onToggle
	}: {
		alias: AliasConfig;
		showDomain: boolean;
		color: string;
		onEdit: () => void;
		onToggle: () => Promise<void>;
	} = $props();

	let toggling = $state(false);

	const fullAddress = $derived(`${alias.localPart}@${alias.domain}`);

	async function handleToggle() {
		toggling = true;
		try {
			await onToggle();
		} finally {
			toggling = false;
		}
	}
</script>

<div
	class="group flex items-center gap-4 px-4 py-3 rounded-xl border border-app-border bg-app-surface
		hover:border-app-hover hover:bg-app-hover/50 transition-all"
>
	<!-- Address -->
	<div class="flex-1 flex items-center gap-1.5 min-w-0">
		<span class="font-semibold text-app-text text-sm truncate">{alias.localPart}</span>
		<span class="text-app-muted text-sm shrink-0">@{alias.domain}</span>
		<div class="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
			<CopyButton text={fullAddress} />
		</div>
	</div>

	<!-- Domain badge -->
	{#if showDomain}
		<span
			class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-app-hover text-xs text-app-text/80 shrink-0"
		>
			<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: {color}" aria-hidden="true"></span>
			{alias.domain}
		</span>
	{/if}

	<!-- Auto badge -->
	{#if alias.autoCreated}
		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger
				class="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-app-hover text-xs text-app-muted shrink-0 cursor-default"
				aria-label="Auto-created alias"
			>
				Auto
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
					sideOffset={4}
				>
					Automatically created on first use (wildcard mode)
					<Tooltip.Arrow class="text-app-border" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	{/if}

	<!-- Stats -->
	<div class="hidden md:flex items-center gap-2 shrink-0">
		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger
				class="flex items-center gap-1 text-xs text-app-muted cursor-default"
				aria-label="{alias.blockedCount} emails blocked"
			>
				<svg class="w-3.5 h-3.5 text-red-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<circle cx="12" cy="12" r="10" stroke-width="2" />
					<path stroke-linecap="round" stroke-width="2" d="M4.93 4.93l14.14 14.14" />
				</svg>
				{alias.blockedCount}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
					sideOffset={4}
				>
					{alias.blockedCount} blocked
					<Tooltip.Arrow class="text-app-border" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>

		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger
				class="flex items-center gap-1 text-xs text-app-muted cursor-default"
				aria-label="{alias.forwardedCount} emails forwarded"
			>
				<svg class="w-3.5 h-3.5 text-green-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
				</svg>
				{alias.forwardedCount}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
					sideOffset={4}
				>
					{alias.forwardedCount} forwarded
					<Tooltip.Arrow class="text-app-border" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	</div>

	<!-- Toggle -->
	<Tooltip.Root delayDuration={300}>
		<Tooltip.Trigger
			onclick={handleToggle}
			disabled={toggling}
			aria-pressed={alias.enabled}
			class="flex items-center justify-end gap-2 min-w-24 group/toggle disabled:opacity-60"
		>
			<div
				class="w-3 h-3 rounded-full shrink-0 transition-all group-hover/toggle:scale-110 group-hover/toggle:brightness-125
					{alias.enabled ? 'bg-app-accent' : 'bg-red-400/60'}"
			></div>
			<span
				class="hidden sm:block text-[11px] font-bold tracking-widest shrink-0
					{alias.enabled ? 'text-app-accent' : 'text-red-400/80'}"
			>
				{alias.enabled ? 'ACTIVE' : 'DISABLED'}
			</span>
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
				sideOffset={4}
			>
				{alias.enabled ? 'Disable alias' : 'Enable alias'}
				<Tooltip.Arrow class="text-app-border" />
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>

	<!-- Edit -->
	<Tooltip.Root delayDuration={300}>
		<Tooltip.Trigger
			onclick={onEdit}
			class="p-1.5 text-app-muted/50 hover:text-app-muted transition-colors shrink-0 rounded hover:bg-app-hover"
		>
			<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
			<span class="sr-only">Edit {fullAddress}</span>
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
				sideOffset={4}
			>
				Edit alias
				<Tooltip.Arrow class="text-app-border" />
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</div>
