import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDomain, getAlias, listAliases, putAlias } from '$lib/kv.js';
import { generateSlug } from '$lib/sluggen.js';
import type { AliasConfig } from '$lib/types.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const domain = await getDomain(locals.kv, params.domain);
	if (!domain) return json({ error: 'Domain not found' }, { status: 404 });

	const aliases = await listAliases(locals.kv, params.domain);
	aliases.sort((a, b) => a.createdAt - b.createdAt);
	return json(aliases);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const domain = await getDomain(locals.kv, params.domain);
	if (!domain) return json({ error: 'Domain not found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	let { localPart, targetEmail = null, note, tags } = body as { localPart?: string; targetEmail?: string | null; note?: string; tags?: string[] };

	if (!localPart) {
		// Auto-generate unique slug
		let attempts = 0;
		do {
			localPart = generateSlug();
			attempts++;
		} while ((await getAlias(locals.kv, params.domain, localPart)) && attempts < 10);
	} else {
		// Validate local part
		if (!/^[a-zA-Z0-9._+-]+$/.test(localPart)) {
			return json({ error: 'Invalid localPart' }, { status: 400 });
		}
		const existing = await getAlias(locals.kv, params.domain, localPart);
		if (existing) return json({ error: 'Alias already exists' }, { status: 409 });
	}

	const config: AliasConfig = {
		localPart,
		domain: params.domain,
		targetEmail: targetEmail ?? null,
		enabled: true,
		createdAt: Date.now(),
		forwardedCount: 0,
		blockedCount: 0,
		lastUsedAt: null,
		autoCreated: false,
		...(note && { note }),
		...(tags && { tags })
	};

	await putAlias(locals.kv, config);
	return json(config, { status: 201 });
};
