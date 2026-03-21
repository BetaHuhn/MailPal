import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteAlias, getAlias, putAlias } from '$lib/kv.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const alias = await getAlias(locals.kv, params.domain, params.localPart);
	if (!alias) return json({ error: 'Not found' }, { status: 404 });
	return json(alias);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const alias = await getAlias(locals.kv, params.domain, params.localPart);
	if (!alias) return json({ error: 'Not found' }, { status: 404 });

	const body = await request.json();
	const { enabled, targetEmail, note, tags } = body;

	const updated = {
		...alias,
		...(enabled !== undefined && { enabled }),
		...(targetEmail !== undefined && { targetEmail: targetEmail === '' ? null : targetEmail }),
		...(note !== undefined && { note: note || undefined }),
		...(tags !== undefined && { tags })
	};

	await putAlias(locals.kv, updated);
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const alias = await getAlias(locals.kv, params.domain, params.localPart);
	if (!alias) return json({ error: 'Not found' }, { status: 404 });

	await deleteAlias(locals.kv, params.domain, params.localPart);
	return new Response(null, { status: 204 });
};
