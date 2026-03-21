import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	await locals.kv.put('settings:onboarded', '1');
	return json({ ok: true });
};
