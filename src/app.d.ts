import type { KVNamespace } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Platform {
			env: {
				KV: KVNamespace;
				AUTH_PASSWORD?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
		interface Locals {
			kv: KVNamespace;
			authMode: 'password' | 'cloudflare-access';
			authenticated: boolean;
		}
		interface Error {}
		interface PageData {}
	}
}

export {};
