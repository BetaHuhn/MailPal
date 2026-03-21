<script lang="ts">
	import type { Tag } from '$lib/types.js';
	import { DropdownMenu } from 'bits-ui';

	type SortField = 'name' | 'created' | 'lastUsed' | 'forwarded';
	type StatusFilter = 'all' | 'active' | 'disabled' | 'auto' | 'unused';

	let {
		statusFilter = $bindable<StatusFilter>('all'),
		selectedTags = $bindable<string[]>([]),
		sortField = $bindable<SortField>('created'),
		sortDir = $bindable<'asc' | 'desc'>('desc'),
		tags,
		statusCounts,
		selectionMode,
		allVisibleSelected,
		onToggleSelectAll,
		onToggleSelection,
		onShowHelp,
	}: {
		statusFilter?: StatusFilter;
		selectedTags?: string[];
		sortField?: SortField;
		sortDir?: 'asc' | 'desc';
		tags: Tag[];
		statusCounts: Record<StatusFilter, number>;
		selectionMode: boolean;
		allVisibleSelected: boolean;
		onToggleSelectAll: () => void;
		onToggleSelection: () => void;
		onShowHelp: () => void;
	} = $props();

	const hasActiveFilters = $derived(statusFilter !== 'all' || selectedTags.length > 0);

	const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'active', label: 'Active' },
		{ value: 'disabled', label: 'Disabled' },
		{ value: 'auto', label: 'Auto' },
		{ value: 'unused', label: 'Unused' },
	];

	const SORT_OPTIONS: { field: SortField; label: string }[] = [
		{ field: 'name', label: 'Name' },
		{ field: 'created', label: 'Created' },
		{ field: 'lastUsed', label: 'Last used' },
		{ field: 'forwarded', label: 'Forwarded' },
	];

	function setSort(field: SortField) {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDir = field === 'name' ? 'asc' : 'desc';
		}
	}

	function clearFilters() {
		statusFilter = 'all';
		selectedTags = [];
	}
</script>

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
	<div class="flex items-center gap-0.5 ml-auto" role="group" aria-label="Sort aliases">
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

	<span class="w-px h-3.5 bg-app-border shrink-0 mr-2" aria-hidden="true"></span>

	<div class="flex items-center gap-1" role="group" aria-label="Bulk actions">
		<!-- Select-all (appears when selection mode is active) -->
		{#if selectionMode}
			<button
				type="button"
				onclick={onToggleSelectAll}
				class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border
					{allVisibleSelected
						? 'border-app-hover bg-app-hover text-app-text font-medium'
						: 'border-app-border text-app-muted hover:border-app-hover hover:text-app-text'}
					transition-colors"
			>
				{allVisibleSelected ? 'Deselect all' : 'Select all'}
			</button>
		{/if}

		<!-- Select mode toggle -->
		<button
			type="button"
			onclick={onToggleSelection}
			aria-pressed={selectionMode}
			class="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors
				{selectionMode
					? 'border-app-hover bg-app-hover text-app-text font-medium'
					: 'border-app-border text-app-muted hover:border-app-hover hover:text-app-text'}"
		>
			{#if selectionMode}
				<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
				</svg>
				Clear
			{:else}
				<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Select
			{/if}
		</button>
	</div>

	<!-- Shortcuts hint -->
	<button
		type="button"
		onclick={onShowHelp}
		aria-label="Show keyboard shortcuts"
		class="hidden md:flex items-center justify-center w-6 h-6 rounded border border-app-border text-[12px] font-bold text-app-muted/50 hover:text-app-muted hover:border-app-hover transition-colors"
		title="Keyboard shortcuts (?)"
	>?</button>

</div>
