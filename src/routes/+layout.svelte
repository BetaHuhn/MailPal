<script lang="ts">
	import '../app.css';
	import { Tooltip } from 'bits-ui';

	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<Tooltip.Provider delayDuration={400}>
	{@render children()}
</Tooltip.Provider>
