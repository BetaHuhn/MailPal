import type { KVNamespace, EmailMessage, ExecutionContext } from '@cloudflare/workers-types';
import type { AliasConfig, DomainConfig } from '../../src/lib/types.js';

interface Env {
	KV: KVNamespace;
}

interface LogEntry {
	at: number;
	action: 'forwarded' | 'blocked';
	from: string;
	to: string;
}

async function appendLog(
	kv: KVNamespace,
	domain: string,
	localPart: string,
	entry: LogEntry
): Promise<void> {
	const key = `log:${domain}/${localPart}`;
	let log: LogEntry[] = [];
	try {
		const existing = await kv.get(key);
		if (existing) log = JSON.parse(existing);
	} catch { /* ignore malformed */ }
	log.unshift(entry);
	if (log.length > 50) log.length = 50;
	await kv.put(key, JSON.stringify(log));
}

export default {
	async email(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		const to = message.to;
		const atIdx = to.indexOf('@');

		if (atIdx === -1) {
			console.log('Invalid email address:', to);
			message.setReject('Invalid address');
			return;
		}

		const localPart = to.slice(0, atIdx).toLowerCase();
		const domain = to.slice(atIdx + 1).toLowerCase();

		try {
			// 1. Load domain config
			const domainVal = await env.KV.get(`domain:${domain}`);
			if (!domainVal) {
				console.log('Unknown domain:', domain);
				message.setReject('Unknown domain');
				return;
			}

			const domainConfig = JSON.parse(domainVal) as DomainConfig;
			if (!domainConfig.enabled) {
				console.log('Disabled domain:', domain);
				message.setReject('Domain disabled');
				return;
			}

			// 2. Load alias
			const aliasKey = `alias:${domain}/${localPart}`;
			let aliasVal = await env.KV.get(aliasKey);
			let aliasConfig: AliasConfig | null = aliasVal ? JSON.parse(aliasVal) : null;

			// 3. Wildcard auto-create
			if (!aliasConfig && domainConfig.wildcardEnabled) {
				aliasConfig = {
					localPart,
					domain,
					targetEmail: null,
					enabled: true,
					createdAt: Date.now(),
					forwardedCount: 0,
					blockedCount: 0,
					lastUsedAt: null,
					autoCreated: true
				};
				ctx.waitUntil(env.KV.put(aliasKey, JSON.stringify(aliasConfig)));
			}

			// 4. Still not found
			if (!aliasConfig) {
				console.log('Unknown alias:', domain, localPart);
				message.setReject('Unknown alias');
				return;
			}

			// 5. Alias disabled
			if (!aliasConfig.enabled) {
				const now = Date.now();
				const wouldBeTarget = aliasConfig.targetEmail ?? domainConfig.targetEmail;
				const updated: AliasConfig = {
					...aliasConfig,
					blockedCount: aliasConfig.blockedCount + 1,
					lastUsedAt: now
				};
				ctx.waitUntil(env.KV.put(aliasKey, JSON.stringify(updated)));
				ctx.waitUntil(appendLog(env.KV, domain, localPart, { at: now, action: 'blocked', from: message.from, to: wouldBeTarget }));
				console.log('Disabled alias:', domain, localPart);
				message.setReject('Alias disabled');
				return;
			}

			// 5a. Date expiry
			if (aliasConfig.expiresAt && Date.now() > aliasConfig.expiresAt) {
				const now = Date.now();
				const wouldBeTarget = aliasConfig.targetEmail ?? domainConfig.targetEmail;
				const updated: AliasConfig = {
					...aliasConfig,
					enabled: false,
					blockedCount: aliasConfig.blockedCount + 1,
					lastUsedAt: now
				};
				ctx.waitUntil(env.KV.put(aliasKey, JSON.stringify(updated)));
				ctx.waitUntil(appendLog(env.KV, domain, localPart, { at: now, action: 'blocked', from: message.from, to: wouldBeTarget }));
				console.log('Expired alias:', domain, localPart);
				message.setReject('Alias expired');
				return;
			}

			// 5b. Forward count limit
			if (aliasConfig.maxForwards != null && aliasConfig.forwardedCount >= aliasConfig.maxForwards) {
				const now = Date.now();
				const wouldBeTarget = aliasConfig.targetEmail ?? domainConfig.targetEmail;
				const updated: AliasConfig = {
					...aliasConfig,
					enabled: false,
					blockedCount: aliasConfig.blockedCount + 1,
					lastUsedAt: now
				};
				ctx.waitUntil(env.KV.put(aliasKey, JSON.stringify(updated)));
				ctx.waitUntil(appendLog(env.KV, domain, localPart, { at: now, action: 'blocked', from: message.from, to: wouldBeTarget }));
				console.log('Forward limit reached for alias:', domain, localPart);
				message.setReject('Forward limit reached');
				return;
			}

			// 6. Resolve target and forward
			const target = aliasConfig.targetEmail ?? domainConfig.targetEmail;
			await message.forward(target);

			// 7. Update stats + log async
			const now = Date.now();
			const updated: AliasConfig = {
				...aliasConfig,
				forwardedCount: aliasConfig.forwardedCount + 1,
				lastUsedAt: now
			};
			ctx.waitUntil(env.KV.put(aliasKey, JSON.stringify(updated)));
			ctx.waitUntil(appendLog(env.KV, domain, localPart, { at: now, action: 'forwarded', from: message.from, to: target }));
			console.log('Forwarded email for', to, 'to', target);
		} catch (e) {
			console.error('Error processing email for', to, e);
			message.setReject('Internal error');
		}
	}
} satisfies ExportedHandler<Env>;
