const COOKIE_NAME = 'mailpal_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function hmacSign(password: string, data: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(password),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
	return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(password: string, data: string, sig: string): Promise<boolean> {
	const expected = await hmacSign(password, data);
	return expected === sig;
}

export async function createSessionCookie(password: string): Promise<string> {
	const payload = `session:${Date.now()}`;
	const sig = await hmacSign(password, payload);
	const value = encodeURIComponent(`${payload}:${sig}`);
	return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Path=/`;
}

export async function verifySessionCookie(
	cookieHeader: string | null,
	password: string
): Promise<boolean> {
	if (!cookieHeader) return false;

	const match = cookieHeader
		.split(';')
		.map((c) => c.trim())
		.find((c) => c.startsWith(`${COOKIE_NAME}=`));

	if (!match) return false;

	const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
	const lastColon = raw.lastIndexOf(':');
	if (lastColon === -1) return false;

	const payload = raw.slice(0, lastColon);
	const sig = raw.slice(lastColon + 1);

	return hmacVerify(password, payload, sig);
}

export function clearSessionCookie(): string {
	return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
}
