<script lang="ts">
	import type { PageData } from './$types';
	import type { AliasConfig, DestinationAddress, DomainConfig, Tag } from '$lib/types.js';
	import { DropdownMenu } from 'bits-ui';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import QuickCreateForm from '$lib/components/QuickCreateForm.svelte';
	import AliasListRow from '$lib/components/AliasListRow.svelte';
	import CreateDomainDialog from '$lib/components/CreateDomainDialog.svelte';
	import EditDomainDialog from '$lib/components/EditDomainDialog.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';

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

	function setSort(field: SortField) {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			// Name sorts A→Z by default, activity/recency sorts highest first
			sortDir = field === 'name' ? 'asc' : 'desc';
		}
	}

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

	// ─── Sort/filter config ───────────────────────────────────────────────────
	const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'active', label: 'Active' },
		{ value: 'disabled', label: 'Disabled' },
		{ value: 'auto', label: 'Auto' },
		{ value: 'unused', label: 'Unused' }
	];

	const SORT_OPTIONS: { field: SortField; label: string }[] = [
		{ field: 'name', label: 'Name' },
		{ field: 'created', label: 'Created' },
		{ field: 'lastUsed', label: 'Last used' },
		{ field: 'forwarded', label: 'Forwarded' }
	];
</script>

<svelte:head>
	<title>MailPal</title>
</svelte:head>

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
	/>

	<main id="main-content" class="flex-1 overflow-y-scroll" aria-label="Aliases">
		<div class="max-w-4xl mx-auto px-8 py-8 space-y-8">

			<QuickCreateForm
				{domains}
				{defaultDomain}
				onCreated={addAlias}
				onAddDomain={() => (showAddDomain = true)}
			/>

			<section aria-labelledby="list-heading">

				<!-- Heading + count -->
				<div class="flex items-baseline gap-3 mb-4">
					<h2 id="list-heading" class="text-xl font-bold text-app-text">
						{selectedDomain ?? 'All addresses'}
					</h2>
					<span class="text-sm text-app-muted" aria-live="polite" aria-atomic="true">
						{visibleAliases.length}{visibleAliases.length !== baseAliases.length ? ` of ${baseAliases.length}` : ''}
					</span>
				</div>

				<!-- ── Filter + sort toolbar ─────────────────────────────────── -->
				<div class="flex items-center justify-between gap-3 mb-4 flex-wrap">

					<!-- Left: filter dropdowns -->
					<div class="flex items-center gap-2">

						<!-- Status dropdown -->
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors outline-none
									{statusFilter !== 'all'
										? 'border-app-hover bg-app-hover text-app-text font-medium'
										: 'border-app-border text-app-muted hover:border-app-hover hover:text-app-text'}
									data-[state=open]:border-app-hover data-[state=open]:text-app-text"
							>
								{statusFilter !== 'all' ? STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label : 'Status'}
								<svg class="w-3 h-3 shrink-0 transition-transform duration-150 data-[state=open]:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
								</svg>
							</DropdownMenu.Trigger>

							<DropdownMenu.Portal>
								<DropdownMenu.Content
									sideOffset={6}
									align="start"
									class="z-50 min-w-[11rem] rounded-xl border border-app-border bg-app-surface shadow-xl overflow-hidden p-1"
								>
									<DropdownMenu.RadioGroup
										value={statusFilter}
										onValueChange={(v) => { if (v) statusFilter = v as StatusFilter; }}
									>
										{#each STATUS_OPTIONS as opt (opt.value)}
											{@const active = statusFilter === opt.value}
											<DropdownMenu.RadioItem
												value={opt.value}
												class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none
													data-[highlighted]:bg-app-hover data-[highlighted]:text-app-text transition-colors
													{active ? 'text-app-text' : 'text-app-muted'}"
											>
												<span class="w-3.5 flex items-center justify-center shrink-0">
													{#if active}
														<svg class="w-3 h-3 text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
														</svg>
													{/if}
												</span>
												{opt.label}
												<span class="ml-auto tabular-nums text-xs text-app-muted/60">{statusCounts[opt.value]}</span>
											</DropdownMenu.RadioItem>
										{/each}
									</DropdownMenu.RadioGroup>
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>

						<!-- Tags dropdown (only when tags exist) -->
						{#if tags.length > 0}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger
									class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors outline-none
										{selectedTags.length > 0
											? 'border-app-hover bg-app-hover text-app-text font-medium'
											: 'border-app-border text-app-muted hover:border-app-hover hover:text-app-text'}
										data-[state=open]:border-app-hover data-[state=open]:text-app-text"
								>
									{#if selectedTags.length > 0}
										Tags · {selectedTags.length}
									{:else}
										Tags
									{/if}
									<svg class="w-3 h-3 shrink-0 transition-transform duration-150 data-[state=open]:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
									</svg>
								</DropdownMenu.Trigger>

								<DropdownMenu.Portal>
									<DropdownMenu.Content
										sideOffset={6}
										align="start"
										class="z-50 min-w-[11rem] rounded-xl border border-app-border bg-app-surface shadow-xl overflow-hidden p-1"
									>
										<DropdownMenu.CheckboxGroup bind:value={selectedTags}>
											{#each tags as tag (tag.name)}
												{@const active = selectedTags.includes(tag.name)}
												<DropdownMenu.CheckboxItem
													value={tag.name}
													closeOnSelect={false}
													class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none
														data-[highlighted]:bg-app-hover data-[highlighted]:text-app-text transition-colors
														{active ? 'text-app-text' : 'text-app-muted'}"
												>
													<span class="w-3.5 flex items-center justify-center shrink-0">
														{#if active}
															<svg class="w-3 h-3 text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
															</svg>
														{/if}
													</span>
													<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {tag.color}" aria-hidden="true"></span>
													{tag.name}
												</DropdownMenu.CheckboxItem>
											{/each}
										</DropdownMenu.CheckboxGroup>
									</DropdownMenu.Content>
								</DropdownMenu.Portal>
							</DropdownMenu.Root>
						{/if}

						<!-- Clear filters -->
						{#if hasActiveFilters}
							<button
								type="button"
								onclick={clearFilters}
								class="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-app-muted/60 hover:text-app-muted transition-colors"
								aria-label="Clear all filters"
							>
								<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
								</svg>
								Clear
							</button>
						{/if}
					</div>

					<!-- Right: sort controls -->
					<div class="flex items-center gap-0.5" role="group" aria-label="Sort aliases">
						<span class="text-xs text-app-muted/50 mr-1.5 select-none">Sort</span>
						{#each SORT_OPTIONS as opt (opt.field)}
							{@const active = sortField === opt.field}
							<button
								type="button"
								onclick={() => setSort(opt.field)}
								aria-pressed={active}
								class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors
									{active
										? 'text-app-text font-medium bg-app-hover'
										: 'text-app-muted hover:text-app-text hover:bg-app-hover/50'}"
							>
								{opt.label}
								{#if active}
									<svg
										class="w-3 h-3 shrink-0 transition-transform duration-150 {sortDir === 'asc' ? 'rotate-180' : ''}"
										fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>

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
						{#each visibleAliases as alias (`${alias.domain}/${alias.localPart}`)}
							{@const domainTargetEmail = domains.find((d) => d.domain === alias.domain)?.targetEmail ?? ''}
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
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</main>
</div>

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
