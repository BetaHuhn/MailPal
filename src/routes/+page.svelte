<script lang="ts">
	import type { PageData } from './$types';
	import type { AliasConfig, DestinationAddress, DomainConfig, Tag } from '$lib/types.js';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import QuickCreateForm from '$lib/components/QuickCreateForm.svelte';
	import AliasListRow from '$lib/components/AliasListRow.svelte';
	import CreateDomainDialog from '$lib/components/CreateDomainDialog.svelte';
	import EditDomainDialog from '$lib/components/EditDomainDialog.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import AliasListToolbar from '$lib/components/AliasListToolbar.svelte';
	import BulkActionBar from '$lib/components/BulkActionBar.svelte';
	import KeyboardShortcutsDialog from '$lib/components/KeyboardShortcutsDialog.svelte';
	import OnboardingFlow from '$lib/components/OnboardingFlow.svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';

	let { data }: { data: PageData } = $props();

	// ─── Local state ──────────────────────────────────────────────────────────
	let domains = $state<DomainConfig[]>(data.domains);
	let aliases = $state<AliasConfig[]>(data.allAliases);
	let destinations = $state<DestinationAddress[]>(data.destinations);
	let tags = $state<Tag[]>(data.tags);
	let selectedDomain = $state<string | null>(null);
	let selectedTags = $state<string[]>([]);
	let search = $state('');

	// Sort & filter
	type SortField = 'name' | 'created' | 'lastUsed' | 'forwarded';
	type StatusFilter = 'all' | 'active' | 'disabled' | 'auto' | 'unused';
	let sortField = $state<SortField>('created');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let statusFilter = $state<StatusFilter>('all');

	// Dialogs
	let showAddDomain = $state(false);
	let showSettings = $state(false);
	let editingDomain = $state<DomainConfig | null>(null);

	// ─── Domain colors ────────────────────────────────────────────────────────
	const PALETTE = [
		'#ef4444', '#a855f7', '#f59e0b', '#6366f1', '#22c55e',
		'#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
	];
	function domainColor(d: string): string {
		const domain = domains.find((x) => x.domain === d);
		if (domain?.color) return domain.color;
		const idx = domains.findIndex((x) => x.domain === d);
		return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
	}

	// ─── Derived ──────────────────────────────────────────────────────────────
	const aliasCounts = $derived(
		Object.fromEntries(domains.map((d) => [d.domain, aliases.filter((a) => a.domain === d.domain).length]))
	);

	// Base set: domain + tag + search filters applied (but NOT status filter)
	// Used both for status counts and as the input to visibleAliases
	const baseAliases = $derived(
		(selectedDomain ? aliases.filter((a) => a.domain === selectedDomain) : aliases)
			.filter((a) => selectedTags.length === 0 || selectedTags.every((t) => a.tags?.includes(t)))
			.filter((a) => {
				if (!search.trim()) return true;
				const q = search.toLowerCase();
				return (
					a.localPart.toLowerCase().includes(q) ||
					a.domain.toLowerCase().includes(q) ||
					(a.note?.toLowerCase().includes(q) ?? false) ||
					(a.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
				);
			})
	);

	// Counts per status (based on base set, so numbers reflect the current context)
	const statusCounts = $derived({
		all: baseAliases.length,
		active: baseAliases.filter((a) => a.enabled).length,
		disabled: baseAliases.filter((a) => !a.enabled).length,
		auto: baseAliases.filter((a) => a.autoCreated).length,
		unused: baseAliases.filter((a) => !a.lastUsedAt && a.forwardedCount === 0 && a.blockedCount === 0).length
	});

	const visibleAliases = $derived(
		baseAliases
			.filter((a) => {
				if (statusFilter === 'active') return a.enabled;
				if (statusFilter === 'disabled') return !a.enabled;
				if (statusFilter === 'auto') return a.autoCreated;
				if (statusFilter === 'unused') return !a.lastUsedAt && a.forwardedCount === 0 && a.blockedCount === 0;
				return true;
			})
			.toSorted((a, b) => {
				let cmp = 0;
				if (sortField === 'name') cmp = `${a.localPart}@${a.domain}`.localeCompare(`${b.localPart}@${b.domain}`);
				else if (sortField === 'created') cmp = a.createdAt - b.createdAt;
				else if (sortField === 'lastUsed') cmp = (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0);
				else if (sortField === 'forwarded') cmp = a.forwardedCount - b.forwardedCount;
				return sortDir === 'asc' ? cmp : -cmp;
			})
	);

	const defaultDomain = $derived(selectedDomain ?? domains[0]?.domain ?? '');

	const hasActiveFilters = $derived(statusFilter !== 'all' || selectedTags.length > 0);

	function clearFilters() {
		statusFilter = 'all';
		selectedTags = [];
	}

	// ─── Domain mutations ─────────────────────────────────────────────────────
	function handleDomainCreated(domain: DomainConfig) {
		domains = [...domains, domain];
	}

	function handleDomainUpdated(updated: DomainConfig) {
		domains = domains.map((d) => (d.domain === updated.domain ? updated : d));
		editingDomain = null;
	}

	function handleDomainDeleted(domainName: string) {
		domains = domains.filter((d) => d.domain !== domainName);
		aliases = aliases.filter((a) => a.domain !== domainName);
		if (selectedDomain === domainName) selectedDomain = null;
		editingDomain = null;
	}

	// ─── Alias mutations ──────────────────────────────────────────────────────
	function addAlias(alias: AliasConfig) {
		aliases = [alias, ...aliases];
	}

	function updateAlias(updated: AliasConfig) {
		aliases = aliases.map((a) =>
			a.localPart === updated.localPart && a.domain === updated.domain ? updated : a
		);
	}

	function removeAlias(alias: AliasConfig) {
		aliases = aliases.filter((a) => !(a.domain === alias.domain && a.localPart === alias.localPart));
	}

	async function toggleAlias(alias: AliasConfig): Promise<void> {
		const res = await fetch(`/api/domains/${alias.domain}/aliases/${alias.localPart}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ enabled: !alias.enabled })
		});
		if (res.ok) updateAlias(await res.json());
	}

	// ─── Destination mutations ─────────────────────────────────────────────────
	function handleDestinationAdded(dest: DestinationAddress) {
		destinations = [...destinations, dest];
	}

	function handleDestinationRemoved(email: string) {
		destinations = destinations.filter((d) => d.email !== email);
	}

	// ─── Tag mutations ─────────────────────────────────────────────────────────
	function handleTagCreated(tag: Tag) {
		tags = [...tags, tag];
	}

	function handleTagDeleted(name: string) {
		tags = tags.filter((t) => t.name !== name);
		aliases = aliases.map((a) =>
			a.tags?.includes(name) ? { ...a, tags: a.tags.filter((t) => t !== name) } : a
		);
		selectedTags = selectedTags.filter((t) => t !== name);
	}

	function handleTagUpdated(tag: Tag) {
		tags = tags.map((t) => (t.name === tag.name ? tag : t));
	}

	// ─── Bulk selection ────────────────────────────────────────────────────────
	let selectedKeys = $state<Set<string>>(new Set());
	let forceSelectionMode = $state(false);
	let showShortcutsHelp = $state(false);
	let focusedIdx = $state(-1);
	let expandTriggers = $state<Record<string, number>>({});
	let focusSearchTrigger = $state(0);
	let focusCreateTrigger = $state(0);

	function aliasKey(a: AliasConfig) { return `${a.domain}/${a.localPart}`; }

	const selectionMode = $derived(selectedKeys.size > 0 || forceSelectionMode);
	const selectedAliases = $derived(visibleAliases.filter((a) => selectedKeys.has(aliasKey(a))));
	const allVisibleSelected = $derived(
		visibleAliases.length > 0 && visibleAliases.every((a) => selectedKeys.has(aliasKey(a)))
	);

	function toggleSelect(a: AliasConfig, v: boolean) {
		const key = aliasKey(a);
		const next = new Set(selectedKeys);
		if (v) next.add(key); else next.delete(key);
		selectedKeys = next;
	}

	function toggleSelectAll() {
		if (allVisibleSelected) {
			selectedKeys = new Set();
		} else {
			selectedKeys = new Set(visibleAliases.map(aliasKey));
		}
	}

	function clearSelection() {
		selectedKeys = new Set();
		forceSelectionMode = false;
	}

	// ─── Bulk action helpers ──────────────────────────────────────────────────
	async function bulkSetEnabled(enabled: boolean) {
		const targets = selectedAliases.filter((a) => a.enabled !== enabled);
		const results = await Promise.all(
			targets.map((a) =>
				fetch(`/api/domains/${a.domain}/aliases/${a.localPart}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled })
				}).then((r) => (r.ok ? r.json() : null))
			)
		);
		results.forEach((updated) => { if (updated) updateAlias(updated); });
	}

	async function bulkDelete() {
		const count = selectedAliases.length;
		if (!confirm(`Delete ${count} alias${count === 1 ? '' : 'es'}? This cannot be undone.`)) return;
		await Promise.all(
			selectedAliases.map((a) =>
				fetch(`/api/domains/${a.domain}/aliases/${a.localPart}`, { method: 'DELETE' }).then((r) => {
					if (r.ok) removeAlias(a);
				})
			)
		);
		clearSelection();
		if (focusedIdx >= 0) { focusedIdx = -1; }
	}

	// ─── Keyboard shortcuts ───────────────────────────────────────────────────
	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

		if (inInput) {
			if (e.key === 'Escape') {
				target.blur();
				if (search) search = '';
			}
			return;
		}

		switch (e.key) {
			case '/':
				e.preventDefault();
				focusSearchTrigger++;
				break;
			case 'c':
				e.preventDefault();
				focusCreateTrigger++;
				break;
			case 'j':
				e.preventDefault();
				focusedIdx = Math.min(focusedIdx + 1, visibleAliases.length - 1);
				if (focusedIdx === -1 && visibleAliases.length > 0) focusedIdx = 0;
				break;
			case 'k':
				e.preventDefault();
				if (focusedIdx === -1 && visibleAliases.length > 0) focusedIdx = 0;
				else focusedIdx = Math.max(focusedIdx - 1, 0);
				break;
			case 's':
				if (focusedIdx >= 0 && focusedIdx < visibleAliases.length) {
					const a = visibleAliases[focusedIdx];
					const key = aliasKey(a);

					// if already expanded, collapse; otherwise expand
					if (expandTriggers[key]) {
						expandTriggers[key] = 0;
					} else {
						expandTriggers = { ...expandTriggers, [key]: (expandTriggers[key] ?? 0) + 1 };
					}
				}
				break;
			case 'x':
				if (focusedIdx >= 0 && focusedIdx < visibleAliases.length) {
					const a = visibleAliases[focusedIdx];
					toggleSelect(a, !selectedKeys.has(aliasKey(a)));
				}
				break;
			case 't': {
				const targets = selectedAliases.length > 0
					? selectedAliases
					: focusedIdx >= 0 && focusedIdx < visibleAliases.length ? [visibleAliases[focusedIdx]] : [];
				if (targets.length > 0) {
					e.preventDefault();
					if (selectedAliases.length > 0) {
						// Bulk: enable all if any disabled, otherwise disable all
						const anyDisabled = targets.some((a) => !a.enabled);
						bulkSetEnabled(anyDisabled);
					} else {
						toggleAlias(targets[0]);
					}
				}
				break;
			}
			case 'e': {
				const targets = selectedAliases.length > 0
					? selectedAliases
					: focusedIdx >= 0 && focusedIdx < visibleAliases.length ? [visibleAliases[focusedIdx]] : [];
				if (targets.length > 0) {
					e.preventDefault();
					if (selectedAliases.length > 0) {
						// Bulk: enable all
						bulkSetEnabled(true);
					} else {
						const a = targets[0];
						if (!a.enabled) toggleAlias(a);
					}
				}
				break;
			}
			case 'd': {
				const targets = selectedAliases.length > 0
					? selectedAliases
					: focusedIdx >= 0 && focusedIdx < visibleAliases.length ? [visibleAliases[focusedIdx]] : [];
				if (targets.length > 0) {
					e.preventDefault();
					if (selectedAliases.length > 0) {
						// Bulk: disable all
						bulkSetEnabled(false);
					} else {
						const a = targets[0];
						if (a.enabled) toggleAlias(a);
					}
				}
				break;
			}
			case 'Backspace':
			case 'Delete': {
				const targets = selectedAliases.length > 0
					? selectedAliases
					: focusedIdx >= 0 && focusedIdx < visibleAliases.length ? [visibleAliases[focusedIdx]] : [];
				if (targets.length > 0) {
					e.preventDefault();
					if (selectedAliases.length > 0) {
						bulkDelete();
					} else {
						const a = targets[0];
						if (confirm(`Delete ${a.localPart}@${a.domain}? This cannot be undone.`)) {
							fetch(`/api/domains/${a.domain}/aliases/${a.localPart}`, { method: 'DELETE' })
								.then((r) => { if (r.ok) { removeAlias(a); focusedIdx = Math.min(focusedIdx, visibleAliases.length - 2); } });
						}
					}
				}
				break;
			}
			case 'Escape':
				if (showShortcutsHelp) { showShortcutsHelp = false; break; }
				if (focusedIdx >= 0) { focusedIdx = -1; break; }
				if (selectedKeys.size > 0) { clearSelection(); break; }
				if (search) { search = ''; }
				break;
			case '?':
				showShortcutsHelp = !showShortcutsHelp;
				break;
		}
	}
