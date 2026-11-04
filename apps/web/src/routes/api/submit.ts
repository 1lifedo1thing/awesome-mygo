import { APP_CATEGORIES, CatalogError, type EntryDraft, SUBMIT_CATS, type SubmitCat, buildEntry, entryProblem, pastedEntryProblem, pastedName } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type BotConfig, SubmissionsBusy, openSubmission, verifyTurnstile } from '../../server/submit';

// GET says whether the bot is set up (and gives the Turnstile site key); POST submits an entry. Error codes: invalid, limited, captcha, busy, disabled, github.

// Either the form's fields, from which the entry is built, or an entry pasted whole, which goes in as written.
type Submission = { cat: SubmitCat; token: string } & ({ kind: 'form'; draft: EntryDraft; mode: 'native' | 'web' } | { kind: 'entry'; entry: Record<string, unknown> });

const MAX_BODY = 16 * 1024;

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

// The bot is off until all four secrets are set, so the site works the same before the GitHub App exists.
function botConfig(): BotConfig | undefined {
	const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY } = env;
	if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY || !TURNSTILE_SITE_KEY || !TURNSTILE_SECRET_KEY) return undefined;
	// A key pasted with literal \n (as some secret stores keep it) is turned back into lines.
	const privateKey = GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
	// GitHub hands out PKCS#1 keys, but the Workers runtime's WebCrypto only imports PKCS#8.
	if (privateKey.includes('BEGIN RSA PRIVATE KEY')) {
		console.error('GITHUB_APP_PRIVATE_KEY is PKCS#1; convert it with `openssl pkcs8 -topk8 -nocrypt -in key.pem` and set the secret again');
		return undefined;
	}
	return { appId: GITHUB_APP_ID, privateKey, siteKey: TURNSTILE_SITE_KEY, turnstileSecret: TURNSTILE_SECRET_KEY };
}

// The request body is untrusted: anything but the expected shape is rejected here, before any field is used.
async function readSubmission(request: Request): Promise<Submission | undefined> {
	if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return undefined;
	let raw: unknown;
	try {
		const text = await request.text();
		if (text.length > MAX_BODY) return undefined;
		raw = JSON.parse(text);
	} catch {
		return undefined;
	}
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
	const r = raw as Record<string, unknown>;
	const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : undefined);
	const cat = SUBMIT_CATS.find((c) => c === r.cat);
	const token = str('token');
	if (!cat || !token || token.length > 2048) return undefined;
	if (r.entry !== undefined) return r.entry && typeof r.entry === 'object' && !Array.isArray(r.entry) ? { cat, token, kind: 'entry', entry: r.entry as Record<string, unknown> } : undefined;
	const mode = r.mode === 'web' ? 'web' : r.mode === 'native' || r.mode === undefined ? 'native' : undefined;
	const [name, author, url, desc, repo, screenshot] = [str('name'), str('author') ?? '', str('url'), str('desc') ?? '', str('repo'), str('screenshot')];
	// A showcase entry may name its category; anything not in the schema's list is refused rather than dropped.
	const category = r.category === undefined ? undefined : APP_CATEGORIES.find((c) => c === r.category);
	if (r.category !== undefined && (!category || cat !== 'showcase')) return undefined;
	// Only a showcase app has a repository besides its link.
	if (r.repo !== undefined && (repo === undefined || cat !== 'showcase')) return undefined;
	// So is a screenshot link; entryProblem judges the link itself.
	if (r.screenshot !== undefined && (screenshot === undefined || cat !== 'showcase')) return undefined;
	if (!mode || name === undefined || url === undefined) return undefined;
	return { cat, token, kind: 'form', mode, draft: { name, author, url, desc, category, repo, screenshot } };
}

export const Route = createFileRoute('/api/submit')({
	server: {
		handlers: {
			GET: () => {
				const cfg = botConfig();
				return json(cfg ? { enabled: true, siteKey: cfg.siteKey } : { enabled: false });
			},
			POST: async ({ request }) => {
				const cfg = botConfig();
				if (!cfg) return json({ error: 'disabled' }, 503);
				const ip = request.headers.get('cf-connecting-ip') ?? '';
				if (!(await env.SUBMIT_LIMIT.limit({ key: ip || 'unknown' })).success) return json({ error: 'limited' }, 429);
				const sub = await readSubmission(request);
				if (!sub) return json({ error: 'invalid', message: 'expected a JSON object with cat, token and either entry (a whole entry) or name, url, desc, author and, for the showcase, an optional category, repo and screenshot' }, 400);
				const problem = sub.kind === 'entry' ? pastedEntryProblem(sub.cat, sub.entry) : entryProblem(sub.cat, sub.draft);
				if (problem) return json({ error: 'invalid', message: problem }, 400);
				if (!(await verifyTurnstile(cfg.turnstileSecret, sub.token, ip))) return json({ error: 'captcha' }, 403);
				const [entry, name] = sub.kind === 'entry' ? [sub.entry, pastedName(sub.entry)] : [buildEntry(sub.cat, sub.draft, sub.mode, { name: '', desc: '' }), sub.draft.name.trim()];
				try {
					const screenshot = sub.kind === 'form' ? sub.draft.screenshot?.trim() || undefined : undefined;
					return json(await openSubmission(cfg, sub.cat, name, entry, screenshot));
				} catch (err) {
					if (err instanceof CatalogError) return json({ error: 'invalid', message: err.message }, 409);
					if (err instanceof SubmissionsBusy) return json({ error: 'busy' }, 503);
					console.error('submission failed', err);
					return json({ error: 'github' }, 502);
				}
			},
		},
	},
});
