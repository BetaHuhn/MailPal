<script lang="ts">
	import type { AliasConfig, DomainConfig } from '$lib/types.js';
	import { generateSlug } from '$lib/sluggen.js';
	import { Select, Tooltip, Popover } from 'bits-ui';

	let {
		domains,
		defaultDomain,
		onCreated,
		onAddDomain,
		focusTrigger = 0
	}: {
		domains: DomainConfig[];
		defaultDomain: string;
		onCreated: (alias: AliasConfig) => void;
		onAddDomain: () => void;
		focusTrigger?: number;
	} = $props();

	let localPartInputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		focusTrigger;
		if (focusTrigger && localPartInputEl) localPartInputEl.focus();
	});

	let newLocalPart = $state('');
	let newDomain = $state(defaultDomain);
	let creating = $state(false);
	let error = $state('');
	let errorId = 'quick-create-error';

	// Expiry state
	type ExpiryMode = 'none' | 'date' | 'count';
	let expiryMode = $state<ExpiryMode>('none');
	let expiresAt = $state<number | null>(null);
	let maxForwards = $state<number | null>(null);

	const hasExpiry = $derived(
		expiryMode === 'date' ? expiresAt !== null : expiryMode === 'count' ? maxForwards !== null : false
	);

	function tsToDateInput(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toISOString().slice(0, 10);
	}
	function dateInputToTs(s: string): number | null {
		if (!s) return null;
		const [y, m, d] = s.split('-').map(Number);
		return new Date(y, m - 1, d).getTime();
	}

	// Keep domain in sync when the sidebar selection changes
	$effect(() => {
		newDomain = defaultDomain;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!newDomain) return;
		creating = true;
		error = '';
		try {
			const res = await fetch(`/api/domains/${newDomain}/aliases`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					localPart: newLocalPart.trim() || undefined,
					expiresAt: expiryMode === 'date' ? expiresAt : null,
					maxForwards: expiryMode === 'count' ? maxForwards : null
				})
			});
			const body = await res.json();
			if (res.ok) {
				onCreated(body as AliasConfig);
				newLocalPart = '';
				expiryMode = 'none';
				expiresAt = null;
				maxForwards = null;
			} else {
				error = body.error ?? 'Failed to create alias';
			}
		} catch {
			error = 'Network error';
		} finally {
			creating = false;
		}
	}
</script>

