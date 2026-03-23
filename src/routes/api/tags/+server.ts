import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listTags, putTag } from '$lib/kv.js';
import type { Tag } from '$lib/types.js';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const TAG_NAME_MAX_LENGTH = 50;

export const GET: RequestHandler = async ({ locals }) => {
	const tags = await listTags(locals.kv);
	tags.sort((a, b) => a.createdAt - b.createdAt);
	return json(tags);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => ({}));
	const { name, color } = body as { name?: string; color?: string };

	if (!name || !name.trim()) {
		return json({ error: 'Tag name is required' }, { status: 400 });
	}

	const trimmedName = name.trim();
	if (trimmedName.length > TAG_NAME_MAX_LENGTH) {
		return json({ error: `Tag name must be ${TAG_NAME_MAX_LENGTH} characters or fewer` }, { status: 400 });
	}

	if (color !== undefined && !HEX_COLOR_RE.test(color)) {
		return json({ error: 'Invalid color value' }, { status: 400 });
	}

	const existing = await locals.kv.get(`tag:${trimmedName}`);
	if (existing) return json({ error: 'Tag already exists' }, { status: 409 });

	const tag: Tag = {
		name: trimmedName,
		color: color ?? '#3b82f6',
		createdAt: Date.now()
	};

	await putTag(locals.kv, tag);
	return json(tag, { status: 201 });
};
