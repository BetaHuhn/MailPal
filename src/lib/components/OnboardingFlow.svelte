<script lang="ts">
	import { onMount } from 'svelte';

	let { onboarded = false }: { onboarded?: boolean } = $props();

	let show = $state(false);
	let stepVisible = $state(false);
	let displayStep = $state(0);
	let transitioning = $state(false);

	// Screen 2 demo — toggle animation
	let demoEnabled = $state(true);

	// Screen 3 demo — tags appear with stagger
	let visibleTags = $state(0);

	// Screen 2 demo — alias typewriter
	let aliasTyped = $state('');
	const ALIAS_TEXT = 'shop-pine-wood@yourdomain.com';

	const LAST_STEP = 4;

	onMount(() => {
		// 1. localStorage — instant skip, no flash
		try {
			if (localStorage.getItem('mailpal_onboarded')) {
				show = false;
				return;
			}
		} catch { /* storage unavailable */ }

		// 2. SSR backend value — already completed on another device/browser
		if (onboarded) {
			try { localStorage.setItem('mailpal_onboarded', '1'); } catch { /* ignore */ }
			show = false;
			return;
		}

		// 3. Show onboarding
		show = true;

		requestAnimationFrame(() => { stepVisible = true; });

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === 'ArrowRight') advance();
			else if (e.key === 'Backspace' || e.key === 'ArrowLeft') retreat();
			else if (e.key === 'Escape') complete();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	// Toggle demo for screen 2
	$effect(() => {
		if (!show || displayStep !== 2) return;
		demoEnabled = true;
		setTimeout(() => { demoEnabled = !demoEnabled; }, 800);
	});

	// Tags stagger for screen 3
	$effect(() => {
		if (!show || displayStep !== 3) return;
		visibleTags = 0;
		const t1 = setTimeout(() => { visibleTags = 1; }, 350);
		const t2 = setTimeout(() => { visibleTags = 2; }, 650);
		const t3 = setTimeout(() => { visibleTags = 3; }, 950);
		return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
	});

	// Alias typewriter for screen 1
	$effect(() => {
		if (!show || displayStep !== 1) return;
		aliasTyped = '';
		let i = 0;
		const id = setInterval(() => {
			aliasTyped = ALIAS_TEXT.slice(0, ++i);
			if (i >= ALIAS_TEXT.length) clearInterval(id);
		}, 48);
		return () => { clearInterval(id); };
	});

	function advance() {
		if (transitioning || !show) return;
		if (displayStep === LAST_STEP) { complete(); return; }
		transitioning = true;
		stepVisible = false;
		setTimeout(() => {
			displayStep++;
			stepVisible = true;
			transitioning = false;
		}, 260);
	}

	function retreat() {
		if (transitioning || !show) return;
		if (displayStep === 0) return;
		transitioning = true;
		stepVisible = false;
		setTimeout(() => {
			displayStep--;
			stepVisible = true;
			transitioning = false;
		}, 260);
	}

	function complete() {
		stepVisible = false;
		setTimeout(() => {
			show = false;
			try { localStorage.setItem('mailpal_onboarded', '1'); } catch { /* ignore */ }
			fetch('/api/onboarded', { method: 'POST' }).catch(() => { /* non-critical */ });
		}, 300);
	}

	function reset() {
		displayStep = 0;
		stepVisible = false;
		setTimeout(() => {
			stepVisible = true;
			demoEnabled = true;
			visibleTags = 0;
		}, 300);
	}
</script>

{#if show}
<div
	class="fixed inset-0 z-[100] bg-app-bg flex items-center justify-center overflow-hidden"
	role="dialog"
	aria-modal="true"
	aria-label="Welcome to MailPal"
>
	<!-- Skip -->
	<button
		onclick={complete}
		class="absolute top-5 right-5 text-xs text-app-muted/35 hover:text-app-muted/70 transition-colors px-2 py-1 rounded"
	>
		Skip
	</button>

	<!-- Step dots -->
	<div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2" aria-hidden="true">
		{#each [0, 1, 2, 3, 4] as i}
			<div
				class="rounded-full transition-all duration-500 ease-out
					{displayStep === i
						? 'w-5 h-1.5 bg-app-accent'
						: 'w-1.5 h-1.5 bg-app-border'}"
			></div>
		{/each}
	</div>

	<!-- Content (fades between steps) -->
	<div
		class="flex flex-col items-center text-center max-w-lg px-8 w-full select-none
			transition-opacity duration-[260ms] ease-out
			{stepVisible ? 'opacity-100' : 'opacity-0'}"
	>

		<!-- ── Screen 0: Welcome ──────────────────────────────────── -->
		{#if displayStep === 0}
			<div class="relative mb-10">
				<!-- Teal bloom behind icon -->
				<div
					class="absolute inset-0 rounded-full blur-3xl scale-[2.2]"
					style="background: radial-gradient(circle, rgba(61,222,200,0.18) 0%, transparent 70%)"
					aria-hidden="true"
				></div>
				<img
					src="/icon.svg"
					alt="MailPal"
					class="relative w-28 h-28 rounded-[28px] icon-float"
					style="filter: drop-shadow(0 8px 32px rgba(61,222,200,0.28))"
				/>
			</div>
			
			<h1 class="text-[2.6rem] leading-tight font-light text-app-text mb-3">
				Welcome to <span class="font-bold">MailPal.</span>
			</h1>
			<p class="text-lg text-app-muted leading-relaxed">
				Your friendly guardian for email privacy.
			</p>

		<!-- ── Screen 1: Privacy ──────────────────────────────────── -->
		{:else if displayStep === 1}
			<a href="/" onclick={reset} class="absolute top-5 left-5 flex items-center gap-3">
				<img
					src="/favicon.svg"
					alt="MailPal"
					class="relative w-8 h-8 rounded-md"
				/>

				<div class="text-md font-semibold text-app-text/90" aria-hidden="true">
					MailPal
				</div>
			</a>

			<h1 class="text-[2.2rem] leading-tight font-light text-app-text mb-3">
				Your real email,<br><span class="font-bold">never exposed.</span>
			</h1>

			<p class="text-base text-app-muted leading-relaxed">
				Create a unique alias for every service you sign up to.<br>
				Spam lands on the alias — your real address stays yours.
			</p>

			<!-- ── Flow diagram: website → alias → inbox ─── -->
			<div class="w-full max-w-sm mt-8" aria-hidden="true">
				<div class="flex items-center w-full">

					<!-- Node: Any website -->
					<div class="flex flex-col items-center gap-2 shrink-0">
						<div class="w-12 h-12 rounded-2xl bg-app-hover border border-app-border flex items-center justify-center">
							<svg class="w-5 h-5 text-app-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<circle cx="12" cy="12" r="10" stroke-width="1.5"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
							</svg>
						</div>
						<span class="text-[10px] text-app-muted/45 leading-tight text-center">Any<br>Website</span>
					</div>

					<!-- Connector 1 -->
					<div class="flex-1 relative" style="height: 20px">
						<div class="absolute inset-x-2 top-1/2 -translate-y-1/2" style="height: 1.5px; background: #252943"></div>
						<div class="flow-dot" style="animation-delay: 0s"></div>
						<div class="flow-dot" style="animation-delay: 1.1s"></div>
						<svg class="absolute right-1.5 top-1/2 -translate-y-1/2" width="5" height="8" viewBox="0 0 5 8">
							<path d="M0 0L5 4L0 8Z" fill="#252943"/>
						</svg>
					</div>

					<!-- Node: Alias — the interceptor -->
					<div class="flex flex-col items-center gap-2 shrink-0">
						<div
							class="px-3 py-2.5 rounded-xl border border-app-accent/40 flex flex-col items-center gap-0.5"
							style="background: rgba(61,222,200,0.07); box-shadow: 0 0 24px rgba(61,222,200,0.12)"
						>
							<span class="text-[11px] font-mono text-app-accent leading-snug whitespace-nowrap">shop-pine-wood</span>
							<span class="text-[11px] font-mono text-app-accent leading-snug whitespace-nowrap">@yourdomain.com</span>
						</div>
						<span class="text-[10px] text-app-accent/55 leading-tight text-center">Your Alias</span>
					</div>

					<!-- Connector 2 -->
					<div class="flex-1 relative" style="height: 20px">
						<div class="absolute inset-x-2 top-1/2 -translate-y-1/2" style="height: 1.5px; background: #252943"></div>
						<div class="flow-dot" style="animation-delay: 0.55s"></div>
						<div class="flow-dot" style="animation-delay: 1.65s"></div>
						<svg class="absolute right-1.5 top-1/2 -translate-y-1/2" width="5" height="8" viewBox="0 0 5 8">
							<path d="M0 0L5 4L0 8Z" fill="#252943"/>
						</svg>
					</div>

					<!-- Node: Protected inbox -->
					<div class="flex flex-col items-center gap-2 shrink-0">
						<div class="relative w-12 h-12 rounded-2xl bg-app-hover border border-app-border flex items-center justify-center">
							<svg class="w-5 h-5 text-app-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
							</svg>
							<div
								class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center border border-app-accent/25"
								style="background: rgba(61,222,200,0.12)"
							>
								<svg class="w-2.5 h-2.5 text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<rect x="3" y="11" width="18" height="11" rx="2" stroke-width="2"/>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
								</svg>
							</div>
						</div>
						<span class="text-[10px] text-app-muted/45 leading-tight text-center">Your<br>Inbox</span>
					</div>

				</div>
			</div>

		<!-- ── Screen 2: Control ──────────────────────────────────── -->
		{:else if displayStep === 2}
			<a href="/" onclick={reset} class="absolute top-5 left-5 flex items-center gap-3">
				<img
					src="/favicon.svg"
					alt="MailPal"
					class="relative w-8 h-8 rounded-md"
				/>

				<div class="text-md font-semibold text-app-text/90" aria-hidden="true">
					MailPal
				</div>
			</a>

			<h1 class="text-[2.2rem] leading-tight font-light text-app-text mb-3">
				Silence anything,<br><span class="font-bold">in an instant.</span>
			</h1>

			<p class="text-base text-app-muted leading-relaxed">
				Disable any alias in one click. Or let it expire automatically after a certain date or after a specific number of emails.
			</p>

			<div class="w-full max-w-sm mt-8 space-y-2 min-h-[135px]">
				<!-- Alias card with animating toggle -->
				<div
					class="bg-app-surface border rounded-xl px-4 py-4 transition-colors duration-700
						{demoEnabled ? 'border-app-border' : 'border-red-400/25'}"
				>
					<div class="flex items-center justify-between gap-3">
						<div class="text-sm font-mono text-app-text w-fit">{ALIAS_TEXT}</div>
						<!-- <div>
							<div class="text-xs text-app-muted mt-0.5 w-fit">Online shopping</div>
						</div> -->
						<!-- Status indicator -->
						<div class="flex items-center gap-1.5 text-xs font-bold tracking-widest shrink-0 transition-colors duration-700 {demoEnabled ? 'text-app-accent' : 'text-red-400/80'}">
							<div class="w-2.5 h-2.5 rounded-full transition-colors duration-700 {demoEnabled ? 'bg-app-accent' : 'bg-red-400/60'}"></div>
							{demoEnabled ? 'ACTIVE' : 'DISABLED'}
						</div>
					</div>

					<!-- "Blocked" notice slides in when disabled -->
					<div class="overflow-hidden transition-all duration-700 ease-in-out {demoEnabled ? 'max-h-0 opacity-0 mt-0' : 'max-h-10 opacity-100 mt-3'}">
						<div class="flex items-center gap-1.5 text-xs text-red-400/60 border-t border-red-400/10 pt-2.5">
							<svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<circle cx="12" cy="12" r="10" stroke-width="2"/>
								<path stroke-linecap="round" stroke-width="2" d="M4.93 4.93l14.14 14.14"/>
							</svg>
							Forwarding stopped — spam goes nowhere
						</div>
					</div>
				</div>

				<!-- Expiry hint pills -->
				<div class="flex justify-center gap-2 pt-1">
					<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border bg-app-surface text-xs text-app-muted/55">
						<svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							<circle cx="12" cy="12" r="9" stroke-width="2"/>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 3"/>
						</svg>
						Auto-expire after date
					</div>
					<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border bg-app-surface text-xs text-app-muted/55">
						<svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
						</svg>
						Limit email count
					</div>
				</div>
			</div>

		<!-- ── Screen 3: Organize ─────────────────────────────────── -->
		{:else if displayStep === 3}
			<a href="/" onclick={reset} class="absolute top-5 left-5 flex items-center gap-3">
				<img
					src="/favicon.svg"
					alt="MailPal"
					class="relative w-8 h-8 rounded-md"
				/>

				<div class="text-md font-semibold text-app-text/90" aria-hidden="true">
					MailPal
				</div>
			</a>

			<h1 class="text-[2.2rem] leading-tight font-light text-app-text mb-3">
				Know every alias<br><span class="font-bold">at a glance.</span>
			</h1>

			<p class="text-base text-app-muted leading-relaxed">
				Add notes, colored tags, and filter by status and domain.<br>
				Always know which alias you used with who and why.
			</p>

			<div class="w-full max-w-sm mt-8">
				<div class="bg-app-surface border border-app-border rounded-xl px-4 py-4 space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-mono text-app-text">amazon-orders@yourdomain.com</span>
						<span class="text-[10px] font-bold tracking-widest text-app-accent">ACTIVE</span>
					</div>

					<!-- Note fades in with first tag -->
					<div
						class="text-xs text-app-muted/75 text-left border-l-2 border-app-border pl-2.5 transition-all duration-500
							{visibleTags >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}"
					>
						"Online shopping returns"
					</div>

					<!-- Tags appear with stagger -->
					<div class="flex gap-1.5 flex-wrap">
						{#each [
							{ name: 'shopping', color: '#3b82f6' },
							{ name: 'amazon',   color: '#f59e0b' },
							{ name: 'returns',  color: '#10b981' },
						] as tag, i}
							<span
								class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs transition-all duration-500"
								style="
									background-color: {tag.color}20;
									border: 1px solid {tag.color}45;
									color: {tag.color};
									opacity: {visibleTags > i ? 1 : 0};
									transform: translateY({visibleTags > i ? 0 : 5}px);
									transition-delay: {i * 50}ms
								"
							>
								<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: {tag.color}" aria-hidden="true"></span>
								{tag.name}
							</span>
						{/each}
					</div>
				</div>
			</div>
		<!-- ── Screen 4: Cloudflare ──────────────────────────── -->
		{:else if displayStep === 4}
			<a href="/" onclick={reset} class="absolute top-5 left-5 flex items-center gap-3">
				<img src="/favicon.svg" alt="MailPal" class="relative w-8 h-8 rounded-md" />
				<div class="text-md font-semibold text-app-text/90" aria-hidden="true">MailPal</div>
			</a>

			<h1 class="text-[2.2rem] leading-tight font-light text-app-text mb-3">
				Running on <span class="font-bold">your infra.</span>
			</h1>

			<p class="text-base text-app-muted leading-relaxed">
				MailPal runs entirely inside your own Cloudflare account.<br>
				Your emails, your data — nothing gets shared.
			</p>

			<!-- Visual: Cloudflare infrastructure -->
			<div class="w-full max-w-sm mt-8">
				<!-- CF account container -->
				<div
					class="rounded-xl border p-4 space-y-3"
					style="border-color: rgba(246,130,31,0.28); background: rgba(246,130,31,0.04)"
				>
					<!-- Header -->
					<div class="flex items-center gap-2">
						<!-- Cloudflare cloud icon -->
						<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 shrink-0" aria-label="Cloudflare" role="img" viewBox="0 0 512 512"><path fill="#f38020" d="M331 326c11-26-4-38-19-38l-148-2c-4 0-4-6 1-7l150-2c17-1 37-15 43-33 0 0 10-21 9-24a97 97 0 0 0-187-11c-38-25-78 9-69 46-48 3-65 46-60 72 0 1 1 2 3 2h274c1 0 3-1 3-3z"/><path fill="#faae40" d="M381 224c-4 0-6-1-7 1l-5 21c-5 16 3 30 20 31l32 2c4 0 4 6-1 7l-33 1c-36 4-46 39-46 39 0 2 0 3 2 3h113l3-2a81 81 0 0 0-78-103"/></svg>
						<span class="text-sm font-semibold" style="color: #f6821f">Your Cloudflare account</span>
					</div>

					<!-- Three service pills -->
					<div class="grid grid-cols-3 gap-2">

						<!-- Workers -->
						<div class="group/cf-item bg-app-hover rounded-xl p-3 flex flex-col items-center gap-1.5 border border-app-border">
							<svg class="w-5 h-5 transition-colors ease-in-out text-app-muted group-hover/cf-item:text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
							</svg>
							<span class="text-[10px] text-app-text text-center leading-snug">Workers<br>Runtime</span>
						</div>

						<!-- KV -->
						<div class="group/cf-item bg-app-hover rounded-xl p-3 flex flex-col items-center gap-1.5 border border-app-border">
							<svg class="w-5 h-5 transition-colors ease-in-out text-app-muted group-hover/cf-item:text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<ellipse cx="12" cy="5" rx="9" ry="3" stroke-width="1.5"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/>
							</svg>
							<span class="text-[10px] text-app-text text-center leading-snug">KV<br>Storage</span>
						</div>

						<!-- Email Routing -->
						<div class="group/cf-item bg-app-hover rounded-xl p-3 flex flex-col items-center gap-1.5 border border-app-border">
							<svg class="w-5 h-5 transition-colors ease-in-out text-app-muted group-hover/cf-item:text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
							</svg>
							<span class="text-[10px] text-app-text text-center leading-snug">Email<br>Routing</span>
						</div>

					</div>
				</div>

				<!-- Footnote -->
				<!-- <div class="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-app-muted">
					<svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<rect x="3" y="11" width="18" height="11" rx="2" stroke-width="2"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
					</svg>
					no third-party servers, ever
				</div> -->
			</div>
		{/if}

		<!-- Divider -->
		<div class="w-36 h-px bg-app-border/50 my-8" aria-hidden="true"></div>

		<!-- Continue button with shimmer glow -->
		<button
			onclick={advance}
			class="continue-btn relative overflow-hidden inline-flex items-center gap-2 px-7 py-2.5 outline-none rounded-xl text-sm text-app-text/80 hover:text-app-text transition-colors duration-200 group"
		>
			<span class="btn-shimmer absolute inset-0 rounded-xl" aria-hidden="true"></span>
			<span class="relative font-medium">
				{displayStep === LAST_STEP ? 'Get started' : 'Continue'}
			</span>
			<svg
				class="relative w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
				fill="none" viewBox="0 0 24 24" stroke="currentColor"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
			</svg>
		</button>
		<p class="text-[11px] text-app-muted mt-2.5 tracking-wide">or press Enter</p>
	</div>
</div>
{/if}

<style>
	/* Icon float */
	@keyframes iconFloat {
		0%, 100% { transform: translateY(0px); }
		50%       { transform: translateY(-10px); }
	}
	:global(.icon-float) {
		animation: iconFloat 4.5s ease-in-out infinite;
	}

	/* Arrow pulse (kept for other uses) */
	@keyframes arrowPulse {
		0%, 100% { opacity: 0.35; transform: translateX(0); }
		50%       { opacity: 1;    transform: translateX(2px); }
	}
	.arrow-pulse {
		animation: arrowPulse 1.5s ease-in-out infinite;
	}

	/* Flow dot — travels along connector lines */
	@keyframes dotTravel {
		0%   { left: 6%;  opacity: 0; }
		12%  { opacity: 1; }
		88%  { opacity: 1; }
		100% { left: 86%; opacity: 0; }
	}
	.flow-dot {
		position: absolute;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(61, 222, 200, 0.75);
		top: 50%;
		transform: translateY(-50%);
		animation: dotTravel 2.2s ease-in-out infinite;
	}

	/* Button shimmer sweep */
	@keyframes shimmerSweep {
		0%   { background-position: 125% center; }
		50% { background-position: -25% center; }
		100% { background-position: -25% center; }
	}

	.btn-shimmer {
		background: linear-gradient(
			90deg,
			rgba(61, 222, 200, 0.07) 0%,
			rgba(61, 222, 200, 0.07) 30%,
			rgba(61, 222, 200, 0.30) 50%,
			rgba(61, 222, 200, 0.07) 70%,
			rgba(61, 222, 200, 0.07) 100%
		);
		background-size: 250% auto;
		border: 1px solid rgba(61, 222, 200, 0.22);
		animation: shimmerSweep 3s linear infinite;
	}

	.continue-btn:hover .btn-shimmer {
		border-color: rgba(61, 222, 200, 0.45);
	}
</style>
