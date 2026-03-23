import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDomain, listDomains, putDomain } from '$lib/kv.js';
import type { DomainConfig } from '$lib/types.js';

// RFC 1123 hostname validation (does not allow bare TLDs)
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export const GET: RequestHandler = async ({ locals }) => {
	const domains = await listDomains(locals.kv);
	domains.sort((a, b) => a.createdAt - b.createdAt);
	return json(domains);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const { domain, targetEmail, wildcardEnabled = false, color } = body as Partial<DomainConfig>;

	if (!domain || !targetEmail) {
		return json({ error: 'domain and targetEmail are required' }, { status: 400 });
	}

	if (!DOMAIN_RE.test(domain)) {
		return json({ error: 'Invalid domain name' }, { status: 400 });
	}

	if (color !== undefined && color !== null && !HEX_COLOR_RE.test(color)) {
		return json({ error: 'Invalid color value' }, { status: 400 });
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
		createdAt: Date.now(),
		...(color && { color })
	};

	await putDomain(locals.kv, config);
	return json(config, { status: 201 });
};
