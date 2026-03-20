import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteDestination } from '$lib/kv.js';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await deleteDestination(locals.kv, params.email);
	return json({ ok: true });
};
