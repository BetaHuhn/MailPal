import { redirect, type Handle } from '@sveltejs/kit';
import { DEMO_URL, GITHUB_URL } from '$lib';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	if (path === '/github') {
		throw redirect(301, GITHUB_URL);
	}

	if (path === '/demo') {
		throw redirect(301, DEMO_URL);
	}

	return resolve(event);
};
