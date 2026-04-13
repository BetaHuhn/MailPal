import { redirect, type Handle } from '@sveltejs/kit';
import { verifySession, COOKIE_NAME } from '$lib/auth.js';
import { DemoKV, type DemoDelta } from '$lib/demo-kv.js';

const DEMO_STATE_COOKIE = 'demo_state';

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const platform = event.platform;

	console.log(`Handling request for ${event.url.pathname} in mode ${platform?.env?.DEMO_MODE ? 'demo' : 'production'}`);

	// ── Demo mode ───────────────────────────────────────────────────────────
	if (platform?.env?.DEMO_MODE) {
		// Restore any previously saved mutations from the browser cookie.
		let savedDelta: DemoDelta | undefined;
		const raw = event.cookies.get(DEMO_STATE_COOKIE);
		if (raw) {
			try {
				const parsed: unknown = JSON.parse(raw);
				if (
					typeof parsed === 'object' &&
					parsed !== null &&
					!Array.isArray(parsed)
				) {
					savedDelta = parsed as DemoDelta;
				}
			} catch {
				// ignore corrupt cookie — fall back to default seed data
			}
		}

		const demoKV = new DemoKV(savedDelta);
		event.locals.kv = demoKV as unknown as App.Locals['kv'];
		event.locals.demo = true;
		event.locals.authenticated = true;
		event.locals.authMode = 'cloudflare-access';
		const response = await resolve(event);

		// Persist the accumulated delta back to the browser so the next request
		// (and localStorage — see +layout.svelte) picks up all mutations.
		const deltaJson = JSON.stringify(demoKV.getDelta());
		response.headers.append(
			'Set-Cookie',
			`${DEMO_STATE_COOKIE}=${encodeURIComponent(deltaJson)}; Path=/; SameSite=Lax; Max-Age=604800; Secure`
		);

		for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
			response.headers.set(key, value);
		}
		return response;
	}

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
		const sealed = event.cookies.get(COOKIE_NAME);
		event.locals.authenticated = await verifySession(sealed, authPassword!);
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
