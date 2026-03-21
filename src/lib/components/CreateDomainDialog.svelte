<script lang="ts">
	import type { DestinationAddress, DomainConfig } from '$lib/types.js';
	import { Switch } from 'bits-ui';
	import Dialog from './Dialog.svelte';
	import DestinationSelect from './DestinationSelect.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import { randomSwatchColor } from '$lib/constants';

	let {
		open,
		destinations,
		onClose,
		onCreated
	}: {
		open: boolean;
		destinations: DestinationAddress[];
		onClose: () => void;
		onCreated: (domain: DomainConfig) => void;
	} = $props();

	let domain = $state('');
	let targetEmail = $state('');
	let wildcardEnabled = $state(false);
	let color = $state<string | undefined>(randomSwatchColor());
	let saving = $state(false);
	let error = $state('');
	let createdDomain = $state<DomainConfig | null>(null);

	// Pre-select the first destination if available
	$effect(() => {
		if (open && !targetEmail && destinations.length > 0) {
			targetEmail = destinations[0].email;
		}
	});

	function reset() {
		domain = '';
		targetEmail = destinations[0]?.email ?? '';
		wildcardEnabled = false;
		color = randomSwatchColor();
		error = '';
		createdDomain = null;
	}

	async function submit(e: Event) {
		e.preventDefault();
		saving = true;
		error = '';
		try {
			const res = await fetch('/api/domains', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ domain, targetEmail, wildcardEnabled, color })
			});
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Failed to create domain';
			} else {
				createdDomain = body as DomainConfig;
				onCreated(createdDomain);
			}
		} catch {
			error = 'Network error';
		} finally {
			saving = false;
		}
	}

	function handleClose() {
		reset();
		onClose();
	}
</script>

<Dialog {open} title="Add domain" onClose={handleClose}>
	{#if createdDomain}
		<!-- ── Success + Cloudflare setup guide ───────────────────────────── -->
		<div class="p-6 space-y-5">
			<div class="flex items-center gap-3 p-3.5 rounded-xl bg-app-accent/10 border border-app-accent/20">
				<div class="w-7 h-7 rounded-full bg-app-accent/15 flex items-center justify-center shrink-0">
					<svg class="w-3.5 h-3.5 text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div>
					<p class="text-sm font-medium text-app-text">
						<span class="font-mono text-app-accent">{createdDomain.domain}</span> added successfully
					</p>
					<p class="text-xs text-app-muted mt-0.5">Now configure Email Routing in Cloudflare to activate it.</p>
				</div>
			</div>

			<div>
				<div class="flex items-center gap-2 mb-3">
					<svg class="w-4 h-4 shrink-0" viewBox="0 0 100 100" aria-hidden="true">
						<path fill="#F48120" d="M63.5 56.3l1.5-5.1c0 0-6.8-3.5-13.8.2l-0.2 0.1c-5.2 2.8-8.2 7.9-8.2 7.9H28.6l-1.5 4.8H43c1.5 4.5 6.2 7.3 11.1 6.5 4.3-0.8 7.8-4 8.8-8.2l0.6-6.2z"/>
						<path fill="#FBAD41" d="M66.4 46.4c-0.3-1.1-0.7-2.2-1.3-3.2-3.7-6.1-12-8.1-18.6-4.5-2.6 1.4-4.7 3.6-6 6.1C38.1 44.3 36 44.5 34.2 45.5c-2.5 1.4-4 3.8-4.1 6.5h42.3C71.9 48.3 69.4 46.4 66.4 46.4z"/>
					</svg>
					<span class="text-xs font-semibold uppercase tracking-widest text-app-muted">Cloudflare setup</span>
				</div>
				<ol class="space-y-3">
					{#each [
						{ title: 'Enable Email Routing', body: 'In the Cloudflare dashboard, open your domain and go to Email → Email Routing. Click Enable Email Routing if it isn\'t already active.' },
						{ title: 'Add a catch-all routing rule', body: 'Under Routing Rules, scroll to the Catch-all address row and click Edit. Set the action to Send to a Worker.' },
						{ title: 'Select the email worker', body: 'Choose your mailpal-email-worker from the worker list, then save the rule. All mail to any address @' + createdDomain.domain + ' will now be handled by MailPal.' },
					] as item, i}
						<li class="flex gap-3">
							<span class="flex-none w-5 h-5 mt-0.5 rounded-full border border-app-border text-[11px] font-bold text-app-muted flex items-center justify-center" aria-hidden="true">
								{i + 1}
							</span>
							<div>
								<p class="text-sm font-medium text-app-text leading-snug">{item.title}</p>
								<p class="text-xs text-app-muted mt-0.5 leading-relaxed">{item.body}</p>
							</div>
						</li>
					{/each}
				</ol>
			</div>

			<div class="flex justify-end pt-1">
				<button
					onclick={handleClose}
					class="px-4 py-2 text-sm font-semibold bg-app-accent text-app-bg rounded-lg hover:brightness-110 transition-all"
				>
					Done
				</button>
			</div>
		</div>
	{:else}
		<!-- ── Creation form ──────────────────────────────────────────────── -->
		<form onsubmit={submit} class="p-6 space-y-4">
			<div>
				<div class="flex items-center justify-between mb-1.5">
					<label for="ed-target" class="text-sm font-medium text-app-text">
						Domain color
					</label>
				</div>
				<ColorPicker bind:value={color} open={true} size={6} />
			</div>

			<div>
				<label for="cd-domain" class="block text-sm font-medium text-app-text mb-1.5">Domain</label>
				<input
					id="cd-domain"
					type="text"
					bind:value={domain}
					required
					placeholder="example.com"
					autocapitalize="none"
					class="w-full px-3 py-2.5 rounded-lg border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-accent/60 transition-colors"
				/>
			</div>

			<div>
				<label for="cd-target" class="block text-sm font-medium text-app-text mb-1.5">
					Default target email
				</label>
				<DestinationSelect
					id="cd-target"
					{destinations}
					bind:value={targetEmail}
					placeholder="Select destination address…"
				/>
				<p class="text-xs text-app-muted mt-1.5">Where emails forward by default</p>
			</div>

			<div class="flex items-center justify-between py-1">
				<div>
					<p class="text-sm font-medium text-app-text">Wildcard mode</p>
					<p class="text-xs text-app-muted mt-0.5">Auto-create aliases on first use</p>
				</div>
				<Switch.Root
					checked={wildcardEnabled}
					onCheckedChange={(v) => (wildcardEnabled = v)}
					class="relative inline-flex h-5 w-9 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-accent
						data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-border"
					aria-label="Toggle wildcard mode"
				>
					<Switch.Thumb
						class="block h-3.5 w-3.5 mt-[3px] rounded-full bg-white shadow transition-transform
							data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-[3px]"
					/>
				</Switch.Root>
			</div>

			{#if error}
				<p role="alert" class="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
			{/if}

			<div class="flex justify-end gap-2 pt-1">
				<button
					type="button"
					onclick={handleClose}
					class="px-4 py-2 text-sm text-app-muted hover:text-app-text border border-app-border hover:border-app-hover rounded-lg transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving || !targetEmail}
					aria-busy={saving}
					class="px-4 py-2 text-sm font-semibold bg-app-accent text-app-bg rounded-lg hover:brightness-110 transition-all disabled:opacity-40"
				>
					{saving ? 'Creating…' : 'Create domain'}
				</button>
			</div>
		</form>
	{/if}
</Dialog>
