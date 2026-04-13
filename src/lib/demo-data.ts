import type { AliasConfig, DestinationAddress, DomainConfig, LogEntry, Tag } from './types.js';

// ─── Reference timestamps ──────────────────────────────────────────────────────
const NOW = 1_744_000_000_000; // fixed "now" so data looks consistent in demos
const DAY = 86_400_000;

// ─── Destinations ─────────────────────────────────────────────────────────────
const DESTINATIONS: DestinationAddress[] = [
	{ email: 'you@gmail.com', createdAt: NOW - 30 * DAY },
	{ email: 'work@company.com', createdAt: NOW - 25 * DAY }
];

// ─── Tags ─────────────────────────────────────────────────────────────────────
const TAGS: Tag[] = [
	{ name: 'shopping', color: '#f59e0b', createdAt: NOW - 28 * DAY },
	{ name: 'signups', color: '#3b82f6', createdAt: NOW - 27 * DAY },
	{ name: 'newsletters', color: '#8b5cf6', createdAt: NOW - 20 * DAY }
];

// ─── Domains ──────────────────────────────────────────────────────────────────
const DOMAINS: DomainConfig[] = [
	{
		domain: 'aliases.acme.com',
		targetEmail: 'you@gmail.com',
		wildcardEnabled: false,
		enabled: true,
		createdAt: NOW - 29 * DAY,
		color: '#3b82f6'
	},
	{
		domain: 'shopping.example.com',
		targetEmail: 'work@company.com',
		wildcardEnabled: true,
		enabled: true,
		createdAt: NOW - 24 * DAY,
		color: '#22c55e'
	}
];

// ─── Aliases ──────────────────────────────────────────────────────────────────
const ALIASES: AliasConfig[] = [
	{
		localPart: 'github-oauth',
		domain: 'aliases.acme.com',
		targetEmail: null,
		enabled: true,
		createdAt: NOW - 28 * DAY,
		forwardedCount: 47,
		blockedCount: 0,
		lastUsedAt: NOW - 2 * DAY,
		autoCreated: false,
		note: 'Used for GitHub login notifications',
		tags: ['signups']
	},
	{
		localPart: 'linkedin-alerts',
		domain: 'aliases.acme.com',
		targetEmail: null,
		enabled: false,
		createdAt: NOW - 26 * DAY,
		forwardedCount: 312,
		blockedCount: 8,
		lastUsedAt: NOW - 5 * DAY,
		autoCreated: false,
		tags: ['newsletters'],
		note: 'Disabled — too noisy'
	},
	{
		localPart: 'aws-billing',
		domain: 'aliases.acme.com',
		targetEmail: 'work@company.com',
		enabled: true,
		createdAt: NOW - 22 * DAY,
		forwardedCount: 14,
		blockedCount: 0,
		lastUsedAt: NOW - 1 * DAY,
		autoCreated: false,
		tags: ['signups']
	},
	{
		localPart: 'producthunt',
		domain: 'aliases.acme.com',
		targetEmail: null,
		enabled: true,
		createdAt: NOW - 18 * DAY,
		forwardedCount: 5,
		blockedCount: 0,
		lastUsedAt: NOW - 10 * DAY,
		autoCreated: false,
		tags: ['newsletters']
	},
	{
		localPart: 'stripe-notifications',
		domain: 'aliases.acme.com',
		targetEmail: 'work@company.com',
		enabled: true,
		createdAt: NOW - 15 * DAY,
		forwardedCount: 88,
		blockedCount: 1,
		lastUsedAt: NOW - 4 * DAY,
		autoCreated: false
	},
	{
		localPart: 'temp-conference-2024',
		domain: 'aliases.acme.com',
		targetEmail: null,
		enabled: false,
		createdAt: NOW - 12 * DAY,
		forwardedCount: 3,
		blockedCount: 0,
		lastUsedAt: NOW - 60 * DAY,
		autoCreated: false,
		note: 'One-time use for a conference badge scan',
		expiresAt: NOW - 8 * DAY
	},
	{
		localPart: 'swift-meadow-412',
		domain: 'aliases.acme.com',
		targetEmail: null,
		enabled: true,
		createdAt: NOW - 7 * DAY,
		forwardedCount: 0,
		blockedCount: 0,
		lastUsedAt: null,
		autoCreated: false,
		maxForwards: 5
	},
	{
		localPart: 'amazon-orders',
		domain: 'shopping.example.com',
		targetEmail: null,
		enabled: true,
		createdAt: NOW - 23 * DAY,
		forwardedCount: 134,
		blockedCount: 3,
		lastUsedAt: NOW - 1 * DAY,
		autoCreated: false,
		tags: ['shopping']
	},
	{
		localPart: 'ebay-alerts',
		domain: 'shopping.example.com',
		targetEmail: null,
		enabled: true,
		createdAt: NOW - 19 * DAY,
		forwardedCount: 22,
		blockedCount: 2,
		lastUsedAt: NOW - 3 * DAY,
		autoCreated: false,
		tags: ['shopping']
	},
	{
		localPart: 'steam-store',
		domain: 'shopping.example.com',
		targetEmail: 'you@gmail.com',
		enabled: true,
		createdAt: NOW - 16 * DAY,
		forwardedCount: 9,
		blockedCount: 0,
		lastUsedAt: NOW - 6 * DAY,
		autoCreated: false,
		tags: ['shopping', 'newsletters']
	},
	{
		localPart: 'bold-river-881',
		domain: 'shopping.example.com',
		targetEmail: null,
		enabled: true,
		createdAt: NOW - 4 * DAY,
		forwardedCount: 1,
		blockedCount: 0,
		lastUsedAt: NOW - 4 * DAY,
		autoCreated: true
	},
	{
		localPart: 'etsy-orders',
		domain: 'shopping.example.com',
		targetEmail: null,
		enabled: true,
		createdAt: NOW - 2 * DAY,
		forwardedCount: 0,
		blockedCount: 0,
		lastUsedAt: null,
		autoCreated: false,
		tags: ['shopping']
	}
];

