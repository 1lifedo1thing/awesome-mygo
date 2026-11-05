import { appendFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { TwitterApi } from 'twitter-api-v2';
import { type Counts, ENTRY_DIRS, type Entry, type EntryKind, composePost, githubUrl, sitePage } from './tweet.ts';

// Run by .github/workflows/announce.yml once for each entry a push to main adds: node src/main.ts <dir>/<slug>.json, the path under packages/catalog/data (apps/, ui/, state/ or plugins/). It waits until the site lists the entry, so the post's links work, then posts it to X.
//
// Environment: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and X_ACCESS_SECRET (the posting account's OAuth 1.0a keys; without them the post is only printed), DRY_RUN=true to only print it anyway, WAIT_SECONDS (how long to wait for the site, default 900; 0 skips the check), GITHUB_TOKEN for the repository's stars and its owner's X account, and GITHUB_STEP_SUMMARY.

const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = join(ROOT, 'packages/catalog/data');
const env = process.env;

function kindOf(dir: string): EntryKind {
	const kind = (Object.keys(ENTRY_DIRS) as EntryKind[]).find((k) => ENTRY_DIRS[k] === dir);
	if (!kind) throw new Error(`${dir}/ is not a directory of entries the site announces (${Object.values(ENTRY_DIRS).join(', ')})`);
	return kind;
}

async function counts(): Promise<Counts> {
	const n = async (kind: EntryKind) => (await readdir(join(DATA_DIR, ENTRY_DIRS[kind]))).filter((f) => f.endsWith('.json')).length;
	return { app: await n('app'), ui: await n('ui'), state: await n('state'), plugin: await n('plugin') };
}

// GitHub's answer for path, or undefined, with a warning, when it gives none: what the post takes from GitHub is not worth holding it back.
async function github<T>(path: string): Promise<T | undefined> {
	const res = await fetch(`https://api.github.com${path}`, {
		headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) },
		signal: AbortSignal.timeout(30_000),
	}).catch(() => undefined);
	if (!res?.ok) return void console.log(`::warning::GitHub did not answer for ${path} (${res?.status ?? 'no response'}); the post leaves out what it would have taken from it.`);
	return (await res.json()) as T;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

// Workers Builds deploys main on its own after the push; the page the post links to lists the entry once it has.
async function waitForSite(page: string, name: string, seconds: number): Promise<void> {
	const deadline = Date.now() + seconds * 1000;
	for (;;) {
		const res = await fetch(page, { signal: AbortSignal.timeout(30_000), headers: { 'cache-control': 'no-cache' } }).catch(() => undefined);
		const html = res?.ok ? await res.text() : '';
		if (html.includes(name) || html.includes(escapeHtml(name))) return console.log(`${page} lists ${name}.`);
		if (Date.now() >= deadline) throw new Error(`${page} still does not list ${name} after ${seconds} s; run the workflow again once the site is deployed`);
		await sleep(20_000);
	}
}

async function main(): Promise<void> {
	const path = process.argv[2];
	if (!path || !/^[a-z]+\/[a-z0-9-]+\.json$/.test(path)) throw new Error('usage: node src/main.ts <dir>/<slug>.json, e.g. ui/8bitmygoui.json');
	const [dir] = path.split('/');
	const kind = kindOf(dir);
	const entry = JSON.parse(await readFile(join(DATA_DIR, path), 'utf8')) as Entry;
	const name = typeof entry.name === 'string' ? entry.name : String(entry.slug);
	const repo = githubUrl(entry)?.slice('https://github.com/'.length);
	const info = repo ? await github<{ stargazers_count?: number; owner?: { login?: string } }>(`/repos/${repo}`) : undefined;
	const owner = info?.owner?.login ? await github<{ twitter_username?: string | null }>(`/users/${encodeURIComponent(info.owner.login)}`) : undefined;
	const text = composePost({ kind, entry, stars: info?.stargazers_count, handle: owner?.twitter_username ?? undefined, counts: await counts() });
	console.log(`---- post ----\n${text}\n--------------`);

	const [appKey, appSecret, accessToken, accessSecret] = [env.X_API_KEY, env.X_API_SECRET, env.X_ACCESS_TOKEN, env.X_ACCESS_SECRET];
	const summary = (md: string) => (env.GITHUB_STEP_SUMMARY ? appendFile(env.GITHUB_STEP_SUMMARY, `${md}\n`) : Promise.resolve());
	const block = `\n\n\`\`\`\n${text}\n\`\`\`\n`;
	if (env.DRY_RUN === 'true' || !appKey || !appSecret || !accessToken || !accessSecret) {
		const why = env.DRY_RUN === 'true' ? 'this is a dry run' : 'the X keys are not set (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)';
		console.log(`::notice::${name} was not posted, as ${why}.`);
		return summary(`### ${name}: not posted, as ${why}${block}`);
	}

	const wait = Number(env.WAIT_SECONDS ?? 900);
	if (wait > 0) await waitForSite(sitePage(kind, entry), name, wait);
	const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
	const { data } = await client.v2.tweet(text);
	const url = `https://x.com/i/status/${data.id}`;
	console.log(`Posted ${url}`);
	await summary(`### ${name}: posted ${url}${block}`);
}

await main();
