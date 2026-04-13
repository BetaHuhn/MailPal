import type { RequestHandler } from '@sveltejs/kit';

export const prerender = false;

const BASE = 'https://raw.githubusercontent.com/betahuhn/mailpal/main/scripts';

// PowerShell's Invoke-RestMethod / Invoke-WebRequest sends a UA containing
// "WindowsPowerShell" or "PowerShell", making it easy to branch server-side.
function isPowerShell(ua: string): boolean {
	return /powershell/i.test(ua);
}

export const GET: RequestHandler = async ({ fetch, request }) => {
	const ua = request.headers.get('user-agent') ?? '';
	const windows = isPowerShell(ua);

	const scriptUrl = `${BASE}/${windows ? 'setup.ps1' : 'setup.sh'}`;
	const contentType = windows ? 'text/plain' : 'text/x-shellscript';

	const upstream = await fetch(scriptUrl);

	if (!upstream.ok) {
		return new Response('Failed to fetch setup script from GitHub.', {
			status: 502,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}

	const body = await upstream.text();

	return new Response(body, {
		headers: {
			'Content-Type': `${contentType}; charset=utf-8`,
			'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
		}
	});
};
