import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSessionCookie } from '$lib/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.authenticated) throw redirect(302, '/');
	return { authMode: locals.authMode };
};

export const actions: Actions = {
	default: async ({ request, platform, cookies }) => {
		const authPassword = platform?.env?.AUTH_PASSWORD;
		if (!authPassword) {
			return fail(400, { error: 'Password auth is not configured' });
		}

		const data = await request.formData();
		const password = data.get('password') as string;

		if (!password || password !== authPassword) {
			return fail(401, { error: 'Invalid password' });
		}

		const cookieHeader = await createSessionCookie(authPassword);
		// Parse the Set-Cookie header to extract name/value/options
		const parts = cookieHeader.split(';').map((p) => p.trim());
		const [nameVal, ...attrs] = parts;
		const [, value] = nameVal.split('=');

		const maxAgeAttr = attrs.find((a) => a.toLowerCase().startsWith('max-age='));
		const maxAge = maxAgeAttr ? parseInt(maxAgeAttr.split('=')[1]) : 60 * 60 * 24 * 30;

		cookies.set('mailpal_session', decodeURIComponent(value), {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge
		});

		throw redirect(302, '/');
	}
};
