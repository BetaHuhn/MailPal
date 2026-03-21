<script lang="ts">
	import type { AliasConfig, DestinationAddress, DomainConfig, LogEntry, Tag } from '$lib/types.js';
	import { AlertDialog, Tooltip } from 'bits-ui';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import CopyButton from './CopyButton.svelte';
	import DestinationSelect from './DestinationSelect.svelte';
  import ColorPicker from './ColorPicker.svelte';

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
		onTagCreated,
		selected = false,
		selectionMode = false,
		onSelect,
		focused = false,
		expandTrigger = 0
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
		selected?: boolean;
		selectionMode?: boolean;
		onSelect?: (v: boolean) => void;
		focused?: boolean;
		expandTrigger?: number;
	} = $props();

	let toggling = $state(false);
	let expanded = $state(false);

	// Programmatic expand from keyboard shortcut
	$effect(() => {
		if (expandTrigger > 0) expanded = true;
		else expanded = false;
	});

	// Editable state (synced from alias prop)
	let editTargetEmail = $state(alias.targetEmail ?? '');
	let editNote = $state(alias.note ?? '');
	let editTags = $state<string[]>(alias.tags ?? []);
	let saving = $state(false);

	// Expiry state
	type ExpiryMode = 'none' | 'date' | 'count';
	let expiryMode = $state<ExpiryMode>(
		alias.expiresAt ? 'date' : alias.maxForwards != null ? 'count' : 'none'
	);
	let editExpiresAt = $state<number | null>(alias.expiresAt ?? null);
	let editMaxForwards = $state<number | null>(alias.maxForwards ?? null);

	function tsToDateInput(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toISOString().slice(0, 10);
	}
	function dateInputToTs(s: string): number | null {
		if (!s) return null;
		const [y, m, d] = s.split('-').map(Number);
		return new Date(y, m - 1, d).getTime(); // local midnight avoids UTC offset shifting the date
	}
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

	const expiryBadge = $derived.by((): { label: string; urgency: 'normal' | 'warn' | 'critical' } | null => {
		if (alias.expiresAt) {
			const now = Date.now();
			if (now >= alias.expiresAt) return { label: 'Expired', urgency: 'critical' };
			// Compare calendar days in local time to avoid timezone-shifted "today" labels
			const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
			const expStart = new Date(alias.expiresAt); expStart.setHours(0, 0, 0, 0);
			const days = Math.round((expStart.getTime() - todayStart.getTime()) / 86_400_000);
			if (days === 0) return { label: 'Expires today', urgency: 'critical' };
			if (days === 1) return { label: 'Expires tomorrow', urgency: 'warn' };
			if (days <= 7) return { label: `Expires in ${days}d`, urgency: 'warn' };
			return { label: `Exp. ${new Date(alias.expiresAt).toLocaleDateString()}`, urgency: 'normal' };
		}
		if (alias.maxForwards != null) {
			const left = alias.maxForwards - alias.forwardedCount;
			if (left <= 0) return { label: 'Limit reached', urgency: 'critical' };
			if (left <= 5) return { label: `${left} fwd left`, urgency: 'warn' };
			return { label: `${alias.forwardedCount}/${alias.maxForwards} fwd`, urgency: 'normal' };
		}
		return null;
	});

	// Dirty detection — compare local edit state against the current alias prop
	const dirty = $derived(
		editNote.trim() !== (alias.note ?? '').trim() ||
		(editTargetEmail || null) !== alias.targetEmail ||
		editTags.length !== (alias.tags?.length ?? 0) ||
		editTags.some((t) => !(alias.tags ?? []).includes(t)) ||
		(alias.tags ?? []).some((t) => !editTags.includes(t)) ||
		(expiryMode === 'date' ? editExpiresAt : null) !== (alias.expiresAt ?? null) ||
		(expiryMode === 'count' ? editMaxForwards : null) !== (alias.maxForwards ?? null)
	);

	// Sync local edit state when alias prop changes (e.g. after a save)
	$effect(() => {
		editTargetEmail = alias.targetEmail ?? '';
		editNote = alias.note ?? '';
		editTags = [...(alias.tags ?? [])];
		editExpiresAt = alias.expiresAt ?? null;
		editMaxForwards = alias.maxForwards ?? null;
		expiryMode = alias.expiresAt ? 'date' : alias.maxForwards != null ? 'count' : 'none';
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
					tags: editTags,
					expiresAt: expiryMode === 'date' ? editExpiresAt : null,
					maxForwards: expiryMode === 'count' ? editMaxForwards : null
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

	// ── Activity tab ────────────────────────────────────────────────────────
	let activeTab = $state<'settings' | 'activity'>('settings');
	let activityLog = $state<LogEntry[]>([]);
	let logLoading = $state(false);
	let logError = $state('');
	let logLoaded = $state(false);

	async function loadLog() {
		if (logLoading) return;
		logLoading = true;
		logError = '';
		try {
			const res = await fetch(`/api/domains/${alias.domain}/aliases/${alias.localPart}/log`);
			const data = await res.json();
			if (res.ok) { activityLog = data; logLoaded = true; }
			else logError = data.error ?? 'Failed to load';
		} catch {
			logError = 'Network error';
		} finally {
			logLoading = false;
		}
	}

	function switchTab(tab: 'settings' | 'activity') {
		activeTab = tab;
		if (tab === 'activity' && !logLoaded) loadLog();
	}

	// Reset tab when collapsing
	$effect(() => {
		if (!expanded) {
			activeTab = 'settings';
			logLoaded = false;
			activityLog = [];
		}
	});

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
		{focused
			? 'border-app-accent/50 ring-1 ring-app-accent/20'
			: expanded
			? 'border-app-hover'
			: 'border-app-border hover:border-app-hover hover:bg-app-hover/40'}"
>
	<!-- ── Collapsed row ─────────────────────────────────────────────────── -->
	<div
		class="group flex items-center gap-3 px-4 py-3 {selectionMode ? 'cursor-pointer' : ''}"
		onclick={(e) => {
			if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return;
			onSelect?.(!selected);
		}}
	>

		<!-- Selection checkbox (only in selection mode) -->
		{#if selectionMode}
			<button
				type="button"
				onclick={(e) => { e.stopPropagation(); onSelect?.(!selected); }}
				aria-label="Select {fullAddress}"
				aria-pressed={selected}
				class="shrink-0 w-3.5 h-3.5 rounded border transition-all
					{selected
						? 'bg-app-accent border-app-accent flex items-center justify-center'
						: 'border-app-border bg-app-hover hover:border-app-accent/50'}"
			>
				{#if selected}
					<svg class="w-2 h-2 text-app-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M5 13l4 4L19 7" />
					</svg>
				{/if}
			</button>
		{/if}

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

		<!-- Expiry badge -->
		{#if expiryBadge && !expanded}
			<span
				class="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs shrink-0
					{expiryBadge.urgency === 'critical'
						? 'bg-red-400/10 text-red-400'
						: expiryBadge.urgency === 'warn'
						? 'bg-amber-400/10 text-amber-400'
						: 'bg-app-hover text-app-muted'}"
			>
				<svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke-width="2" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 3" />
				</svg>
				{expiryBadge.label}
			</span>
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
			<!-- Tab bar -->
			<div class="flex border-t border-app-border/50">
				{#each (['settings', 'activity'] as const) as tab}
					<button
						type="button"
						onclick={() => switchTab(tab)}
						class="px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2
							{activeTab === tab
								? 'border-app-accent text-app-accent'
								: 'border-transparent text-app-muted hover:text-app-text'}"
					>
						{tab === 'settings' ? 'Settings' : 'Activity'}
					</button>
				{/each}
			</div>

			{#if activeTab === 'settings'}
			<div class="px-4 pb-5 space-y-5">
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

				<!-- Auto-disable -->
				<div class="space-y-1.5">
					<p class="text-xs font-medium text-app-muted">Auto-disable</p>
					<div class="flex gap-1.5 flex-wrap">
						{#each (['none', 'date', 'count'] as const) as mode (mode)}
							{@const label = mode === 'none' ? 'Never' : mode === 'date' ? 'After date' : 'After N emails'}
							<button
								type="button"
								onclick={() => { expiryMode = mode; }}
								class="px-2.5 py-1 rounded-md text-xs transition-colors
									{expiryMode === mode
										? 'bg-app-accent text-app-bg font-medium'
										: 'bg-app-hover text-app-muted hover:text-app-text border border-app-border'}"
							>
								{label}
							</button>
						{/each}
					</div>
					{#if expiryMode === 'date'}
						<div class="flex items-center gap-2 flex-wrap">
							<input
								type="date"
								value={tsToDateInput(editExpiresAt)}
								onchange={(e) => (editExpiresAt = dateInputToTs(e.currentTarget.value))}
								min={new Date().toISOString().slice(0, 10)}
								class="px-3 py-1.5 rounded-lg border border-app-border bg-app-hover text-sm text-app-text focus:outline-none focus:border-app-accent/60 transition-colors [color-scheme:dark]"
							/>
							{#if expiryBadge}
								<span class="text-xs {expiryBadge.urgency === 'critical' ? 'text-red-400' : expiryBadge.urgency === 'warn' ? 'text-amber-400' : 'text-app-muted'}">{expiryBadge.label}</span>
							{/if}
						</div>
					{:else if expiryMode === 'count'}
						<div class="flex items-center gap-2 flex-wrap">
							<input
								type="number"
								value={editMaxForwards ?? ''}
								oninput={(e) => { const v = parseInt(e.currentTarget.value, 10); editMaxForwards = isNaN(v) || v < 1 ? null : v; }}
								min="1"
								placeholder="e.g. 10"
								class="w-24 px-3 py-1.5 rounded-lg border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-app-accent/60 transition-colors"
							/>
							<span class="text-xs text-app-muted">emails, then disable</span>
							{#if expiryBadge}
								<span class="text-xs {expiryBadge.urgency === 'critical' ? 'text-red-400' : expiryBadge.urgency === 'warn' ? 'text-amber-400' : 'text-app-muted'}">{expiryBadge.label}</span>
							{/if}
						</div>
					{/if}
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
							{deleting ? 'Deleting…' : 'Delete Address'}
						</AlertDialog.Trigger>
						<AlertDialog.Portal>
							<AlertDialog.Overlay class="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
							<AlertDialog.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl border border-app-border bg-app-surface shadow-2xl w-full max-w-sm text-app-text p-6 focus:outline-none">
								<AlertDialog.Title class="font-semibold text-app-text mb-1">Delete Address?</AlertDialog.Title>
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
			{:else}
			<!-- ── Activity tab ──────────────────────────────────────────────── -->
			<div class="px-4 py-4">
				{#if logLoading}
					<div class="flex items-center justify-center py-10 text-app-muted">
						<svg class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
						</svg>
						<span class="text-xs">Loading…</span>
					</div>
				{:else if logError}
					<p class="text-xs text-red-400 text-center py-6">{logError}</p>
				{:else if activityLog.length === 0}
					<div class="text-center py-10">
						<p class="text-xs text-app-muted">No activity recorded yet.</p>
						<p class="text-xs text-app-muted/50 mt-1">Events appear after emails are received.</p>
					</div>
				{:else}
					<ol class="space-y-1" aria-label="Recent activity">
						{#each activityLog as entry, i (i)}
							<li class="flex items-start gap-1.5 py-2 {i !== activityLog.length - 1 ? 'border-b border-app-border/40' : ''}">
								<span
									class="mt-[0.3rem] w-1.5 h-1.5 rounded-full shrink-0 {entry.action === 'forwarded' ? 'bg-green-400' : 'bg-red-400'}"
									aria-label={entry.action}
								></span>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-xs font-medium {entry.action === 'forwarded' ? 'text-green-400' : 'text-red-400'}">
											{entry.action}
										</span>
										<span class="text-xs text-app-muted truncate" title={entry.from}>from {entry.from}</span>
									</div>
									<p class="text-xs text-app-muted/60 truncate" title={entry.to}>→ {entry.to}</p>
								</div>
								<time
									datetime={new Date(entry.at).toISOString()}
									title={new Date(entry.at).toLocaleString()}
									class="text-[11px] text-app-muted/50 shrink-0 tabular-nums"
								>
									{relativeTime(entry.at)}
								</time>
							</li>
						{/each}
					</ol>
					<!-- <p class="text-[11px] text-app-muted/40 text-center mt-3">Last {activityLog.length} event{activityLog.length === 1 ? '' : 's'}</p> -->
				{/if}
			</div>
			{/if}
		</div>
	{/if}
</div>
