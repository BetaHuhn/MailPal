<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<title>MailPal — Self-hosted email alias manager</title>
</svelte:head>
{@render children()}
