<script lang="ts">
	import type { PageData } from './$types';
	import type { AliasConfig, DestinationAddress, DomainConfig } from '$lib/types.js';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import QuickCreateForm from '$lib/components/QuickCreateForm.svelte';
	import AliasListRow from '$lib/components/AliasListRow.svelte';
	import CreateDomainDialog from '$lib/components/CreateDomainDialog.svelte';
	import EditDomainDialog from '$lib/components/EditDomainDialog.svelte';
	import EditAliasDialog from '$lib/components/EditAliasDialog.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';

	let { data }: { data: PageData } = $props();

	// ─── Local state ──────────────────────────────────────────────────────────
	let domains = $state<DomainConfig[]>(data.domains);
	let aliases = $state<AliasConfig[]>(data.allAliases);
	let destinations = $state<DestinationAddress[]>(data.destinations);
	let selectedDomain = $state<string | null>(null);
	let search = $state('');

	// Dialogs
	let showAddDomain = $state(false);
	let showSettings = $state(false);
	let editingDomain = $state<DomainConfig | null>(null);
	let editingAlias = $state<AliasConfig | null>(null);

	// ─── Domain colors ────────────────────────────────────────────────────────
	const PALETTE = [
		'#ef4444', '#a855f7', '#f59e0b', '#6366f1', '#22c55e',
		'#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
	];
	function domainColor(d: string): string {
		const idx = domains.findIndex((x) => x.domain === d);
		return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
	}

	// ─── Derived ──────────────────────────────────────────────────────────────
	const aliasCounts = $derived(
		Object.fromEntries(domains.map((d) => [d.domain, aliases.filter((a) => a.domain === d.domain).length]))
	);

	const visibleAliases = $derived(
		(selectedDomain ? aliases.filter((a) => a.domain === selectedDomain) : aliases).filter((a) => {
			if (!search.trim()) return true;
			const q = search.toLowerCase();
			return a.localPart.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q);
		})
	);

	const defaultDomain = $derived(selectedDomain ?? domains[0]?.domain ?? '');

	// ─── Domain mutations ─────────────────────────────────────────────────────
	function handleDomainCreated(domain: DomainConfig) {
		domains = [...domains, domain];
		// Dialog stays open to show the Cloudflare setup guide; it closes itself via onClose
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
		if (editingAlias?.localPart === alias.localPart && editingAlias.domain === alias.domain) {
			editingAlias = null;
		}
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

	<main id="main-content" class="flex-1 overflow-y-auto" aria-label="Aliases">
		<div class="max-w-4xl mx-auto px-8 py-8 space-y-8">

			<QuickCreateForm
				{domains}
				{defaultDomain}
				onCreated={addAlias}
				onAddDomain={() => (showAddDomain = true)}
			/>

			<section aria-labelledby="list-heading">
				<div class="flex items-baseline gap-3 mb-4">
					<h2 id="list-heading" class="text-xl font-bold text-app-text">
						{selectedDomain ?? 'All addresses'}
					</h2>
					<span class="text-sm text-app-muted" aria-live="polite" aria-atomic="true">
						{visibleAliases.length}
					</span>
				</div>

				{#if visibleAliases.length === 0}
					<div
						class="text-center py-16 rounded-xl border border-app-border bg-app-surface/40"
						role="status"
					>
						<svg
							class="w-10 h-10 mx-auto text-app-muted/40 mb-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
						<p class="text-sm text-app-muted">
							{search ? 'No aliases match your search.' : 'No aliases yet. Create one above.'}
						</p>
					</div>
				{:else}
					<ul class="space-y-1.5" aria-label="Alias list">
						{#each visibleAliases as alias (`${alias.domain}/${alias.localPart}`)}
							<li>
								<AliasListRow
									{alias}
									showDomain={!selectedDomain}
									color={domainColor(alias.domain)}
									onEdit={() => (editingAlias = alias)}
									onToggle={() => toggleAlias(alias)}
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
	onClose={() => (showSettings = false)}
	onAdded={handleDestinationAdded}
	onRemoved={handleDestinationRemoved}
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

{#if editingAlias}
	{@const domainConfig = domains.find((d) => d.domain === editingAlias?.domain)}
	{#if domainConfig}
		<EditAliasDialog
			open={true}
			alias={editingAlias}
			domain={domainConfig}
			{destinations}
			onClose={() => (editingAlias = null)}
			onUpdated={updateAlias}
			onDeleted={removeAlias}
		/>
	{/if}
{/if}
