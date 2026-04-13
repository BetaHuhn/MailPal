<script lang="ts">
	// Flow diagram animation
	import { onMount } from 'svelte';
	let mounted = $state(false);
	onMount(() => { mounted = true; });

	// "How it works" interactive demo
	let aliasDisabled = $state(false);

	// Setup section copy-to-clipboard
	let copiedCode = $state<string | null>(null);
	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			copiedCode = code;
			setTimeout(() => { copiedCode = null; }, 2000);
		} catch { /* clipboard API may be unavailable */ }
	}

	const GITHUB_URL = 'https://github.com/betahuhn/mailpal';
	const DEMO_URL = 'https://demo.mailpal.cc';

	const features = [
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>`,
			title: 'Your real inbox, never exposed',
			desc: 'Give every service its own alias. When one goes spammy, kill it in one click — without changing your real address or losing your other accounts.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
			title: 'Total control, zero subscriptions',
			desc: 'MailPal runs entirely inside your own Cloudflare account on the free tier. No monthly fees, no vendor lock-in, no third-party servers ever seeing your mail.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>`,
			title: 'Multi-domain support',
			desc: 'Manage multiple domains from a single dashboard with color-coded dots for easy navigation. Each domain has its own settings and default forwarding address.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>`,
			title: 'Aliases that manage themselves',
			desc: 'Set an expiry date or a max-forward limit and aliases disable themselves automatically. Enable wildcard mode and MailPal auto-creates aliases on new emails.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>`,
			title: 'Always know what\'s happening',
			desc: 'Every alias tracks forwarded and blocked counts plus a per-alias activity log, so you can see exactly which service leaked your address and when.'
		},
		{
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>`,
			title: 'Built for real workflows',
			desc: 'Add notes, assign color tags, and use full-text search to find any alias in seconds. Bulk-enable, bulk-disable, or bulk-delete when you need to act fast.'
		},
	];

	const steps = [
		{
			number: '1',
			title: 'Clone and install',
			code: `git clone https://github.com/betahuhn/mailpal
cd mailpal
npm install
cd email-worker && npm install && cd ..`
		},
		{
			number: '2',
			title: 'Create a KV namespace',
			code: `wrangler kv:namespace create mailpal`,
			note: 'Copy the <code>id</code> from the output and add it to both <code>wrangler.toml</code> files (root and <code>email-worker/</code>).'
		},
		{
			number: '3',
			title: 'Configuring wrangler.toml files',
			description: `After creating the KV namespace, add the same ID to <span class="text-[#dde1f5]">both</span> config files:`,
			split: [
				{
					label: 'wrangler.toml',
					code: `[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID"`
				},
				{
					label: 'email-worker/wrangler.toml',
					code: `[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID"`
				}
			]
		},
		{
			number: '4',
			title: 'Deploy the email worker',
			code: `cd email-worker
wrangler deploy`
		},
		{
			number: '5',
			title: 'Configure Email Routing',
			description: 'In the Cloudflare dashboard, go to <span class="text-[#dde1f5]">your domain → Email → Email Routing</span>. Then add a catch-all rule pointing to the <span class="text-[#dde1f5]">mailpal-email-worker</span> worker.'
		},
		{
			number: '6',
			title: 'Deploy the dashboard',
			code: `npm run build
wrangler pages deploy`
		},
		{
			number: '7',
			title: 'Set a login password (optional)',
			code: `wrangler pages secret put AUTH_PASSWORD`,
			note: 'Alternatively, protect the dashboard with <span class="text-[#dde1f5]">Cloudflare Access</span> using your preferred identity provider.'
		}
	];

	const screenshots = [
		{
			src: '/screenshots/dashboard.png',
			alt: 'MailPal dashboard',
			caption: 'Main dashboard — stats bar, quick-create form, full alias list with tags and per-alias counters'
		},
		{
			src: '/screenshots/alias-expanded.png',
			alt: 'Alias detail panel',
			caption: 'Alias detail — edit target address, note, tags, expiry, and view the activity log'
		},
		{
			src: '/screenshots/domain-filter.png',
			alt: 'Domain-filtered view',
			caption: 'Domain filtering — click any domain to scope the list; color-coded dots for multi-domain setups'
		},
		{
			src: '/screenshots/tag-filter.png',
			alt: 'Tag filter',
			caption: 'Tag filtering — create named color tags and filter aliases by one or more tags instantly'
		}
	];