// ─── Activity logs ─────────────────────────────────────────────────────────────
// keyed as "domain/localPart" → log entries
const LOGS: Record<string, LogEntry[]> = {
	'aliases.acme.com/github-oauth': [
		{ at: NOW - 2 * DAY - 3_600_000, action: 'forwarded', from: 'noreply@github.com', to: 'you@gmail.com' },
		{ at: NOW - 4 * DAY, action: 'forwarded', from: 'noreply@github.com', to: 'you@gmail.com' },
		{ at: NOW - 6 * DAY, action: 'forwarded', from: 'noreply@github.com', to: 'you@gmail.com' }
	],
	'aliases.acme.com/linkedin-alerts': [
		{ at: NOW - 5 * DAY, action: 'blocked', from: 'messages-noreply@linkedin.com', to: 'you@gmail.com' },
		{ at: NOW - 5 * DAY + 60_000, action: 'blocked', from: 'jobs-listings@linkedin.com', to: 'you@gmail.com' },
		{ at: NOW - 5 * DAY + 120_000, action: 'blocked', from: 'updates@linkedin.com', to: 'you@gmail.com' }
	],
	'aliases.acme.com/aws-billing': [
		{ at: NOW - 1 * DAY, action: 'forwarded', from: 'billing@amazon.com', to: 'work@company.com' },
		{ at: NOW - 8 * DAY, action: 'forwarded', from: 'billing@amazon.com', to: 'work@company.com' }
	],
	'aliases.acme.com/stripe-notifications': [
		{ at: NOW - 4 * DAY, action: 'forwarded', from: 'notifications@stripe.com', to: 'work@company.com' },
		{ at: NOW - 4 * DAY + 10_000, action: 'blocked', from: 'promo@stripe.com', to: 'work@company.com' },
		{ at: NOW - 7 * DAY, action: 'forwarded', from: 'notifications@stripe.com', to: 'work@company.com' }
	],
	'shopping.example.com/amazon-orders': [
		{ at: NOW - 1 * DAY, action: 'forwarded', from: 'shipment-tracking@amazon.com', to: 'work@company.com' },
		{ at: NOW - 2 * DAY, action: 'forwarded', from: 'order-update@amazon.com', to: 'work@company.com' },
		{ at: NOW - 3 * DAY, action: 'blocked', from: 'deals@amazon.com', to: 'work@company.com' },
		{ at: NOW - 5 * DAY, action: 'forwarded', from: 'shipment-tracking@amazon.com', to: 'work@company.com' }
	],
	'shopping.example.com/ebay-alerts': [
		{ at: NOW - 3 * DAY, action: 'forwarded', from: 'ebay@ebay.com', to: 'work@company.com' },
		{ at: NOW - 9 * DAY, action: 'blocked', from: 'marketing@ebay.com', to: 'work@company.com' }
	],
	'shopping.example.com/bold-river-881': [
		{ at: NOW - 4 * DAY, action: 'forwarded', from: 'confirm@shop.example.com', to: 'work@company.com' }
	]
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildDemoKVData(): Map<string, string> {
	const store = new Map<string, string>();

	// Suppress the onboarding wizard
	store.set('settings:onboarded', '1');

	for (const d of DESTINATIONS) {
		store.set(`destination:${d.email}`, JSON.stringify(d));
	}

	for (const t of TAGS) {
		store.set(`tag:${t.name}`, JSON.stringify(t));
	}

	for (const d of DOMAINS) {
		store.set(`domain:${d.domain}`, JSON.stringify(d));
	}

	for (const a of ALIASES) {
		store.set(`alias:${a.domain}/${a.localPart}`, JSON.stringify(a));
	}

	for (const [key, entries] of Object.entries(LOGS)) {
		store.set(`log:${key}`, JSON.stringify(entries));
	}

	return store;
}