<section aria-labelledby="create-heading">
	{#if domains.length === 0}
		<p class="text-sm text-app-muted">
			<button onclick={onAddDomain} class="text-app-accent hover:underline underline-offset-2">
				Add a domain
			</button>
			first to start creating aliases.
		</p>
	{:else}
		<form onsubmit={handleSubmit} aria-describedby={error ? errorId : undefined}>
			<div class="flex flex-wrap items-start gap-2">
				<!-- Local part input + @ domain display -->
				<div
					class="flex items-stretch rounded-lg border border-app-border bg-app-surface overflow-hidden focus-within:border-app-accent/60 transition-colors flex-1 min-w-48"
				>
					<label for="new-local-part" class="sr-only">Alias local part</label>
					<input
						bind:this={localPartInputEl}
						id="new-local-part"
						bind:value={newLocalPart}
						type="text"
						placeholder="New address"
						autocomplete="off"
						autocapitalize="none"
						class="flex-1 px-3 py-2.5 bg-transparent text-sm text-app-text placeholder:text-app-muted outline-none min-w-0"
					/>

					<!-- Domain selector: plain label when one domain, dropdown when multiple -->
					{#if domains.length === 1}
						<div
							class="flex items-center px-3 border-l border-app-border text-app-muted text-sm whitespace-nowrap"
							aria-hidden="true"
						>
							@{newDomain}
						</div>
					{:else}
						<Select.Root
							type="single"
							value={newDomain}
							onValueChange={(v) => { if (v) newDomain = v; }}
						>
							<Select.Trigger
								class="flex items-center gap-1.5 px-3 border-l border-app-border text-app-muted text-sm whitespace-nowrap hover:text-app-text transition-colors cursor-pointer outline-none"
								aria-label="Select domain"
							>
								@{newDomain}
								<svg class="w-3 h-3 opacity-60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
								</svg>
							</Select.Trigger>

							<Select.Content
								class="z-50 min-w-[10rem] rounded-xl border border-app-border bg-app-surface shadow-xl overflow-hidden"
								sideOffset={6}
							>
								<Select.Viewport class="p-1">
									{#each domains as d (d.domain)}
										<Select.Item
											value={d.domain}
											label={d.domain}
											class="flex items-center px-3 py-2 rounded-lg text-sm cursor-pointer outline-none
												data-[highlighted]:bg-app-hover data-[highlighted]:text-app-text
												data-[selected]:text-app-accent
												text-app-muted transition-colors"
										>
											{d.domain}
										</Select.Item>
									{/each}
								</Select.Viewport>
							</Select.Content>
						</Select.Root>
					{/if}

					<!-- Randomize -->
					<Tooltip.Root delayDuration={300}>
						<Tooltip.Trigger
							type="button"
							onclick={() => (newLocalPart = generateSlug())}
							aria-label="Generate a random alias name"
							class="px-3 border-l border-app-border text-app-muted hover:text-app-accent transition-colors"
						>
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<rect x="3" y="3" width="18" height="18" rx="3" ry="3" stroke-width="2"/>
								<circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
								<circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
								<circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
								<circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none"/>
								<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
							</svg>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
								sideOffset={8}
								side="bottom"
							>
								Generate random alias
								<Tooltip.Arrow class="text-app-border" />
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>

					<!-- Expiry popover -->
					<Popover.Root>
						<Tooltip.Root delayDuration={300}>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Popover.Trigger
										{...props}
										type="button"
										aria-label="Set expiry"
										class="px-3 border-l border-app-border transition-colors
											{hasExpiry ? 'text-app-accent' : 'text-app-muted hover:text-app-accent'}"
									>
										<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
											<circle cx="12" cy="12" r="9" stroke-width="2" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 3" />
										</svg>
									</Popover.Trigger>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content
									class="z-50 px-2 py-1 rounded-md bg-app-surface border border-app-border text-xs text-app-text shadow-md"
									sideOffset={8}
									side="bottom"
								>
									{hasExpiry ? 'Edit expiry' : 'Set expiry'}
									<Tooltip.Arrow class="text-app-border" />
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>

						<Popover.Portal>
							<Popover.Content
								sideOffset={22}
								side="bottom"
								align="end"
								class="z-50 w-80 rounded-xl border border-app-border bg-app-surface shadow-xl p-3 space-y-3"
							>
								<p class="text-xs font-semibold text-app-text">Auto-disable</p>

								<!-- Mode pills -->
								<div class="flex gap-1.5">
									{#each (['none', 'date', 'count'] as const) as mode (mode)}
										{@const label = mode === 'none' ? 'Never' : mode === 'date' ? 'After date' : 'After N emails'}
										<button
											type="button"
											onclick={() => { expiryMode = mode; }}
											class="flex-1 px-1 py-1 rounded-md text-xs transition-colors
												{expiryMode === mode
													? 'bg-app-accent text-app-bg font-medium'
													: 'bg-app-hover text-app-muted hover:text-app-text border border-app-border'}"
										>
											{label}
										</button>
									{/each}
								</div>

								{#if expiryMode === 'date'}
									<div class="space-y-1">
										<input
											type="date"
											value={tsToDateInput(expiresAt)}
											onchange={(e) => (expiresAt = dateInputToTs(e.currentTarget.value))}
											min={new Date().toISOString().slice(0, 10)}
											class="w-full px-3 py-1.5 rounded-lg border border-app-border bg-app-hover text-sm text-app-text focus:outline-none focus:border-app-accent/60 transition-colors [color-scheme:dark]"
										/>
										<p class="text-xs text-app-muted">Alias is disabled after this date.</p>
									</div>
								{:else if expiryMode === 'count'}
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<input
												type="number"
												value={maxForwards ?? ''}
												oninput={(e) => { const v = parseInt(e.currentTarget.value, 10); maxForwards = isNaN(v) || v < 1 ? null : v; }}
												min="1"
												placeholder="e.g. 10"
												class="w-full px-3 py-1.5 rounded-lg border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-app-accent/60 transition-colors"
											/>
										</div>
										<p class="text-xs text-app-muted">Alias is disabled after this many forwards.</p>
									</div>
								{/if}
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</div>

				<button
					type="submit"
					disabled={creating || !newDomain}
					aria-busy={creating}
					class="px-5 py-2.5 rounded-lg bg-app-accent text-app-bg text-sm border border-app-bg font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
				>
					Create
				</button>
			</div>


			{#if error}
				<p id={errorId} role="alert" class="mt-2 text-sm text-red-400">{error}</p>
			{/if}
		</form>
	{/if}
</section>
