import type { RequestHandler } from '@sveltejs/kit';

export const prerender = false;

const SCRIPT_URL =
	'https://raw.githubusercontent.com/betahuhn/mailpal/main/scripts/setup.sh';

export const GET: RequestHandler = async ({ fetch }) => {
	const upstream = await fetch(SCRIPT_URL);

	if (!upstream.ok) {
		return new Response('Failed to fetch setup script from GitHub.', {
			status: 502,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}

	const body = await upstream.text();

	return new Response(body, {
		headers: {
			'Content-Type': 'text/x-shellscript; charset=utf-8',
			'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
		}
	});
}
