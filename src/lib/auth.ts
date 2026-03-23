import { sealData, unsealData } from 'iron-session';

export const COOKIE_NAME = 'mailpal_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

interface SessionData {
	authenticated: boolean;
}

/**
 * Seals session data into an encrypted, authenticated token string.
 * Uses iron-session (AES-256-CBC + HMAC-SHA-256) which is compatible
 * with the Web Crypto API available in Cloudflare Workers.
 */
export async function createSession(password: string): Promise<string> {
	const data: SessionData = { authenticated: true };
	return sealData(data, { password, ttl: COOKIE_MAX_AGE });
}

/**
 * Verifies a sealed session token and returns true if the session is valid.
 * Returns false for any invalid or tampered token.
 */
export async function verifySession(sealed: string | undefined, password: string): Promise<boolean> {
	if (!sealed) return false;
	try {
		const data = await unsealData<SessionData>(sealed, { password, ttl: COOKIE_MAX_AGE });
		return data.authenticated === true;
	} catch {
		return false;
	}
}