</script>

<!-- ─────────────────────────────────────────── Nav ── -->
<nav class="fixed top-0 inset-x-0 z-50 border-b border-[#252943]/60 backdrop-blur-md" style="background: rgba(22, 25, 41, 0.85)">
	<div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
		<a href="/" class="flex items-center gap-2.5 group">
			<img src="/icon.svg" alt="MailPal" class="w-7 h-7 rounded-lg" />
			<span class="text-base font-bold tracking-tight text-[#dde1f5]">MailPal</span>
		</a>
		<div class="flex items-center gap-2">
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#5c6492] hover:text-[#dde1f5] hover:bg-[#21253c] transition-colors"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
				</svg>
				GitHub
			</a>
			<a
				href={DEMO_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#161929] bg-[#3ddec8] hover:bg-[#3ddec8]/90 transition-colors"
			>
				Live Demo
			</a>
		</div>
	</div>
</nav>

<!-- ─────────────────────────────────────────── Hero ── -->
<section class="pt-32 pb-20 px-6 text-center relative overflow-hidden">
	<div
		class="absolute inset-0 pointer-events-none"
		aria-hidden="true"
		style="background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61,222,200,0.12) 0%, transparent 70%)"
	></div>

	<div class="max-w-3xl mx-auto relative">
		<div class="relative inline-block mb-8">
			<div
				class="absolute inset-0 rounded-full blur-3xl scale-[2.5]"
				style="background: radial-gradient(circle, rgba(61,222,200,0.2) 0%, transparent 70%)"
				aria-hidden="true"
			></div>
			<img
				src="/icon.svg"
				alt="MailPal"
				class="relative w-24 h-24 rounded-[22px]"
				style="filter: drop-shadow(0 8px 32px rgba(61,222,200,0.3))"
			/>
		</div>

		<h1 class="text-5xl sm:text-6xl font-light text-[#dde1f5] mb-4 leading-tight">
			Your Friendly Guardian<br>for <span class="font-bold text-[#3ddec8]">Email Privacy.</span>
		</h1>
		<p class="text-lg text-[#5c6492] leading-relaxed max-w-xl mx-auto mb-10">
			Create unique email aliases for every service you sign up to — running on <strong class="text-[#dde1f5] font-medium">your own Cloudflare account</strong>. Zero subscriptions. Zero data sharing.
		</p>

		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				href={DEMO_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-[#161929] bg-[#3ddec8] hover:bg-[#3ddec8]/90 transition-colors shadow-lg"
				style="box-shadow: 0 0 32px rgba(61,222,200,0.25)"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
				</svg>
				Try Live Demo
			</a>
			<a
				href="#setup"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium text-[#dde1f5] bg-[#1b1e31] border border-[#252943] hover:border-[#3ddec8]/40 hover:bg-[#21253c] transition-colors"
			>
				<!-- Setup Icon -->
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
				</svg>
				Self-host it
			</a>
		</div>

		<!-- Badges -->
		<div class="flex flex-wrap items-center justify-center gap-3 mt-10">
			<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border border-[#252943] text-[#5c6492]">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M13.031 7.007c2.469 -.007 3.295 1.293 3.969 2.993c4 0 4.994 3.825 5 6h-20c-.001 -1.64 1.36 -2.954 3 -3c0 -1.5 1 -3 3 -3c.66 -1.942 2.562 -2.986 5.031 -2.993" />
					<path d="M12 13h6" /><path d="M17 10l-2.5 6" />
				</svg>
				Free forever on Cloudflare
			</span>
			<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border border-[#252943] text-[#5c6492]">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
				Your data, your domains
			</span>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border border-[#252943] text-[#5c6492]"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>
				Open Source
			</a>
		</div>
	</div>
</section>

<!-- ───────────────────────────────── How it works ── -->
<section class="py-20 px-6" style="border-top: 1px solid rgba(37,41,67,0.4)">
	<div class="max-w-4xl mx-auto text-center">
		<h2 class="text-3xl font-bold text-[#dde1f5] mb-3">How it works</h2>
		<p class="text-[#5c6492] text-lg mb-16 max-w-xl mx-auto">
			Every email sent to your alias is intercepted and forwarded to your real inbox — or silently blocked if you've disabled it.
		</p>

		<!-- Flow diagram -->
		<div class="flex items-center justify-center flex-wrap gap-0">
			<!-- Any website -->
			<div class="flex flex-col items-center gap-3">
				<div class="w-16 h-16 rounded-2xl bg-[#1b1e31] border border-[#252943] flex items-center justify-center">
					<svg class="w-7 h-7 text-[#5c6492]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<circle cx="12" cy="12" r="10" stroke-width="1.5"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
					</svg>
				</div>
				<span class="text-xs text-[#5c6492] text-center leading-tight">Any<br>Website</span>
			</div>

			<!-- Arrow 1 -->
			<div class="flex items-center mx-4 sm:mx-8 mb-6">
				<div class="w-12 sm:w-20 h-px bg-[#252943] relative">
					<div class="flow-dot"></div>
					<div class="flow-dot" style="animation-delay: 1.1s"></div>
				</div>
				<svg class="w-2 h-3 text-[#252943] ml-px flex-shrink-0" viewBox="0 0 6 10" fill="currentColor" aria-hidden="true">
					<path d="M0 0L6 5L0 10Z"/>
				</svg>
			</div>

			<!-- Alias -->
			<div class="flex flex-col items-center gap-3">
				<div
					class="relative px-4 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all duration-500"
					style={aliasDisabled
						? 'background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.35)'
						: 'background: rgba(61,222,200,0.07); border: 1px solid rgba(61,222,200,0.4); box-shadow: 0 0 32px rgba(61,222,200,0.14)'}
				>
					{#if aliasDisabled}
						<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-red-400" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.35)">Disabled</div>
					{/if}
					<span class="text-sm font-mono leading-snug whitespace-nowrap transition-all duration-500" style={aliasDisabled ? 'color: #5c6492; text-decoration: line-through' : 'color: #3ddec8'}>shop-pine-wood</span>
					<span class="text-sm font-mono leading-snug whitespace-nowrap transition-all duration-500" style={aliasDisabled ? 'color: #5c6492; text-decoration: line-through' : 'color: #3ddec8'}>@yourdomain.com</span>
				</div>
				<span class="text-xs text-center transition-colors duration-500" style={aliasDisabled ? 'color: rgba(239,68,68,0.5)' : 'color: rgba(61,222,200,0.6)'}>Your Alias</span>
				<button
					onclick={() => aliasDisabled = !aliasDisabled}
					class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center gap-1.5"
					style={aliasDisabled
						? 'background: rgba(61,222,200,0.08); border: 1px solid rgba(61,222,200,0.3); color: #3ddec8'
						: 'background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.28); color: #f87171'}
				>
					{#if aliasDisabled}
						<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
						Re-enable
					{:else}
						<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
						Disable Alias
					{/if}
				</button>
			</div>

			<!-- Arrow 2 -->
			<div class="flex items-center mx-4 sm:mx-8 mb-6">
				<div class="w-12 sm:w-20 h-px relative transition-colors duration-500" style={aliasDisabled ? 'background: rgba(239,68,68,0.3)' : 'background: #252943'}>
					{#if aliasDisabled}
						<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4)">
							<svg class="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
						</div>
					{:else}
						<div class="flow-dot" style="animation-delay: 0.55s"></div>
						<div class="flow-dot" style="animation-delay: 1.65s"></div>
					{/if}
				</div>
				<svg class="w-2 h-3 ml-px flex-shrink-0 transition-colors duration-500" style={aliasDisabled ? 'color: rgba(239,68,68,0.3)' : 'color: #252943'} viewBox="0 0 6 10" fill="currentColor" aria-hidden="true">
					<path d="M0 0L6 5L0 10Z"/>
				</svg>
			</div>

			<!-- Protected inbox -->
			<div class="flex flex-col items-center gap-3">
				<div class="relative w-16 h-16 rounded-2xl bg-[#1b1e31] flex items-center justify-center transition-all duration-500" style={aliasDisabled ? 'border: 1px solid rgba(239,68,68,0.25); opacity: 0.5' : 'border: 1px solid #252943'}>
					<svg class="w-7 h-7 text-[#5c6492]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
					</svg>
					<div
						class="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500"
						style={aliasDisabled ? 'background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3)' : 'background: rgba(61,222,200,0.12); border: 1px solid rgba(61,222,200,0.25)'}
					>
						{#if aliasDisabled}
							<svg class="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
						{:else}
							<svg class="w-3 h-3 text-[#3ddec8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<rect x="3" y="11" width="18" height="11" rx="2" stroke-width="2"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
							</svg>
						{/if}
					</div>
				</div>
				<span class="text-xs text-center leading-tight transition-colors duration-500" style={aliasDisabled ? 'color: rgba(239,68,68,0.4)' : 'color: #5c6492'}>Your<br>Inbox</span>
			</div>
		</div>

		<!-- Steps description -->
		<div class="grid sm:grid-cols-3 gap-4 mt-16 text-left">
			{#each [
				{ step: '01', title: 'Sign up with an alias', desc: 'Use a unique alias like shop-pine-wood@yourdomain.com instead of your real email when registering on any website.' },
				{ step: '02', title: 'Emails forward to you', desc: 'MailPal intercepts every incoming message and forwards it to your real inbox, with full transparency on sender and counts.' },
				{ step: '03', title: 'Kill the noise instantly', desc: 'If a service starts spamming, disable the alias in one click. The emails stop immediately — your real address stays untouched.' }
			] as item}
				<div class="bg-[#1b1e31] border border-[#252943] rounded-xl p-5">
					<div class="text-2xl font-bold font-mono mb-3" style="color: rgba(61,222,200,0.3)">{item.step}</div>
					<h3 class="text-base font-semibold text-[#dde1f5] mb-2">{item.title}</h3>
					<p class="text-sm text-[#5c6492] leading-relaxed">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ────────────────────────────────────── Features ── -->
<section class="py-20 px-6" style="border-top: 1px solid rgba(37,41,67,0.4)">
	<div class="max-w-5xl mx-auto">
		<div class="text-center mb-14">
			<h2 class="text-3xl font-bold text-[#dde1f5] mb-3">Everything you need</h2>
			<p class="text-[#5c6492] text-lg max-w-xl mx-auto">
				MailPal gives you complete control over your email privacy — without any of the usual trade-offs.
			</p>
		</div>

		<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each features as feature}
				<div class="bg-[#1b1e31] border border-[#252943] rounded-xl p-6 hover:border-[#3ddec8]/25 transition-colors">
					<div
						class="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
						style="background: rgba(61,222,200,0.08); border: 1px solid rgba(61,222,200,0.15)"
					>
						<svg class="w-5 h-5 text-[#3ddec8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							{@html feature.icon}
						</svg>
					</div>
					<h3 class="text-base font-semibold text-[#dde1f5] mb-2">{feature.title}</h3>
					<p class="text-sm text-[#5c6492] leading-relaxed">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ─────────────────────────────────── Screenshots ── -->
<section class="py-20 px-6" style="border-top: 1px solid rgba(37,41,67,0.4)">
	<div class="max-w-5xl mx-auto">
		<div class="text-center mb-14">
			<h2 class="text-3xl font-bold text-[#dde1f5] mb-3">See it in action</h2>
			<p class="text-[#5c6492] text-lg max-w-xl mx-auto">
				A clean, fast dashboard for managing all your aliases, domains, and forwarding rules.
			</p>
		</div>

		<div class="grid sm:grid-cols-2 gap-5">
			{#each screenshots as shot}
				<div class="group">
					<div class="rounded-xl overflow-hidden border border-[#252943] bg-[#1b1e31] transition-all duration-300 group-hover:border-[#3ddec8]/30" style="box-shadow: 0 4px 24px rgba(0,0,0,0.3)">
						<img
							src={shot.src}
							alt={shot.alt}
							class="w-full h-auto block"
							loading="lazy"
						/>
					</div>
					<p class="text-xs text-[#5c6492] mt-2.5 text-center px-2">{shot.caption}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ──────────────────────────── Self-hosting + Privacy ── -->
<section class="py-20 px-6" style="border-top: 1px solid rgba(37,41,67,0.4)">
	<div class="max-w-5xl mx-auto">
		<div class="text-center mb-14">
			<h2 class="text-3xl font-bold text-[#dde1f5] mb-3">Your data. Your rules.</h2>
			<p class="text-[#5c6492] text-lg max-w-2xl mx-auto">
				Unlike other email alias services, MailPal runs entirely inside your own Cloudflare account. Your emails never touch a third-party server.
			</p>
		</div>

		<div class="grid sm:grid-cols-2 gap-6">
			<!-- Privacy card -->
			<div class="bg-[#1b1e31] border border-[#252943] rounded-2xl p-8">
				<div
					class="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
					style="background: rgba(61,222,200,0.08); border: 1px solid rgba(61,222,200,0.2)"
				>
					<svg class="w-6 h-6 text-[#3ddec8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
					</svg>
				</div>
				<h3 class="text-xl font-bold text-[#dde1f5] mb-3">End-to-end privacy</h3>
				<p class="text-[#5c6492] leading-relaxed mb-5">
					MailPal processes your emails using Cloudflare Workers — code running inside your own Cloudflare account. No third-party has access to your aliases or your email traffic.
				</p>
				<ul class="space-y-2.5">
					{#each ['No third-party data access', 'No email content stored', 'No analytics or tracking', 'Fully auditable open source code'] as item}
						<li class="flex items-center gap-2.5 text-sm text-[#5c6492]">
							<svg class="w-4 h-4 text-[#3ddec8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
							</svg>
							{item}
						</li>
					{/each}
				</ul>
			</div>

			<!-- Free hosting card -->
			<div class="bg-[#1b1e31] border border-[#252943] rounded-2xl p-8">
				<div
					class="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
					style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2)"
				>
					<!-- <svg class="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
					</svg> -->
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path stroke="none" d="M0 0h24v24H0z" fill="none" />
						<path d="M13.031 7.007c2.469 -.007 3.295 1.293 3.969 2.993c4 0 4.994 3.825 5 6h-20c-.001 -1.64 1.36 -2.954 3 -3c0 -1.5 1 -3 3 -3c.66 -1.942 2.562 -2.986 5.031 -2.993" />
						<path d="M12 13h6" />
						<path d="M17 10l-2.5 6" />
					</svg>
				</div>
				<h3 class="text-xl font-bold text-[#dde1f5] mb-3">Free on Cloudflare's free tier</h3>
				<p class="text-[#5c6492] leading-relaxed mb-5">
					MailPal is built entirely on Cloudflare's generous free tier. No credit card required. No monthly fees. No vendor lock-in. Just deploy and enjoy.
				</p>
				<ul class="space-y-2.5">
					{#each [
						'Cloudflare Pages — dashboard hosting',
						'Cloudflare Workers — email processing',
						'Cloudflare KV — alias & config storage',
						'Cloudflare Email Routing — free with any domain'
					] as item}
						<li class="flex items-center gap-2.5 text-sm text-[#5c6492]">
							<svg class="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
							</svg>
							{item}
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<!-- Architecture diagram -->
		<div class="mt-8 bg-[#1b1e31] border border-[#252943] rounded-2xl p-6 sm:p-8">
			<h3 class="text-lg font-semibold text-[#dde1f5] mb-8 text-center">Architecture overview</h3>

			<!-- Three-node diagram -->
			<div class="flex items-center justify-center flex-wrap gap-0 max-w-2xl mx-auto">

				<!-- Dashboard node -->
				<div class="flex flex-col items-center">
					<div class="rounded-xl p-4 w-36 sm:w-40 text-center" style="background: rgba(61,222,200,0.05); border: 1px solid rgba(61,222,200,0.2)">
						<div class="w-8 h-8 rounded-lg mx-auto mb-2.5 flex items-center justify-center" style="background: rgba(61,222,200,0.1); border: 1px solid rgba(61,222,200,0.2)">
							<svg class="w-4 h-4 text-[#3ddec8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
							</svg>
						</div>
						<div class="text-xs font-semibold mb-1" style="color: rgba(61,222,200,0.8)">Dashboard</div>
						<div class="text-[10px] leading-snug text-[#5c6492]">SvelteKit<br>CF Pages</div>
					</div>
				</div>

				<!-- Connector: Dashboard ↔ KV -->
				<div class="flex flex-col items-center gap-1 mx-1 sm:mx-2 mb-1">
					<span class="text-[9px] text-[#5c6492]">read/write</span>
					<div class="flex items-center">
						<svg class="w-2 h-2.5 text-[#252943]" viewBox="0 0 6 10" fill="currentColor" style="transform: rotate(180deg)" aria-hidden="true"><path d="M0 0L6 5L0 10Z"/></svg>
						<div class="w-8 sm:w-12 h-px bg-[#252943]"></div>
						<svg class="w-2 h-2.5 text-[#252943]" viewBox="0 0 6 10" fill="currentColor" aria-hidden="true"><path d="M0 0L6 5L0 10Z"/></svg>
					</div>
				</div>

				<!-- KV Storage node (centre, highlighted) -->
				<div class="flex flex-col items-center">
					<div class="rounded-xl p-4 w-36 sm:w-40 text-center" style="background: rgba(61,222,200,0.09); border: 1px solid rgba(61,222,200,0.38); box-shadow: 0 0 24px rgba(61,222,200,0.08)">
						<div class="w-8 h-8 rounded-lg mx-auto mb-2.5 flex items-center justify-center" style="background: rgba(61,222,200,0.15); border: 1px solid rgba(61,222,200,0.3)">
							<svg class="w-4 h-4 text-[#3ddec8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<ellipse cx="12" cy="5" rx="9" ry="3" stroke-width="1.5"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6"/>
							</svg>
						</div>
						<div class="text-xs font-semibold text-[#3ddec8] mb-1">KV Storage</div>
						<div class="text-[10px] leading-snug text-[#5c6492]">Alias configs<br>CF KV</div>
					</div>
				</div>

				<!-- Connector: KV ↔ Email Worker -->
				<div class="flex flex-col items-center gap-1 mx-1 sm:mx-2 mb-1">
					<span class="text-[9px] text-[#5c6492]">read/write</span>
					<div class="flex items-center">
						<svg class="w-2 h-2.5 text-[#252943]" viewBox="0 0 6 10" fill="currentColor" style="transform: rotate(180deg)" aria-hidden="true"><path d="M0 0L6 5L0 10Z"/></svg>
						<div class="w-8 sm:w-12 h-px bg-[#252943]"></div>
						<svg class="w-2 h-2.5 text-[#252943]" viewBox="0 0 6 10" fill="currentColor" aria-hidden="true"><path d="M0 0L6 5L0 10Z"/></svg>
					</div>
				</div>

				<!-- Email Worker node -->
				<div class="flex flex-col items-center">
					<div class="rounded-xl p-4 w-36 sm:w-40 text-center" style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.25)">
						<div class="w-8 h-8 rounded-lg mx-auto mb-2.5 flex items-center justify-center" style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2)">
							<svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
							</svg>
						</div>
						<div class="text-xs font-semibold text-amber-400 mb-1">Email Worker</div>
						<div class="text-[10px] leading-snug text-[#5c6492]">Mail handler<br>CF Workers</div>
					</div>
				</div>
			</div>

			<!-- Email flow legend -->
			<div class="mt-6 flex items-center justify-center gap-2 flex-wrap text-xs text-[#5c6492]">
				<span>Incoming email</span>
				<svg class="w-2.5 h-2.5" viewBox="0 0 6 10" fill="currentColor" style="color: #3a3f60" aria-hidden="true"><path d="M0 0L6 5L0 10Z"/></svg>
				<span class="text-amber-400/70">Email Worker</span>
				<svg class="w-2.5 h-2.5" viewBox="0 0 6 10" fill="currentColor" style="color: #3a3f60" aria-hidden="true"><path d="M0 0L6 5L0 10Z"/></svg>
				<span>forward or reject</span>
				<span class="text-[#252943] mx-0.5">·</span>
				<span class="text-[#3ddec8]/60">Dashboard</span>
				<svg class="w-2.5 h-2.5" viewBox="0 0 6 10" fill="currentColor" style="color: #3a3f60" aria-hidden="true"><path d="M0 0L6 5L0 10Z"/></svg>
				<span>manage aliases via KV</span>
			</div>
		</div>
	</div>
</section>

<!-- ─────────────────────────────── Setup instructions ── -->
<section id="setup" class="py-20 px-6" style="border-top: 1px solid rgba(37,41,67,0.4)">
	<div class="max-w-3xl mx-auto">
		<div class="text-center mb-14">
			<h2 class="text-3xl font-bold text-[#dde1f5] mb-3">Set up in minutes</h2>
			<p class="text-[#5c6492] text-lg max-w-xl mx-auto">
				You'll need a Cloudflare account, a domain managed by Cloudflare, Node.js 18+, and Wrangler CLI.
			</p>
		</div>

		<!-- Prerequisites -->
		<div class="bg-[#1b1e31] border border-[#252943] rounded-xl p-5 mb-8">
			<h3 class="text-sm font-semibold text-[#dde1f5] mb-3 flex items-center gap-2">
				<svg class="w-4 h-4 text-[#3ddec8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
				</svg>
				Prerequisites
			</h3>
			<ul class="grid sm:grid-cols-2 gap-2">
				{#each [
					'A Cloudflare account (free)',
					'A domain added to Cloudflare',
					'Node.js 18+',
					'Wrangler CLI (npm i -g wrangler)'
				] as req}
					<li class="flex items-center gap-2 text-sm text-[#5c6492]">
						<svg class="w-3.5 h-3.5 text-[#3ddec8]/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
						</svg>
						{req}
					</li>
				{/each}
			</ul>
		</div>

		<!-- Steps -->
		<div class="space-y-4">
			{#each steps as step}
				<div class="bg-[#1b1e31] border border-[#252943] rounded-xl overflow-hidden p-5 space-y-2">
					<div class="flex items-start gap-3">
						<div
							class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
							style="background: rgba(61,222,200,0.1); border: 1px solid rgba(61,222,200,0.25); color: #3ddec8"
						>
							{step.number}
						</div>
						<h3 class="text-base font-semibold text-[#dde1f5] mb-1">{step.title}</h3>
					</div>

					<div class="flex-1 min-w-0 space-y-2">
							{#if step.description}
								<p class="text-sm text-[#5c6492] leading-relaxed">{@html step.description}</p>
							{/if}
							{#if step.code}
								<div class="relative group/code">
									<pre class="rounded-lg bg-[#161929] border border-[#252943]/60 p-3.5 text-xs text-[#3ddec8] font-mono overflow-x-auto leading-relaxed"><code>{step.code}</code></pre>
									<button
										onclick={() => copyCode(step.code!)}
										class="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
										style={copiedCode === step.code ? 'background: rgba(61,222,200,0.15); border: 1px solid rgba(61,222,200,0.35); color: #3ddec8' : 'background: rgba(37,41,67,0.95); border: 1px solid rgba(61,222,200,0.18); color: #5c6492'}
										aria-label="Copy code"
									>
										{#if copiedCode === step.code}
											<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
											Copied
										{:else}
											<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
											Copy
										{/if}
									</button>
								</div>
							{/if}
							{#if step.split}
								<div class="grid sm:grid-cols-2 gap-3 mt-3">
									{#each step.split as part}
										<div>
											<p class="text-xs text-[#5c6492] mb-1.5"><code class="text-[#3ddec8] text-xs">{part.label}</code></p>
											<div class="relative group/code">
												<pre class="rounded-lg bg-[#161929] border border-[#252943]/60 p-3 text-xs text-[#dde1f5]/80 font-mono overflow-x-auto leading-relaxed"><code>{part.code}</code></pre>
												<button
													onclick={() => copyCode(part.code)}
													class="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
													style={copiedCode === part.code ? 'background: rgba(61,222,200,0.15); border: 1px solid rgba(61,222,200,0.35); color: #3ddec8' : 'background: rgba(37,41,67,0.95); border: 1px solid rgba(61,222,200,0.18); color: #5c6492'}
													aria-label="Copy code"
												>
													{#if copiedCode === part.code}
														<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
														Copied
													{:else}
														<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
														Copy
													{/if}
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
							{#if step.note}
								<p class="text-sm text-[#5c6492] mt-2.5 leading-relaxed">{@html step.note}</p>
							{/if}
						</div>
				</div>
			{/each}
		</div>

		<div class="mt-8 text-center">
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 text-sm text-[#5c6492] hover:text-[#dde1f5] transition-colors"
			>
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
				</svg>
				Full documentation on GitHub
				<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
				</svg>
			</a>
		</div>
	</div>
</section>

<!-- ───────────────────────────────────────── CTA ── -->
<section class="py-24 px-6 relative overflow-hidden" style="border-top: 1px solid rgba(37,41,67,0.4)">
	<div
		class="absolute inset-0 pointer-events-none"
		aria-hidden="true"
		style="background: radial-gradient(ellipse 60% 60% at 50% 100%, rgba(61,222,200,0.08) 0%, transparent 70%)"
	></div>
	<div class="max-w-2xl mx-auto text-center relative">
		<h2 class="text-4xl font-light text-[#dde1f5] mb-4 leading-tight">
			Take Back Control of<br><span class="font-bold text-[#3ddec8]">Your Inbox.</span>
		</h2>
		<p class="text-[#5c6492] text-lg mb-10 max-w-lg mx-auto leading-relaxed">
			Deploy MailPal to your own Cloudflare account in minutes. Free forever. No subscriptions. No compromises.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				href={DEMO_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-[#161929] bg-[#3ddec8] hover:bg-[#3ddec8]/90 transition-colors"
				style="box-shadow: 0 0 32px rgba(61,222,200,0.2)"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
				</svg>
				Try Live Demo
			</a>
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium text-[#dde1f5] bg-[#1b1e31] border border-[#252943] hover:border-[#3ddec8]/40 hover:bg-[#21253c] transition-colors"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
				</svg>
				View on GitHub
			</a>
		</div>
	</div>
</section>

<!-- ──────────────────────────────────────── Footer ── -->
<footer class="py-10 px-6" style="border-top: 1px solid rgba(37,41,67,0.4)">
	<div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
		<div class="flex items-center gap-2.5">
			<img src="/icon.svg" alt="MailPal" class="w-6 h-6 rounded-md" />
			<span class="text-sm font-semibold text-[#dde1f5]">MailPal</span>
			<span class="text-[#252943] mx-1">·</span>
			<span class="text-xs text-[#5c6492]">Self-hosted email alias manager</span>
		</div>
		<div class="flex items-center gap-5">
			<a href={DEMO_URL} target="_blank" rel="noopener noreferrer" class="text-sm text-[#5c6492] hover:text-[#dde1f5] transition-colors">
				Live Demo
			</a>
			<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="text-sm text-[#5c6492] hover:text-[#dde1f5] transition-colors flex items-center gap-1.5">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
				</svg>
				GitHub
			</a>
			<a href="#setup" class="text-sm text-[#5c6492] hover:text-[#dde1f5] transition-colors">Setup</a>
		</div>
	</div>
</footer>

<style>
	@keyframes flowDot {
		0% { left: 0; opacity: 0; }
		10% { opacity: 1; }
		90% { opacity: 1; }
		100% { left: calc(100% - 6px); opacity: 0; }
	}

	.flow-dot {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #3ddec8;
		animation: flowDot 2.2s linear infinite;
		opacity: 0;
	}
</style>

