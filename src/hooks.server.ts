import { redirect, type Handle } from '@sveltejs/kit';
import { verifySessionCookie } from '$lib/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	const platform = event.platform;

	if (!platform?.env?.KV) {
		// During local dev without wrangler, allow through
		event.locals.authMode = 'cloudflare-access';
		event.locals.authenticated = true;
		return resolve(event);
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
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(302, '/login');
	}

	if (event.locals.authenticated && isLoginRoute) {
		throw redirect(302, '/');
	}

	return resolve(event);
};
