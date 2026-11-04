import { APP_CATEGORIES, CatalogError, type EntryDraft, SUBMIT_CATS, type SubmitCat, buildEntry, entryProblem } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { type BotConfig, SubmissionsBusy, openSubmission, verifyTurnstile } from '../../server/submit';

// GET says whether the bot is set up (and gives the Turnstile site key); POST submits an entry. Error codes: invalid, limited, captcha, busy, disabled, github.

type Submission = EntryDraft & { cat: SubmitCat; mode: 'native' | 'web'; token: string };

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
	const mode = r.mode === 'web' ? 'web' : r.mode === 'native' || r.mode === undefined ? 'native' : undefined;
	const [name, author, url, desc, token] = [str('name'), str('author') ?? '', str('url'), str('desc') ?? '', str('token')];
	// A showcase entry may name its category; anything not in the schema's list is refused rather than dropped.
	const category = r.category === undefined ? undefined : APP_CATEGORIES.find((c) => c === r.category);
	if (r.category !== undefined && (!category || cat !== 'showcase')) return undefined;
	if (!cat || !mode || name === undefined || url === undefined || !token || token.length > 2048) return undefined;
	return { cat, mode, name, author, url, desc, token, category };
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
				if (!sub) return json({ error: 'invalid', message: 'expected a JSON object with cat, name, url, desc, author, token and, for the showcase, an optional category' }, 400);
				const problem = entryProblem(sub.cat, sub);
				if (problem) return json({ error: 'invalid', message: problem }, 400);
				if (!(await verifyTurnstile(cfg.turnstileSecret, sub.token, ip))) return json({ error: 'captcha' }, 403);
				const entry = buildEntry(sub.cat, sub, sub.mode, { name: '', desc: '' });
				try {
					return json(await openSubmission(cfg, sub.cat, sub.name.trim(), entry));
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
