<script lang="ts">
	import type { AliasConfig, DestinationAddress, DomainConfig, Tag } from '$lib/types.js';
	import { AlertDialog } from 'bits-ui';
	import Dialog from './Dialog.svelte';
	import DestinationSelect from './DestinationSelect.svelte';

	let {
		open,
		alias,
		domain,
		destinations,
		tags,
		onClose,
		onUpdated,
		onDeleted
	}: {
		open: boolean;
		alias: AliasConfig;
		domain: DomainConfig;
		destinations: DestinationAddress[];
		tags: Tag[];
		onClose: () => void;
		onUpdated: (alias: AliasConfig) => void;
		onDeleted: (alias: AliasConfig) => void;
	} = $props();

	let targetEmail = $state(alias.targetEmail ?? '');
	let note = $state(alias.note ?? '');
	let selectedTags = $state<string[]>(alias.tags ?? []);
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');

	$effect(() => {
		if (open) {
			targetEmail = alias.targetEmail ?? '';
			note = alias.note ?? '';
			selectedTags = alias.tags ?? [];
			error = '';
		}
	});

	function toggleTag(name: string) {
		if (selectedTags.includes(name)) {
			selectedTags = selectedTags.filter((t) => t !== name);
		} else {
			selectedTags = [...selectedTags, name];
		}
	}

	async function submit(e: Event) {
		e.preventDefault();
		saving = true;
		error = '';
		try {
			const res = await fetch(`/api/domains/${alias.domain}/aliases/${alias.localPart}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetEmail: targetEmail || null,
					note: note.trim() || null,
					tags: selectedTags
				})
			});
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? 'Failed to update alias';
			} else {
				onUpdated(body as AliasConfig);
				onClose();
			}
		} catch {
			error = 'Network error';
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
</script>

<Dialog {open} title="Edit alias" subtitle="{alias.localPart}@{alias.domain}" onClose={onClose}>
	<form onsubmit={submit} class="p-6 space-y-4">
		<div>
			<label for="ea-target" class="block text-sm font-medium text-app-text mb-1.5">
				Override target email
				<span class="text-app-muted font-normal">(optional)</span>
			</label>
			<DestinationSelect
				id="ea-target"
				{destinations}
				bind:value={targetEmail}
				allowEmpty={true}
				emptyLabel="Inherit from domain ({domain.targetEmail})"
				placeholder="Inherit from domain…"
			/>
			<p class="text-xs text-app-muted mt-1.5">Clear to forward to the domain default</p>
		</div>

		<!-- Note -->
		<div>
			<label for="ea-note" class="block text-sm font-medium text-app-text mb-1.5">
				Note
				<span class="text-app-muted font-normal">(optional)</span>
			</label>
			<input
				id="ea-note"
				type="text"
				bind:value={note}
				placeholder="e.g. GitHub sign-up"
				class="w-full px-3 py-2 rounded-lg border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-accent/60 transition-colors"
			/>
		</div>

		<!-- Tags -->
		{#if tags.length > 0}
			<div>
				<span class="block text-sm font-medium text-app-text mb-1.5">Tags</span>
				<div class="flex flex-wrap gap-1.5">
					{#each tags as tag (tag.name)}
						{@const active = selectedTags.includes(tag.name)}
						<button
							type="button"
							onclick={() => toggleTag(tag.name)}
							aria-pressed={active}
							class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
							style={active
								? `color: ${tag.color}; background-color: ${tag.color}26; border: 1px solid ${tag.color}66`
								: 'color: var(--color-app-muted); background-color: var(--color-app-hover); border: 1px solid var(--color-app-border)'}
						>
							<span
								class="w-1.5 h-1.5 rounded-full shrink-0"
								style="background-color: {active ? tag.color : 'currentColor'}"
								aria-hidden="true"
							></span>
							{tag.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Stats -->
		<div class="grid grid-cols-3 gap-2" aria-label="Alias statistics">
			<div class="bg-app-hover rounded-lg p-3">
				<div class="text-[11px] text-app-muted mb-1">Forwarded</div>
				<div class="text-lg font-bold text-app-text">{alias.forwardedCount}</div>
			</div>
			<div class="bg-app-hover rounded-lg p-3">
				<div class="text-[11px] text-app-muted mb-1">Blocked</div>
				<div class="text-lg font-bold text-app-text">{alias.blockedCount}</div>
			</div>
			<div class="bg-app-hover rounded-lg p-3">
				<div class="text-[11px] text-app-muted mb-1">Last used</div>
				<div class="text-xs font-medium text-app-text leading-tight mt-0.5">
					{alias.lastUsedAt ? new Date(alias.lastUsedAt).toLocaleDateString() : '—'}
				</div>
			</div>
		</div>

		{#if error}
			<p role="alert" class="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
		{/if}

		<div class="flex justify-between gap-2 pt-1">
			<AlertDialog.Root>
				<AlertDialog.Trigger
					type="button"
					disabled={deleting}
					class="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded-lg transition-colors disabled:opacity-40"
				>
					{deleting ? 'Deleting…' : 'Delete alias'}
				</AlertDialog.Trigger>
				<AlertDialog.Portal>
					<AlertDialog.Overlay class="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
					<AlertDialog.Content
						class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl border border-app-border bg-app-surface shadow-2xl w-full max-w-sm text-app-text p-6 focus:outline-none"
					>
						<AlertDialog.Title class="font-semibold text-app-text mb-1">Delete alias?</AlertDialog.Title>
						<AlertDialog.Description class="text-sm text-app-muted mb-5">
							<span class="font-mono text-app-text">{alias.localPart}@{alias.domain}</span> will be permanently deleted.
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

			<div class="flex gap-2">
				<button
					type="button"
					onclick={onClose}
					class="px-4 py-2 text-sm text-app-muted hover:text-app-text border border-app-border hover:border-app-hover rounded-lg transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving}
					aria-busy={saving}
					class="px-4 py-2 text-sm font-semibold bg-app-accent text-app-bg rounded-lg hover:brightness-110 transition-all disabled:opacity-40"
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</form>
</Dialog>
