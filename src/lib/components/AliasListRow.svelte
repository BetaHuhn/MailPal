<script lang="ts">
	import type { AliasConfig, DestinationAddress, DomainConfig, Tag } from '$lib/types.js';
	import { AlertDialog, Tooltip } from 'bits-ui';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import CopyButton from './CopyButton.svelte';
	import DestinationSelect from './DestinationSelect.svelte';
  import ColorPicker from './ColorPicker.svelte';

	const SWATCHES = [
		'#D86464', '#D89E64', '#D8D864', '#9ED864', '#64D864',
		'#64D89E', '#64D8D8', '#649ED8', '#6464D8', '#9E64D8', '#D864D8', '#D8649E',
	];

	let {
		alias,
		tags,
		destinations,
		domainTargetEmail,
		showDomain,
		color,
		onToggle,
		onTagClick,
		onAliasUpdated,
		onDeleted,
		onTagCreated
	}: {
		alias: AliasConfig;
		tags: Tag[];
		destinations: DestinationAddress[];
		domainTargetEmail: string;
		showDomain: boolean;
		color: string;
		onToggle: () => Promise<void>;
		onTagClick: (name: string) => void;
		onAliasUpdated: (alias: AliasConfig) => void;
		onDeleted: (alias: AliasConfig) => void;
		onTagCreated: (tag: Tag) => void;
	} = $props();

	let toggling = $state(false);
	let expanded = $state(false);

	// Editable state (synced from alias prop)
	let editTargetEmail = $state(alias.targetEmail ?? '');
	let editNote = $state(alias.note ?? '');
	let editTags = $state<string[]>(alias.tags ?? []);
	let saving = $state(false);
	let saveError = $state('');
	let deleting = $state(false);

	// New tag inline form
	let showNewTagForm = $state(false);
	let newTagName = $state('');
	let newTagColor = $state('#6464D8');
	let creatingTag = $state(false);
	let newTagError = $state('');

	const fullAddress = $derived(`${alias.localPart}@${alias.domain}`);

	const aliasTags = $derived(
		(alias.tags ?? [])
			.map((n) => tags.find((t) => t.name === n))
			.filter((t): t is Tag => t !== undefined)
	);

	// Dirty detection — compare local edit state against the current alias prop
	const dirty = $derived(
		editNote.trim() !== (alias.note ?? '').trim() ||
		(editTargetEmail || null) !== alias.targetEmail ||
		editTags.length !== (alias.tags?.length ?? 0) ||
		editTags.some((t) => !(alias.tags ?? []).includes(t)) ||
		(alias.tags ?? []).some((t) => !editTags.includes(t))
	);

	// Sync local edit state when alias prop changes (e.g. after a save)
	$effect(() => {
		editTargetEmail = alias.targetEmail ?? '';
		editNote = alias.note ?? '';
		editTags = [...(alias.tags ?? [])];
	});

	async function handleToggle() {
		toggling = true;
		try {
			await onToggle();
		} finally {
			toggling = false;
		}
	}

	function toggleExpand() {
		expanded = !expanded;
		if (!expanded) {
			saveError = '';
			showNewTagForm = false;
			newTagName = '';
			newTagError = '';
		}
	}

	function toggleTagOnAlias(name: string) {
		if (editTags.includes(name)) {
			editTags = editTags.filter((t) => t !== name);
		} else {
			editTags = [...editTags, name];
		}
	}

	async function saveChanges() {
		saving = true;
		saveError = '';
		try {
			const res = await fetch(`/api/domains/${alias.domain}/aliases/${alias.localPart}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetEmail: editTargetEmail || null,
					note: editNote.trim() || null,
					tags: editTags
				})
			});
			if (res.ok) {
				onAliasUpdated(await res.json());
			} else {
				const body = await res.json();
				saveError = body.error ?? 'Failed to save';
			}
		} catch {
			saveError = 'Network error';
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		deleting = true;
		try {
			const res = await fetch(`/api/domains/${alias.domain}/aliases/${alias.localPart}`, {
				method: 'DELETE'
			});
			if (res.ok) onDeleted(alias);
		} finally {
			deleting = false;
		}
	}

	async function handleCreateTag(e: Event) {
		e.preventDefault();
		if (!newTagName.trim()) return;
		creatingTag = true;
		newTagError = '';
		try {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newTagName.trim(), color: newTagColor })
			});
			const body = await res.json();
			if (res.ok) {
				onTagCreated(body);
				editTags = [...editTags, body.name];
				newTagName = '';
				newTagColor = '#6464D8';
				showNewTagForm = false;
			} else {
				newTagError = body.error ?? 'Failed to create tag';
			}
		} catch {
			newTagError = 'Network error';
		} finally {
			creatingTag = false;
		}
	}
</script>

<div
	class="rounded-xl border bg-app-surface transition-colors duration-150
		{expanded
			? 'border-app-hover'
			: 'border-app-border hover:border-app-hover hover:bg-app-hover/40'}"
>
	<!-- ── Collapsed row ─────────────────────────────────────────────────── -->
	<div class="group flex items-center gap-3 px-4 py-3">

		<!-- Address + inline tags + note preview -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-1.5 flex-wrap">
				<span class="font-semibold text-app-text text-sm">{alias.localPart}</span>
				<span class="text-app-muted text-sm shrink-0">@{alias.domain}</span>
				<div class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
					<CopyButton text={fullAddress} />
				</div>
				<!-- Tag pills — same style as domain badge, visible sm+ -->
				{#each aliasTags as tag (tag.name)}
					<button
						type="button"
						onclick={(e) => { e.stopPropagation(); onTagClick(tag.name); }}
						class="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-app-hover text-xs text-app-text/80 shrink-0 hover:brightness-110 transition-colors"
					>
						<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: {tag.color}" aria-hidden="true"></span>
						{tag.name}
					</button>
				{/each}
			</div>
			<!-- Note preview (collapsed only) -->
			{#if !expanded && alias.note}
				<p class="text-xs text-app-muted mt-0.5 truncate">{alias.note}</p>
			{/if}
		</div>

		<!-- Domain badge -->
		{#if showDomain}
			<span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-app-hover text-xs text-app-text/80 shrink-0">
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
					<Tooltip.Content class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md" sideOffset={4}>
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
					<Tooltip.Content class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md" sideOffset={4}>
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
				<span class="hidden sm:block text-[11px] font-bold tracking-widest shrink-0 {alias.enabled ? 'text-app-accent' : 'text-red-400/80'}">
					{alias.enabled ? 'ACTIVE' : 'DISABLED'}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md" sideOffset={4}>
					{alias.enabled ? 'Disable alias' : 'Enable alias'}
					<Tooltip.Arrow class="text-app-border" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>

		<!-- Expand chevron -->
		<Tooltip.Root delayDuration={300}>
			<Tooltip.Trigger
				onclick={toggleExpand}
				aria-expanded={expanded}
				aria-label={expanded ? 'Collapse' : 'Edit alias'}
				class="p-1.5 rounded transition-colors shrink-0
					{expanded
						? 'text-app-accent bg-app-accent/10'
						: 'text-app-muted/50 hover:text-app-muted hover:bg-app-hover'}"
			>
				<svg
					class="w-3.5 h-3.5 transition-transform duration-200 {expanded ? 'rotate-180' : ''}"
					fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md" sideOffset={4}>
					{expanded ? 'Collapse' : 'Edit alias'}
					<Tooltip.Arrow class="text-app-border" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	</div>

	<!-- ── Expanded panel ────────────────────────────────────────────────── -->
	{#if expanded}
		<div
			transition:slide={{ duration: 220, easing: cubicOut }}
			class="overflow-hidden"
		>
			<div class="px-4 pb-5 space-y-5 border-t border-app-border/50">
				<div class="pt-4 space-y-3">

					<!-- Destination override -->
					<div class="space-y-1.5">
						<p class="text-xs font-medium text-app-muted">Forward to</p>
						<DestinationSelect
							{destinations}
							bind:value={editTargetEmail}
							allowEmpty={true}
							emptyLabel="Inherit from domain ({domainTargetEmail})"
							placeholder="Inherit from domain…"
						/>
					</div>

					<!-- Note -->
					<div class="space-y-1.5">
						<label for="row-note-{alias.domain}-{alias.localPart}" class="block text-xs font-medium text-app-muted">
							Note
						</label>
						<input
							id="row-note-{alias.domain}-{alias.localPart}"
							type="text"
							bind:value={editNote}
							placeholder="What's this alias for? e.g. GitHub sign-up"
							class="w-full px-3 py-2 rounded-lg border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-app-accent/60 transition-colors"
						/>
					</div>

					<!-- Tags -->
					<div class="space-y-1.5">
						<p class="text-xs font-medium text-app-muted">Tags</p>
						<div class="flex flex-wrap gap-1.5">
							{#each tags as tag (tag.name)}
								{@const active = editTags.includes(tag.name)}
								<button
									type="button"
									onclick={() => toggleTagOnAlias(tag.name)}
									aria-pressed={active}
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
									style={active
										? `color: ${tag.color}; background-color: ${tag.color}1a; border: 1px solid ${tag.color}55`
										: 'color: var(--color-app-muted); background-color: var(--color-app-hover); border: 1px solid var(--color-app-border)'}
								>
									<span
										class="w-1.5 h-1.5 rounded-full shrink-0 transition-opacity {active ? 'opacity-100' : 'opacity-50'}"
										style="background-color: {tag.color}"
										aria-hidden="true"
									></span>
									{tag.name}
									{#if active}
										<svg class="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>
							{/each}

							<!-- New tag toggle -->
							{#if !showNewTagForm}
								<button
									type="button"
									onclick={() => (showNewTagForm = true)}
									class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-app-muted border border-dashed border-app-border hover:border-app-hover hover:text-app-text transition-colors"
								>
									<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
									</svg>
									New tag
								</button>
							{/if}
						</div>

						<!-- Inline new tag form -->
						{#if showNewTagForm}
							<form
								onsubmit={handleCreateTag}
								transition:slide={{ duration: 150, easing: cubicOut }}
								class="flex items-center gap-2 p-2.5 rounded-lg border border-app-border bg-app-bg/40"
							>
								<ColorPicker bind:value={newTagColor} />
								<input
									type="text"
									bind:value={newTagName}
									placeholder="Tag name"
									required
									class="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-accent/60 transition-colors"
								/>
								{#if newTagError}
									<span class="text-xs text-red-400 shrink-0">{newTagError}</span>
								{/if}
								<div class="flex gap-1 shrink-0">
									<button
										type="button"
										onclick={() => { showNewTagForm = false; newTagName = ''; newTagError = ''; }}
										class="px-2.5 py-1.5 text-xs text-app-muted hover:text-app-text border border-app-border rounded-md transition-colors"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={creatingTag || !newTagName.trim()}
										class="px-2.5 py-1.5 text-xs font-semibold bg-app-accent text-app-bg rounded-md hover:brightness-110 transition-all disabled:opacity-40"
									>
										{creatingTag ? '…' : 'Add'}
									</button>
								</div>
							</form>
						{/if}
					</div>
				</div>

				<!-- Stats -->
				<div class="grid grid-cols-3 gap-2 pt-1 border-t border-app-border/50">
					<div class="bg-app-hover/60 rounded-lg p-2.5 pt-3">
						<div class="text-[11px] text-app-muted mb-1">Forwarded</div>
						<div class="text-base font-bold text-app-text">{alias.forwardedCount}</div>
					</div>
					<div class="bg-app-hover/60 rounded-lg p-2.5 pt-3">
						<div class="text-[11px] text-app-muted mb-1">Blocked</div>
						<div class="text-base font-bold text-app-text">{alias.blockedCount}</div>
					</div>
					<div class="bg-app-hover/60 rounded-lg p-2.5 pt-3">
						<div class="text-[11px] text-app-muted mb-1">Last used</div>
						<div class="text-xs font-medium text-app-text leading-tight mt-0.5">
							{alias.lastUsedAt ? new Date(alias.lastUsedAt).toLocaleDateString() : '—'}
						</div>
					</div>
				</div>

				<!-- Footer: delete + save -->
				<div class="flex items-center justify-between gap-2">
					<!-- Delete -->
					<AlertDialog.Root>
						<AlertDialog.Trigger
							type="button"
							disabled={deleting}
							class="px-3 py-1.5 text-xs text-red-400/80 hover:text-red-400 border border-red-400/20 hover:border-red-400/50 rounded-lg transition-colors disabled:opacity-40"
						>
							{deleting ? 'Deleting…' : 'Delete alias'}
						</AlertDialog.Trigger>
						<AlertDialog.Portal>
							<AlertDialog.Overlay class="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
							<AlertDialog.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl border border-app-border bg-app-surface shadow-2xl w-full max-w-sm text-app-text p-6 focus:outline-none">
								<AlertDialog.Title class="font-semibold text-app-text mb-1">Delete alias?</AlertDialog.Title>
								<AlertDialog.Description class="text-sm text-app-muted mb-5">
									<span class="font-mono text-app-text">{fullAddress}</span> will be permanently deleted.
								</AlertDialog.Description>
								<div class="flex justify-end gap-2">
									<AlertDialog.Cancel class="px-4 py-2 text-sm text-app-muted hover:text-app-text border border-app-border hover:border-app-hover rounded-lg transition-colors">
										Cancel
									</AlertDialog.Cancel>
									<AlertDialog.Action
										onclick={handleDelete}
										class="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors"
									>
										Delete
									</AlertDialog.Action>
								</div>
							</AlertDialog.Content>
						</AlertDialog.Portal>
					</AlertDialog.Root>

					<!-- Save / error -->
					<div class="flex items-center gap-2">
						{#if saveError}
							<span class="text-xs text-red-400">{saveError}</span>
						{/if}
						{#if dirty}
							<button
								type="button"
								onclick={() => {
									editTargetEmail = alias.targetEmail ?? '';
									editNote = alias.note ?? '';
									editTags = [...(alias.tags ?? [])];
									saveError = '';
								}}
								class="px-3 py-1.5 text-xs text-app-muted hover:text-app-text border border-app-border hover:border-app-hover rounded-lg transition-colors"
							>
								Discard
							</button>
							<button
								type="button"
								onclick={saveChanges}
								disabled={saving}
								aria-busy={saving}
								class="px-3 py-1.5 text-xs font-semibold bg-app-accent text-app-bg rounded-lg hover:brightness-110 transition-all disabled:opacity-40"
							>
								{saving ? 'Saving…' : 'Save changes'}
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
