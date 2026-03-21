import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteDomain, getDomain, listAliases, deleteAlias, putDomain } from '$lib/kv.js';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export const GET: RequestHandler = async ({ params, locals }) => {
	const config = await getDomain(locals.kv, params.domain);
	if (!config) return json({ error: 'Not found' }, { status: 404 });
	return json(config);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const config = await getDomain(locals.kv, params.domain);
	if (!config) return json({ error: 'Not found' }, { status: 404 });

	const body = await request.json();
	const { targetEmail, wildcardEnabled, enabled, color } = body;

	if (color !== undefined && color !== null && !HEX_COLOR_RE.test(color)) {
		return json({ error: 'Invalid color value' }, { status: 400 });
	}

	const updated = {
		...config,
		...(targetEmail !== undefined && { targetEmail }),
		...(wildcardEnabled !== undefined && { wildcardEnabled }),
		...(enabled !== undefined && { enabled }),
		// null clears the custom color (reverts to auto); undefined means not sent
		...(color !== undefined && { color: color ?? undefined })
	};

	await putDomain(locals.kv, updated);
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const config = await getDomain(locals.kv, params.domain);
	if (!config) return json({ error: 'Not found' }, { status: 404 });

	// Delete all aliases for this domain
	const aliases = await listAliases(locals.kv, params.domain);
	await Promise.all(aliases.map((a) => deleteAlias(locals.kv, a.domain, a.localPart)));

	await deleteDomain(locals.kv, params.domain);
	return new Response(null, { status: 204 });
};
