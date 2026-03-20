import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				app: {
					bg: '#161929',
					sidebar: '#131625',
					surface: '#1b1e31',
					hover: '#21253c',
					border: '#252943',
					text: '#dde1f5',
					muted: '#5c6492',
					accent: '#3ddec8',
					'accent-dim': '#0d2e28'
				}
			},
			fontFamily: {
				sans: [
					'Inter',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'Segoe UI',
					'sans-serif'
				]
			}
		}
	},
	plugins: []
} satisfies Config;
