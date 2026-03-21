<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login — MailPal</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-app-bg p-4">
	<div class="w-full max-w-sm">
		<div class="bg-app-surface border border-app-border rounded-2xl shadow-2xl p-8">
			<div class="mb-8 text-center">
				<div
					class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-app-accent/15 mb-4"
				>
					<svg
						class="w-6 h-6 text-app-accent"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<h1 class="text-2xl font-bold text-app-text">MailPal</h1>
				<p class="text-sm text-app-muted mt-1">Email alias manager</p>
			</div>

			<form method="POST" class="space-y-4">
				<div>
					<label for="password" class="block text-sm font-medium text-app-text mb-1.5">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						autocomplete="current-password"
						class="w-full px-3 py-2.5 rounded-lg border border-app-border bg-app-hover text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-accent/60 transition-colors"
						placeholder="Enter your password"
					/>
				</div>

				{#if form?.error}
					<p class="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{form.error}</p>
				{/if}

				<button
					type="submit"
					class="w-full py-2.5 px-4 bg-app-accent hover:brightness-110 text-app-bg text-sm font-semibold rounded-lg transition-all"
				>
					Sign in
				</button>
			</form>
		</div>
	</div>
</div>
