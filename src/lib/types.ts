export interface DomainConfig {
	domain: string;
	targetEmail: string;
	wildcardEnabled: boolean;
	enabled: boolean;
	createdAt: number;
	color?: string;
}

export interface DestinationAddress {
	email: string;
	createdAt: number;
}

export interface Tag {
	name: string;
	color: string; // hex, e.g. "#3b82f6"
	createdAt: number;
}

export interface LogEntry {
	at: number;             // Unix ms
	action: 'forwarded' | 'blocked';
	from: string;           // sender address
	to: string;             // destination / would-be destination
}

export interface AliasConfig {
	localPart: string;
	domain: string;
	targetEmail: string | null; // null = inherit from domain
	enabled: boolean;
	createdAt: number;
	forwardedCount: number;
	blockedCount: number;
	lastUsedAt: number | null;
	autoCreated: boolean;
	note?: string;
	tags?: string[];
	expiresAt?: number;    // Unix ms — worker rejects after this timestamp
	maxForwards?: number;  // worker auto-disables when forwardedCount >= this
}
