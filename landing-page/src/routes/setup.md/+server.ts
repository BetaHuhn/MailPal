import type { RequestHandler } from '@sveltejs/kit';

const BASE = 'https://raw.githubusercontent.com/betahuhn/mailpal/main';

export const GET: RequestHandler = async ({ fetch }) => {
	const upstream = await fetch(`${BASE}/SETUP.md`);

	if (!upstream.ok) {
		return new Response('Failed to fetch SETUP.md from GitHub.', {
			status: 502,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}

	const body = await upstream.text();

	return new Response(body, {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300'
		}
	});
};
