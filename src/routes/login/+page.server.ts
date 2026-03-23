import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, COOKIE_NAME, COOKIE_MAX_AGE } from '$lib/auth.js';

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

		const sealed = await createSession(authPassword);

		cookies.set(COOKIE_NAME, sealed, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: COOKIE_MAX_AGE
		});

		throw redirect(302, '/');
	}
};