</script>

<svelte:head>
	<title>MailPal</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if data.demo}
	<DemoBanner />
{/if}

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-app-accent focus:text-app-bg focus:rounded-lg focus:font-semibold focus:text-sm focus:shadow-lg"
>
	Skip to main content
</a>

<OnboardingFlow onboarded={data.onboarded} />

<div class="flex h-screen overflow-hidden bg-app-bg text-app-text">
	<Sidebar
		{domains}
		{aliasCounts}
		totalCount={aliases.length}
		{selectedDomain}
		{search}
		authMode={data.authMode}
		{domainColor}
		onSelectDomain={(d) => (selectedDomain = d)}
		onSearchChange={(v) => (search = v)}
		onAddDomain={() => (showAddDomain = true)}
		onEditDomain={(d) => (editingDomain = d)}
		onOpenSettings={() => (showSettings = true)}
		{focusSearchTrigger}
	/>

	<main id="main-content" class="flex-1 overflow-y-scroll" aria-label="Aliases">
		<div class="max-w-4xl mx-auto px-8 py-8 space-y-8">

			<StatsBar {aliases} />

			<QuickCreateForm
				{domains}
				{defaultDomain}
				onCreated={addAlias}
				onAddDomain={() => (showAddDomain = true)}
				focusTrigger={focusCreateTrigger}
			/>

			<section aria-labelledby="list-heading">

				<!-- Heading + count -->
				<div class="flex items-baseline gap-3 mb-4">
					<h2 id="list-heading" class="text-xl font-bold text-app-text">
						{selectedDomain ?? 'All Addresses'}
					</h2>
					<span class="text-sm text-app-muted" aria-live="polite" aria-atomic="true">
						{visibleAliases.length}{visibleAliases.length !== baseAliases.length ? ` of ${baseAliases.length}` : ''}
					</span>
				</div>

				<AliasListToolbar
					bind:statusFilter
					bind:selectedTags
					bind:sortField
					bind:sortDir
					{tags}
					{statusCounts}
					{selectionMode}
					{allVisibleSelected}
					onToggleSelectAll={toggleSelectAll}
					onToggleSelection={() => { if (selectionMode) clearSelection(); else forceSelectionMode = true; }}
					onShowHelp={() => (showShortcutsHelp = true)}
				/>

				<!-- ── Alias list ─────────────────────────────────────────────── -->
				{#if visibleAliases.length === 0}
					<div class="text-center py-16 rounded-xl border border-app-border bg-app-surface/40" role="status">
						<svg class="w-10 h-10 mx-auto text-app-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						<p class="text-sm text-app-muted">
							{hasActiveFilters || search ? 'No aliases match the current filters.' : 'No aliases yet. Create one above.'}
						</p>
						{#if hasActiveFilters}
							<button
								type="button"
								onclick={clearFilters}
								class="mt-3 text-xs text-app-accent hover:underline underline-offset-2"
							>
								Clear filters
							</button>
						{/if}
					</div>
				{:else}
					<ul class="space-y-1.5" aria-label="Alias list">
						{#each visibleAliases as alias, i (`${alias.domain}/${alias.localPart}`)}
							{@const domainTargetEmail = domains.find((d) => d.domain === alias.domain)?.targetEmail ?? ''}
							{@const aKey = aliasKey(alias)}
							<li>
								<AliasListRow
									{alias}
									{tags}
									{destinations}
									{domainTargetEmail}
									showDomain={!selectedDomain}
									color={domainColor(alias.domain)}
									onToggle={() => toggleAlias(alias)}
									onTagClick={(name) => {
										selectedTags = selectedTags.includes(name)
											? selectedTags.filter((t) => t !== name)
											: [...selectedTags, name];
									}}
									onAliasUpdated={updateAlias}
									onDeleted={removeAlias}
									onTagCreated={handleTagCreated}
									selected={selectedKeys.has(aKey)}
									{selectionMode}
									onSelect={(v) => toggleSelect(alias, v)}
									focused={focusedIdx === i}
									expandTrigger={expandTriggers[aKey] ?? 0}
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</main>
</div>

<BulkActionBar
	selectedCount={selectedKeys.size}
	onEnable={() => bulkSetEnabled(true)}
	onDisable={() => bulkSetEnabled(false)}
	onDelete={bulkDelete}
	onClear={clearSelection}
/>

<KeyboardShortcutsDialog
	show={showShortcutsHelp}
	onClose={() => (showShortcutsHelp = false)}
/>

<!-- ── Dialogs ────────────────────────────────────────────────────────────── -->
<CreateDomainDialog
	open={showAddDomain}
	{destinations}
	onClose={() => (showAddDomain = false)}
	onCreated={handleDomainCreated}
/>

<SettingsDialog
	open={showSettings}
	{destinations}
	{tags}
	onClose={() => (showSettings = false)}
	onAdded={handleDestinationAdded}
	onRemoved={handleDestinationRemoved}
	onTagCreated={handleTagCreated}
	onTagDeleted={handleTagDeleted}
	onTagUpdated={handleTagUpdated}
/>

{#if editingDomain}
	<EditDomainDialog
		open={true}
		domain={editingDomain}
		{destinations}
		onClose={() => (editingDomain = null)}
		onUpdated={handleDomainUpdated}
		onDeleted={handleDomainDeleted}
	/>
{/if}
