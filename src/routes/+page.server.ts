import type { PageServerLoad } from './$types';
import { listDomains, listAliases, listDestinations, listTags } from '$lib/kv.js';

export const load: PageServerLoad = async ({ locals }) => {
	const [domains, destinations, tags] = await Promise.all([
		listDomains(locals.kv),
		listDestinations(locals.kv),
		listTags(locals.kv)
	]);

	domains.sort((a, b) => a.createdAt - b.createdAt);
	destinations.sort((a, b) => a.createdAt - b.createdAt);
	tags.sort((a, b) => a.createdAt - b.createdAt);

	const allAliases = (await Promise.all(domains.map((d) => listAliases(locals.kv, d.domain)))).flat();
	allAliases.sort((a, b) => b.createdAt - a.createdAt);

	return { domains, allAliases, destinations, tags };
};
