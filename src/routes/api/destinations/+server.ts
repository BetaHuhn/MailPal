import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listDestinations, putDestination } from '$lib/kv.js';
import type { DestinationAddress } from '$lib/types.js';

export const GET: RequestHandler = async ({ locals }) => {
	const destinations = await listDestinations(locals.kv);
	destinations.sort((a, b) => a.createdAt - b.createdAt);
	return json(destinations);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { email } = await request.json() as { email?: string };

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ error: 'A valid email address is required' }, { status: 400 });
	}

	const existing = await listDestinations(locals.kv);
	if (existing.some((d) => d.email === email)) {
		return json({ error: 'Address already exists' }, { status: 409 });
	}

	const dest: DestinationAddress = { email, createdAt: Date.now() };
	await putDestination(locals.kv, dest);
	return json(dest, { status: 201 });
};
