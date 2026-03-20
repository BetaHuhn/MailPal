<script lang="ts">
	const SWATCHES = [
		{ hue: 0,   hex: '#D86464' },
		{ hue: 30,  hex: '#D89E64' },
		{ hue: 60,  hex: '#D8D864' },
		{ hue: 90,  hex: '#9ED864' },
		{ hue: 120, hex: '#64D864' },
		{ hue: 150, hex: '#64D89E' },
		{ hue: 180, hex: '#64D8D8' },
		{ hue: 210, hex: '#649ED8' },
		{ hue: 240, hex: '#6464D8' },
		{ hue: 270, hex: '#9E64D8' },
		{ hue: 300, hex: '#D864D8' },
		{ hue: 330, hex: '#D8649E' },
	];

	let { value = $bindable() }: { value: string | undefined } = $props();

	let open = $state(false);

	function select(hex: string) {
		value = hex;
		open = false;
	}
</script>

<div class="flex items-center gap-2">
	<span class="text-xs text-app-muted">Domain color</span>

	<!-- Collapsed: current color pill + edit on hover -->
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-label="Change domain color"
		aria-expanded={open}
		class="group relative w-5 h-5 rounded-full shrink-0 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
		style="background-color: {value ?? '#5c6492'}"
	>
		<span
			class="absolute inset-0 rounded-full flex items-center justify-center
				bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
			aria-hidden="true"
		>
			<svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
					d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
			</svg>
		</span>
	</button>

	<!-- Expanded swatch grid -->
	{#if open}
		<div class="flex items-center gap-1.5" role="radiogroup" aria-label="Domain color">
			{#each SWATCHES as swatch (swatch.hue)}
				{@const selected = value?.toLowerCase() === swatch.hex.toLowerCase()}
				<button
					type="button"
					role="radio"
					aria-checked={selected}
					aria-label="Hue {swatch.hue}°"
					onclick={() => select(swatch.hex)}
					class="w-4 h-4 rounded-full shrink-0 transition-all hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-accent relative"
					style="background-color: {swatch.hex}; {selected ? 'box-shadow: 0 0 0 2px var(--color-app-surface), 0 0 0 3.5px white;' : ''}"
				></button>
			{/each}

			{#if value}
				<button
					type="button"
					onclick={() => { value = undefined; open = false; }}
					aria-label="Reset to auto color"
					class="w-4 h-4 rounded-full shrink-0 border border-dashed border-app-border flex items-center justify-center text-app-muted hover:text-app-text hover:border-app-muted transition-colors"
					title="Reset to auto"
				>
					<svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	{/if}
</div>
