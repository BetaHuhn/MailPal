import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteTag, listAliases, listDomains, putAlias, putTag } from '$lib/kv.js';
import type { Tag } from '$lib/types.js';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const existing = await locals.kv.get(`tag:${params.name}`);
	if (!existing) return json({ error: 'Tag not found' }, { status: 404 });

	const tag = JSON.parse(existing) as Tag;
	const body = await request.json().catch(() => ({}));
	const { color } = body as { color?: string };

	const updated: Tag = { ...tag, ...(color !== undefined && { color }) };
	await putTag(locals.kv, updated);
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const existing = await locals.kv.get(`tag:${params.name}`);
	if (!existing) return json({ error: 'Tag not found' }, { status: 404 });

	await deleteTag(locals.kv, params.name);

	// Remove tag from all aliases
	const domains = await listDomains(locals.kv);
	const allAliases = (await Promise.all(domains.map((d) => listAliases(locals.kv, d.domain)))).flat();
	const affected = allAliases.filter((a) => a.tags?.includes(params.name));
	await Promise.all(
		affected.map((a) => putAlias(locals.kv, { ...a, tags: a.tags!.filter((t) => t !== params.name) }))
	);

	return new Response(null, { status: 204 });
};
