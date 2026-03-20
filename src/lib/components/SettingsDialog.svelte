<script lang="ts">
	import type { DestinationAddress } from '$lib/types.js';
	import Dialog from './Dialog.svelte';

	let {
		open,
		destinations,
		onClose,
		onAdded,
		onRemoved
	}: {
		open: boolean;
		destinations: DestinationAddress[];
		onClose: () => void;
		onAdded: (dest: DestinationAddress) => void;
		onRemoved: (email: string) => void;
	} = $props();

	let newEmail = $state('');
	let adding = $state(false);
	let addError = $state('');
	let justAdded = $state<string | null>(null);
	let deletingEmail = $state<string | null>(null);

	async function handleAdd(e: Event) {
		e.preventDefault();
		adding = true;
		addError = '';
		try {
			const res = await fetch('/api/destinations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: newEmail.trim() })
			});
			const body = await res.json();
			if (!res.ok) {
				addError = body.error ?? 'Failed to add address';
			} else {
				onAdded(body as DestinationAddress);
				justAdded = newEmail.trim();
				newEmail = '';
			}
		} catch {
			addError = 'Network error';
		} finally {
			adding = false;
		}
	}

	async function handleDelete(email: string) {
		deletingEmail = email;
		try {
			await fetch('/api/destinations/' + encodeURIComponent(email), { method: 'DELETE' });
			onRemoved(email);
			if (justAdded === email) justAdded = null;
		} finally {
			deletingEmail = null;
		}
	}

	function handleClose() {
		newEmail = '';
		addError = '';
		justAdded = null;
		onClose();
	}
</script>

<Dialog open={open} title="Settings" onClose={handleClose}>
	<div class="p-6 space-y-6">

		<!-- Section header -->
		<div>
			<h3 class="text-sm font-semibold text-app-text mb-0.5">Destination Addresses</h3>
			<p class="text-xs text-app-muted leading-relaxed">
				Email addresses that Cloudflare Email Routing can forward mail to.
				Each address must be verified in Cloudflare before it can receive mail.
			</p>
		</div>

		<!-- Address list -->
		{#if destinations.length > 0}
			<ul class="space-y-2" aria-label="Destination addresses">
				{#each destinations as dest (dest.email)}
					<li class="flex flex-col gap-2">
						<div class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-app-hover border border-app-border">
							<!-- Dot indicator -->
							<span class="w-1.5 h-1.5 rounded-full bg-app-accent/70 shrink-0" aria-hidden="true"></span>
							<span class="flex-1 text-sm text-app-text font-mono truncate">{dest.email}</span>
							<button
								onclick={() => handleDelete(dest.email)}
								disabled={deletingEmail === dest.email}
								aria-label="Remove {dest.email}"
								class="p-1 text-app-muted/60 hover:text-red-400 rounded transition-colors disabled:opacity-40 shrink-0"
							>
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>

						<!-- Cloudflare setup guide for newly added address -->
						{#if justAdded === dest.email}
							<div class="ml-3 pl-3 border-l-2 border-app-accent/30 space-y-2.5">
								<p class="text-xs font-medium text-app-accent">Verify this address in Cloudflare</p>
								<ol class="space-y-2">
									{#each [
										'In the Cloudflare dashboard, go to Email → Email Routing → Destination Addresses.',
										'Click Add destination address, enter ' + dest.email + ', and click Send verification email.',
										'Check your inbox for an email from Cloudflare and click the verification link.'
									] as instruction, i}
										<li class="flex gap-2.5 text-xs text-app-muted leading-relaxed">
											<span class="flex-none w-4 h-4 rounded-full border border-app-border text-[10px] font-bold flex items-center justify-center mt-px text-app-muted/70" aria-hidden="true">
												{i + 1}
											</span>
											{instruction}
										</li>
									{/each}
								</ol>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-app-muted text-center py-4 rounded-lg border border-dashed border-app-border">
				No destination addresses yet
			</p>
		{/if}

		<!-- Add address form -->
		<form onsubmit={handleAdd} class="space-y-2">
			<label for="dest-email" class="block text-xs font-medium text-app-muted">
				Add destination address
			</label>
			<div class="flex gap-2">
				<input
					id="dest-email"
					type="email"
					bind:value={newEmail}
					placeholder="you@gmail.com"
					required
					class="flex-1 px-3 py-2 rounded-lg border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-accent/60 transition-colors"
				/>
				<button
					type="submit"
					disabled={adding || !newEmail.trim()}
					aria-busy={adding}
					class="px-4 py-2 text-sm font-semibold bg-app-accent text-app-bg rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
				>
					{adding ? 'Adding…' : 'Add'}
				</button>
			</div>
			{#if addError}
				<p role="alert" class="text-xs text-red-400">{addError}</p>
			{/if}
		</form>

		<div class="flex justify-end pt-1 border-t border-app-border">
			<button
				onclick={handleClose}
				class="px-4 py-2 text-sm text-app-muted hover:text-app-text border border-app-border hover:border-app-hover rounded-lg transition-colors"
			>
				Close
			</button>
		</div>
	</div>
</Dialog>
