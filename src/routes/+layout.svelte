<script lang="ts">
	import '../app.css';
	import { Tooltip } from 'bits-ui';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const DEMO_COOKIE = 'demo_state';
	const DEMO_LS_KEY = 'mailpal-demo-state';

	onMount(() => {
		if (!data.demo) return;
		try {
			const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${DEMO_COOKIE}=([^;]*)`) );
			if (match) {
				// Mirror the server-written cookie into localStorage so the user can
				// inspect / clear their demo session data from the browser devtools.
				localStorage.setItem(DEMO_LS_KEY, decodeURIComponent(match[1]));
			} else {
				// Cookie was cleared (e.g. user cleared cookies but kept localStorage).
				// Restore the cookie from localStorage so the next navigation picks up
				// the saved state without requiring a manual page refresh.
				const saved = localStorage.getItem(DEMO_LS_KEY);
				if (saved) {
					document.cookie = `${DEMO_COOKIE}=${encodeURIComponent(saved)}; path=/; max-age=604800; SameSite=Lax; Secure`;
				}
			}
		} catch {
			// localStorage may be unavailable (e.g. private browsing with strict settings).
		}
	});
</script>

<Tooltip.Provider delayDuration={400}>
	{@render children()}
</Tooltip.Provider>
