import { redirect, type Handle } from '@sveltejs/kit';
import { verifySessionCookie } from '$lib/auth.js';

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
};

export const handle: Handle = async ({ event, resolve }) => {
	const platform = event.platform;

	if (!platform?.env?.KV) {
		// During local dev without wrangler, allow through
		event.locals.authMode = 'cloudflare-access';
		event.locals.authenticated = true;
		const response = await resolve(event);
		for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
			response.headers.set(key, value);
		}
		return response;
	}

	event.locals.kv = platform.env.KV;

	const authPassword = platform.env.AUTH_PASSWORD;
	event.locals.authMode = authPassword ? 'password' : 'cloudflare-access';

	if (event.locals.authMode === 'cloudflare-access') {
		event.locals.authenticated = true;
	} else {
		const cookie = event.request.headers.get('cookie');
		event.locals.authenticated = await verifySessionCookie(cookie, authPassword!);
	}

	const pathname = event.url.pathname;
	const isLoginRoute = pathname === '/login';
	const isApiRoute = pathname.startsWith('/api/');

	if (!event.locals.authenticated && !isLoginRoute) {
		if (isApiRoute) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
			});
		}
		throw redirect(302, '/login');
	}

	if (event.locals.authenticated && isLoginRoute) {
		throw redirect(302, '/');
	}

	const response = await resolve(event);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(key, value);
	}
	return response;
};
