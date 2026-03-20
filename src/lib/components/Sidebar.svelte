<script lang="ts">
	import type { DomainConfig } from '$lib/types.js';

	let {
		domains,
		aliasCounts,
		totalCount,
		selectedDomain,
		search,
		authMode,
		domainColor,
		onSelectDomain,
		onSearchChange,
		onAddDomain,
		onEditDomain,
		onOpenSettings
	}: {
		domains: DomainConfig[];
		aliasCounts: Record<string, number>;
		totalCount: number;
		selectedDomain: string | null;
		search: string;
		authMode: 'password' | 'cloudflare-access';
		domainColor: (domain: string) => string;
		onSelectDomain: (domain: string | null) => void;
		onSearchChange: (value: string) => void;
		onAddDomain: () => void;
		onEditDomain: (domain: DomainConfig) => void;
		onOpenSettings: () => void;
	} = $props();
</script>

<aside
	class="w-64 shrink-0 flex flex-col bg-app-sidebar border-r border-app-border"
	aria-label="Sidebar"
>
	<!-- Brand -->
	<div class="px-5 py-5 flex items-center gap-3">
		<div
			class="w-8 h-8 rounded-lg bg-app-accent/15 flex items-center justify-center shrink-0"
			aria-hidden="true"
		>
			<svg class="w-4 h-4 text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
				/>
			</svg>
		</div>
		<span class="text-base font-bold tracking-tight text-app-text">MailPal</span>
	</div>

	<!-- Search -->
	<div class="px-3 mb-4">
		<label class="flex items-center gap-2 px-3 py-2 rounded-lg bg-app-surface border border-app-border focus-within:border-app-accent/50 transition-colors cursor-text">
			<svg class="w-3.5 h-3.5 text-app-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				value={search}
				oninput={(e) => onSearchChange(e.currentTarget.value)}
				type="search"
				placeholder="Quick search"
				aria-label="Search aliases"
				class="flex-1 bg-transparent text-sm text-app-text placeholder:text-app-muted outline-none min-w-0"
			/>
		</label>
	</div>

	<!-- Domains section header -->
	<div class="px-4 mb-2 flex items-center justify-between">
		<span class="text-[11px] font-semibold uppercase tracking-widest text-app-muted" id="domains-label">
			Domains
		</span>
		<button
			onclick={onAddDomain}
			aria-label="Add domain"
			class="w-5 h-5 rounded flex items-center justify-center text-app-muted hover:text-app-text hover:bg-app-hover transition-colors text-base leading-none"
		>+</button>
	</div>

	<!-- Domain nav -->
	<nav aria-labelledby="domains-label" class="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
		<!-- All -->
		<div
			class="flex items-center rounded-lg transition-colors
				{!selectedDomain ? 'bg-app-hover' : 'hover:bg-app-hover/60'}"
		>
			<button
				onclick={() => onSelectDomain(null)}
				aria-current={!selectedDomain ? 'true' : undefined}
				class="flex-1 flex items-center gap-2.5 px-3 py-2 text-sm transition-colors rounded-l-lg
					{!selectedDomain ? 'text-app-text font-medium' : 'text-app-muted hover:text-app-text'}"
			>
				<svg class="w-2 h-2 shrink-0 opacity-50" fill="currentColor" viewBox="0 0 8 8" aria-hidden="true">
					<circle cx="4" cy="4" r="4" />
				</svg>
				<span class="flex-1 text-left">All</span>
			</button>
			<span class="pr-3 text-xs text-app-muted min-w-[2rem] text-right shrink-0" aria-label="{totalCount} aliases">
				{totalCount}
			</span>
		</div>

		<!-- Per-domain items -->
		{#each domains as domain (domain.domain)}
			{@const count = aliasCounts[domain.domain] ?? 0}
			{@const active = selectedDomain === domain.domain}
			<div
				class="group/item flex items-center rounded-lg transition-colors
					{active ? 'bg-app-hover' : 'hover:bg-app-hover/60'}"
			>
				<button
					onclick={() => onSelectDomain(domain.domain)}
					aria-current={active ? 'true' : undefined}
					class="flex-1 flex items-center gap-2.5 px-3 py-2 text-sm transition-colors min-w-0 rounded-l-lg
						{active ? 'text-app-text font-medium' : 'text-app-muted hover:text-app-text'}"
				>
					<span
						class="w-2 h-2 rounded-full shrink-0"
						style="background-color: {domainColor(domain.domain)}"
						aria-hidden="true"
					></span>
					<span class="flex-1 text-left truncate">{domain.domain}</span>
				</button>

				<button
					onclick={() => onEditDomain(domain)}
					aria-label="Settings for {domain.domain}"
					class="p-1.5 opacity-0 group-hover/item:opacity-100 text-app-muted hover:text-app-text transition-all shrink-0 rounded"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</button>

				<span
					class="pr-3 text-xs text-app-muted min-w-[2rem] text-right shrink-0"
					aria-label="{count} aliases"
				>
					{count}
				</span>
			</div>
		{/each}

		{#if domains.length === 0}
			<p class="px-3 py-3 text-xs text-app-muted italic">No domains yet</p>
		{/if}
	</nav>

	<!-- Bottom actions -->
	<div class="px-2 py-3 border-t border-app-border flex items-center gap-1">
		<!-- Settings -->
		<button
			onclick={onOpenSettings}
			aria-label="Settings"
			title="Settings"
			class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-app-muted hover:text-app-text hover:bg-app-hover/60 transition-colors"
		>
			<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			Settings
		</button>

		{#if authMode === 'password'}
			<form method="POST" action="/logout" class="ml-auto">
				<button
					class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-app-muted hover:text-app-text hover:bg-app-hover/60 transition-colors"
					aria-label="Logout"
					title="Logout"
				>
					<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
					Logout
				</button>
			</form>
		{/if}
	</div>
</aside>
