import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDomain, listDomains, putDomain } from '$lib/kv.js';
import type { DomainConfig } from '$lib/types.js';

export const GET: RequestHandler = async ({ locals }) => {
	const domains = await listDomains(locals.kv);
	domains.sort((a, b) => a.createdAt - b.createdAt);
	return json(domains);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const { domain, targetEmail, wildcardEnabled = false } = body as Partial<DomainConfig>;

	if (!domain || !targetEmail) {
		return json({ error: 'domain and targetEmail are required' }, { status: 400 });
	}

	const existing = await getDomain(locals.kv, domain);
	if (existing) {
		return json({ error: 'Domain already exists' }, { status: 409 });
	}

	const config: DomainConfig = {
		domain,
		targetEmail,
		wildcardEnabled: wildcardEnabled ?? false,
		enabled: true,
		createdAt: Date.now()
	};

	await putDomain(locals.kv, config);
	return json(config, { status: 201 });
};
