import type { PageServerLoad } from './$types';
import { listDomains, listAliases, getLog } from '$lib/kv.js';
import type { LogEntry } from '$lib/types.js';

export interface ActivityEntry extends LogEntry {
	localPart: string;
	domain: string;
}

export const load: PageServerLoad = async ({ locals }) => {
	const domains = await listDomains(locals.kv);
	const allAliases = (await Promise.all(domains.map((d) => listAliases(locals.kv, d.domain)))).flat();

	const buckets = await Promise.all(
		allAliases.map(async (a) => {
			const log = await getLog(locals.kv, a.domain, a.localPart);
			return log.map((e): ActivityEntry => ({ ...e, localPart: a.localPart, domain: a.domain }));
		})
	);

	const entries = buckets.flat().sort((a, b) => b.at - a.at).slice(0, 200);
	return { entries, demo: locals.demo ?? false };
};
