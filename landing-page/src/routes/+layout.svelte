<script lang="ts">
	import './layout.css';

	const siteName = 'MailPal';
	const siteTitle = 'MailPal — Self-hosted email alias manager';
	const siteDescription = 'MailPal is a self-hosted email alias manager that runs entirely on your own Cloudflare account. Create unique aliases for every service, disable spammy addresses instantly, and keep full control of your inbox.';
	const siteUrl = 'https://mailpal.cc';
	const ogImageUrl = `${siteUrl}/mailpal-og.png`;
	const ogImageAlt = 'MailPal landing page preview showing the email alias dashboard and privacy-focused messaging.';

	let { children } = $props();
</script>

<svelte:head>
	<title>{siteTitle}</title>
	<meta name="description" content={siteDescription} />
	<meta name="application-name" content={siteName} />
	<meta name="apple-mobile-web-app-title" content={siteName} />
	<meta name="theme-color" content="#161929" />
	<link rel="canonical" href={siteUrl} />
	<link rel="icon" href="/favicon.svg" />

	<meta property="og:locale" content="en_US" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:title" content={siteTitle} />
	<meta property="og:description" content={siteDescription} />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:secure_url" content={ogImageUrl} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="2400" />
	<meta property="og:image:height" content="1260" />
	<meta property="og:image:alt" content={ogImageAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={siteTitle} />
	<meta name="twitter:description" content={siteDescription} />
	<meta name="twitter:image" content={ogImageUrl} />
	<meta name="twitter:image:alt" content={ogImageAlt} />
</svelte:head>
{@render children()}
