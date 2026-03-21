import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAlias, getLog } from '$lib/kv.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const alias = await getAlias(locals.kv, params.domain, params.localPart);
	if (!alias) return json({ error: 'Not found' }, { status: 404 });

	const log = await getLog(locals.kv, params.domain, params.localPart);
	return json(log);
};
