import { buildDemoKVData } from './demo-data.js';

// Minimal subset of the KVNamespace interface that this app actually uses.
// All unused methods throw a clear error so accidental calls surface immediately.
interface MinimalKVNamespace {
	get(key: string): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
	delete(key: string): Promise<void>;
	list(options: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}

/**
 * Serialised delta from the default seed state.
 * A string value means the key was set/updated; null means the key was deleted.
 */
export type DemoDelta = Record<string, string | null>;

export class DemoKV implements MinimalKVNamespace {
	private readonly store: Map<string, string>;
	private readonly mutations: Map<string, string | null>;

	constructor(savedDelta?: DemoDelta) {
		this.store = buildDemoKVData();
		this.mutations = new Map();

		if (savedDelta) {
			for (const [key, value] of Object.entries(savedDelta)) {
				if (value === null) {
					this.store.delete(key);
				} else {
					this.store.set(key, value);
				}
				this.mutations.set(key, value);
			}
		}
	}

	async get(key: string): Promise<string | null> {
		return this.store.get(key) ?? null;
	}

	async put(key: string, value: string): Promise<void> {
		this.store.set(key, value);
		this.mutations.set(key, value);
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
		this.mutations.set(key, null);
	}

	async list(options: { prefix?: string } = {}): Promise<{ keys: { name: string }[] }> {
		const prefix = options.prefix ?? '';
		const keys = [...this.store.keys()]
			.filter((k) => k.startsWith(prefix))
			.map((name) => ({ name }));
		return { keys };
	}

	/**
	 * Returns the complete accumulated delta from the default seed state
	 * (all keys loaded from a saved delta plus any new mutations this request).
	 * Safe to serialise and store in a cookie for the next request.
	 */
	getDelta(): DemoDelta {
		return Object.fromEntries(this.mutations);
	}
}
