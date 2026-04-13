import { buildDemoKVData } from './demo-data.js';

// Minimal subset of the KVNamespace interface that this app actually uses.
// All unused methods throw a clear error so accidental calls surface immediately.
interface MinimalKVNamespace {
	get(key: string): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
	delete(key: string): Promise<void>;
	list(options: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}

export class DemoKV implements MinimalKVNamespace {
	private readonly store: Map<string, string>;

	constructor() {
		this.store = buildDemoKVData();
	}

	async get(key: string): Promise<string | null> {
		return this.store.get(key) ?? null;
	}

	async put(key: string, value: string): Promise<void> {
		this.store.set(key, value);
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async list(options: { prefix?: string } = {}): Promise<{ keys: { name: string }[] }> {
		const prefix = options.prefix ?? '';
		const keys = [...this.store.keys()]
			.filter((k) => k.startsWith(prefix))
			.map((name) => ({ name }));
		return { keys };
	}
}
