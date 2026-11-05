import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DEFAULT_MODEL, type LlmConfig } from './copy.ts';
import { BRANCH_PREFIX, type CodeHit, KIND_LABELS, type Listed, MYGO_MODULE, type Seen, branchFor, configNear, entryFor, groupHits, isDue, listedAs, listedFrom, moduleOf, quiet, remember, requiresMygo, uniqueSlug } from './find.ts';
import { github, rawFile } from './github.ts';
import { ENTRY_DIRS, type Entry, type EntryKind } from './source.ts';
import { triage } from './triage.ts';

// Run by .github/workflows/discover.yml once a day. It looks on GitHub for projects whose go.mod requires MyGo and that the site does not list yet, asks the model whether each belongs on the site and as what, and opens a pull request for each one that does, completed as a submission is (main.ts: icon, screenshot, category and copy in every site language) and checked by the catalog's tests. A maintainer merges or closes it; a repository whose branch has had a pull request is never proposed again.
//
// The script works in the repository's working tree, checked out at main and clean, with origin/main fetched: for each proposal it checks out a branch of its own from origin/main, commits and pushes it, and leaves the tree detached at origin/main.
//
// Environment: GITHUB_TOKEN (the site's GitHub App, which pushes the branches and opens the pull requests, so CI runs on them; an installation token can search all public code), LLM_API_KEY with optional LLM_BASE_URL and LLM_MODEL, SEEN_FILE (where it remembers the repositories it looked at and did not propose), REPORT_FILE (a Markdown summary of the run), MAX_PRS (pull requests to open in a run, default 3), MAX_TRIAGE (repositories to ask the model about in a run, default 10), MAX_OPEN (no new pull request while this many of its own are open, default 10), and DRY_RUN=true to report what it would propose without pushing, opening or remembering anything. Without LLM_API_KEY it only lists the repositories it would ask about.

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = 'packages/catalog/data';
const PUBLIC = 'apps/web/public';
const BASE = 'main';

const env = process.env;
const SITE = env.GITHUB_REPOSITORY || 'yldm-tech/awesome-mygo';
const count = (v: string | undefined, fallback: number) => (v && /^\d+$/.test(v) ? Number(v) : fallback);
const MAX_PRS = count(env.MAX_PRS, 3);
const MAX_TRIAGE = count(env.MAX_TRIAGE, 10);
const MAX_OPEN = count(env.MAX_OPEN, 10);
const DRY_RUN = env.DRY_RUN === 'true';
const now = new Date();

const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
	console.log(line);
};

const git = (...args: string[]) => run('git', args, { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- what the site lists, and what was proposed before ----

// What the site's entries list, with MyGo itself and this site among the repositories.
async function listedOnSite(): Promise<Listed> {
	const entries: Entry[] = [];
	for (const dir of [...Object.values(ENTRY_DIRS), 'articles']) {
		for (const name of await readdir(join(ROOT, DATA_DIR, dir))) {
			if (name.endsWith('.json')) entries.push(JSON.parse(await readFile(join(ROOT, DATA_DIR, dir, name), 'utf8')) as Entry);
		}
	}
	const listed = listedFrom(entries);
	listed.repos.add(MYGO_MODULE.replace('github.com/', ''));
	listed.repos.add(SITE.toLowerCase());
	return listed;
}

// Why a repository needs no pull request from this script: one of its branch exists, open or closed, or a pull request or issue on the site names the repository, such as a visitor's submission. undefined when neither does.
async function proposedBefore(repo: string): Promise<string | undefined> {
	const [owner] = SITE.split('/');
	const prs = await github<{ html_url: string }[]>(`/repos/${SITE}/pulls?state=all&per_page=1&head=${encodeURIComponent(`${owner}:${branchFor(repo)}`)}`);
	if (prs?.length) return `proposed before in ${prs[0].html_url}`;
	const found = await github<{ total_count: number; items: { html_url: string }[] }>(`/search/issues?per_page=1&q=${encodeURIComponent(`repo:${SITE} "${repo}"`)}`);
	if (found?.total_count) return `named already in ${found.items[0].html_url}`;
	return undefined;
}

async function loadSeen(): Promise<Record<string, Seen>> {
	if (!env.SEEN_FILE) return {};
	try {
		return JSON.parse(await readFile(env.SEEN_FILE, 'utf8')) as Record<string, Seen>;
	} catch {
		return {};
	}
}

// ---- finding projects ----

// Every go.mod on GitHub that names MyGo, through code search, which answers at most 1000 hits, 100 a page, and 10 pages a minute.
async function searchGoMods(): Promise<CodeHit[]> {
	const q = encodeURIComponent(`"${MYGO_MODULE}" filename:go.mod`);
	const hits: CodeHit[] = [];
	for (let page = 1; page <= 10; page++) {
		if (page > 1) await sleep(7_000);
		const res = await github<{ total_count: number; items: { path: string; repository: { full_name: string; fork: boolean } }[] }>(`/search/code?q=${q}&per_page=100&page=${page}`);
		const items = res?.items ?? [];
		if (page === 1 && !res?.total_count) throw new Error('code search found no go.mod that names MyGo; check GITHUB_TOKEN');
		hits.push(...items.map((i) => ({ repo: i.repository.full_name, path: i.path, fork: i.repository.fork })));
		if (items.length < 100 || hits.length >= (res?.total_count ?? 0)) break;
	}
	return hits;
}

interface RepoMeta {
	full_name: string;
	html_url: string;
	description: string | null;
	homepage: string | null;
	stargazers_count: number;
	pushed_at: string;
	default_branch: string;
	fork: boolean;
	archived: boolean;
	disabled: boolean;
	private: boolean;
	topics?: string[];
	license?: { spdx_id?: string } | null;
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (next < items.length) {
				const i = next++;
				out[i] = await fn(items[i]);
			}
		}),
	);
	return out;
}

// ---- one repository ----

interface Candidate {
	meta: RepoMeta;
	goMods: string[];
}

async function triageInput(c: Candidate) {
	const { full_name: repo, default_branch: branch } = c.meta;
	const tree = await github<{ tree: { path: string; type: string }[] }>(`/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
	const paths = (tree?.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);
	// The go.mod that requires MyGo, shallowest first, as code search can match one that only names it.
	let goMod: { path: string; text: string } | undefined;
	for (const path of c.goMods.slice(0, 3)) {
		const text = await rawFile(repo, branch, path);
		if (text !== undefined && requiresMygo(text)) {
			goMod = { path, text };
			break;
		}
	}
	if (!goMod) return undefined;
	const configPath = configNear(goMod.path, paths);
	const configText = configPath ? await rawFile(repo, branch, configPath) : undefined;
	const readme = await github<{ content: string; encoding: string }>(`/repos/${repo}/readme`);
	return {
		repo,
		metadata: { description: c.meta.description, homepage: c.meta.homepage, stars: c.meta.stargazers_count, topics: c.meta.topics ?? [], license: c.meta.license?.spdx_id ?? null, pushed_at: c.meta.pushed_at },
		goMod,
		config: configPath && configText !== undefined ? { path: configPath, text: configText } : undefined,
		paths: paths.filter((p) => !/(^|\/)(node_modules|vendor)\//.test(p)).slice(0, 300),
		readme: readme?.encoding === 'base64' ? Buffer.from(readme.content, 'base64').toString('utf8') : undefined,
	};
}

const tail = (text: string, n: number) => (text.length > n ? `…${text.slice(-n)}` : text);
const codeBlock = (text: string) => `\`\`\`\`\n${text.replace(/````/g, '```')}\n\`\`\`\``;

// Adds the entry on a branch of its own, completes it with main.ts, runs the catalog's checks, pushes the branch and opens the pull request. Returns its link; throws with what went wrong, leaving no branch behind. The working tree is back on origin/main either way.
async function propose(c: Candidate, kind: EntryKind, entry: Entry, goModPath: string, reason: string): Promise<string> {
	const repo = c.meta.full_name;
	const branch = branchFor(repo);
	const dir = `${DATA_DIR}/${ENTRY_DIRS[kind]}`;
	const file = `${dir}/${entry.slug}.json`;
	const tmp = await mkdtemp(join(tmpdir(), 'discover-'));
	let pushed = false;
	await git('switch', '-q', '-C', branch, `origin/${BASE}`);
	try {
		// As the submission bot writes the file (entryFileText in packages/catalog): its schema first, the entry, and when it was added.
		await writeFile(join(ROOT, file), `${JSON.stringify({ $schema: `../schema/${kind}.schema.json`, ...entry, added: now.toISOString().replace(/\.\d{3}Z$/, 'Z') }, null, '\t')}\n`);

		const reportFile = join(tmp, 'report.md');
		await run('node', [join(import.meta.dirname, 'main.ts')], { cwd: ROOT, env: { ...env, BASE_REF: `origin/${BASE}`, REPORT_FILE: reportFile, PR: '' }, maxBuffer: 16 * 1024 * 1024 });
		const enrichReport = await readFile(reportFile, 'utf8');
		// main.ts adds the screenshot and icon after added; the files written by hand keep added last.
		const { added, ...done } = JSON.parse(await readFile(join(ROOT, file), 'utf8')) as Entry;
		await writeFile(join(ROOT, file), `${JSON.stringify({ ...done, added }, null, '\t')}\n`);
		try {
			await run('pnpm', ['--filter', '@awesome-mygo/catalog', 'test'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
		} catch (err) {
			const out = (err as { stdout?: string }).stdout ?? String(err);
			throw new Error(`the catalog checks failed on the completed entry:\n${codeBlock(tail(out, 1500))}`);
		}

		const name = String(done.name).replace(/@/g, '');
		await git('add', '-A', '--', DATA_DIR, PUBLIC);
		await git('commit', '-q', '-m', `feat(catalog): add ${name}`, '-m', `Found by the discover workflow in ${repo}, and completed from its repository: icon, screenshot and copy in every site language.`);
		await git('push', '-q', '--force', 'origin', `HEAD:refs/heads/${branch}`);
		pushed = true;

		const body = [
			`Found by the scheduled *Discover projects* workflow: [${repo}](${c.meta.html_url}) (${c.meta.stargazers_count} stars) requires \`${MYGO_MODULE}\` in \`${goModPath}\`, and the site does not list it yet.`,
			`Category: ${KIND_LABELS[kind]} (\`${file}\`)`,
			`Why it looks like a fit, as the model judged from the repository: ${quiet(reason)}`,
			`## Completed from the repository\n\n${quiet(enrichReport.trim())}`,
			'The catalog checks passed on this entry before it was pushed, and CI runs them again. Before merging, check that the project is built with MyGo and worth listing, read the generated copy, and look at the icon and screenshot. To keep the project off the site, close this pull request: the workflow does not propose a repository again once a pull request of its branch exists.',
		].join('\n\n');
		const pr = await github<{ html_url: string }>(`/repos/${SITE}/pulls`, { method: 'POST', body: { title: `Add ${name} (${KIND_LABELS[kind]})`, head: branch, base: BASE, body } });
		if (!pr) throw new Error('GitHub did not open the pull request');
		return pr.html_url;
	} catch (err) {
		if (pushed) await github(`/repos/${SITE}/git/refs/heads/${branch}`, { method: 'DELETE' }).catch(() => undefined);
		throw err;
	} finally {
		await git('reset', '-q', '--hard', `origin/${BASE}`);
		await git('clean', '-qfd', '--', DATA_DIR, PUBLIC);
		await git('switch', '-q', '--detach', `origin/${BASE}`);
		await git('branch', '-q', '-D', branch);
		await rm(tmp, { recursive: true, force: true });
	}
}

// ---- the run ----

async function main(): Promise<void> {
	const { stdout: dirty } = await git('status', '--porcelain', '--', DATA_DIR, PUBLIC);
	if (dirty.trim()) throw new Error(`the working tree has changes under ${DATA_DIR} or ${PUBLIC}; run this on a clean checkout`);

	const cfg: LlmConfig | undefined = env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL || undefined, model: env.LLM_MODEL || DEFAULT_MODEL } : undefined;
	const open = (await github<{ head: { ref: string } }[]>(`/repos/${SITE}/pulls?state=open&per_page=100`)) ?? [];
	const openOwn = open.filter((p) => p.head.ref.startsWith(BRANCH_PREFIX)).length;
	say(`## Discover projects${DRY_RUN ? ' (dry run)' : ''}\n`);
	if (openOwn >= MAX_OPEN && !DRY_RUN) return say(`${openOwn} of this workflow's pull requests are open, the most it keeps open (MAX_OPEN), so it looked no further. Merge or close some first.`);

	const listed = await listedOnSite();
	const seen = await loadSeen();
	const hits = await searchGoMods();
	const grouped = groupHits(hits, listed.repos);
	const due = [...grouped].filter(([repo]) => isDue(seen[repo.toLowerCase()], now));
	say(`Code search found ${hits.length} go.mod files naming MyGo in ${new Set(hits.map((h) => h.repo)).size} repositories; ${grouped.size} are not on the site and are neither forks nor only examples or tests, and ${due.length} of them are due for a look.\n`);

	// A repository that cannot be read now is left for the next run rather than ending this one.
	let unread = 0;
	const metas = await mapLimit(due, 8, async ([repo, goMods]) => {
		const meta = await github<RepoMeta>(`/repos/${repo}`).catch(() => void unread++);
		if (!meta || meta.fork || meta.archived || meta.disabled || meta.private) return undefined;
		// Listed under its own homepage or by its owner, without naming the repository.
		return listedAs(listed, meta.full_name, meta.homepage) ? undefined : { meta, goMods };
	});
	if (unread) say(`${unread} repositories could not be read from GitHub and wait for the next run.\n`);
	const candidates = metas.filter((c): c is Candidate => !!c).sort((a, b) => b.meta.stargazers_count - a.meta.stargazers_count || b.meta.pushed_at.localeCompare(a.meta.pushed_at));

	if (!cfg) {
		say(`LLM_API_KEY is not set, so no repository was judged. The first ${MAX_TRIAGE} it would ask about:\n`);
		for (const c of candidates.slice(0, MAX_TRIAGE)) say(`- [${c.meta.full_name}](${c.meta.html_url}), ${c.meta.stargazers_count} stars: \`${c.goMods[0]}\``);
		return;
	}

	const lines = { proposed: [] as string[], skipped: [] as string[], failed: [] as string[] };
	let triaged = 0;
	let proposed = 0;
	const room = DRY_RUN ? MAX_PRS : Math.min(MAX_PRS, MAX_OPEN - openOwn);
	for (const c of candidates) {
		if (triaged >= MAX_TRIAGE || proposed >= room) break;
		const repo = c.meta.full_name;
		const link = `[${repo}](${c.meta.html_url})`;
		// Set once the model has been asked: only then is a failure remembered, so a passing GitHub error costs a day, not two weeks.
		let asked = false;
		try {
			const before = await proposedBefore(repo);
			if (before) {
				lines.skipped.push(`- ${link}: ${before}`);
				continue;
			}
			const input = await triageInput(c);
			if (!input) {
				seen[repo.toLowerCase()] = remember('skip', `no go.mod among ${c.goMods.join(', ')} requires ${MYGO_MODULE}`, now);
				lines.skipped.push(`- ${link}: ${seen[repo.toLowerCase()].reason}`);
				continue;
			}
			triaged++;
			asked = true;
			const v = await triage(cfg, input);
			if (v.verdict.trim().toLowerCase() === 'skip') {
				seen[repo.toLowerCase()] = remember('skip', v.reason, now);
				lines.skipped.push(`- ${link}: ${quiet(v.reason)}`);
				continue;
			}
			const taken = new Set<string>();
			for (const dir of Object.values(ENTRY_DIRS)) for (const n of await readdir(join(ROOT, DATA_DIR, dir))) taken.add(n.replace(/\.json$/, ''));
			const built = entryFor(v, { repo, htmlUrl: c.meta.html_url, homepage: c.meta.homepage, module: moduleOf(input.goMod.text) }, uniqueSlug(v.name, repo, taken));
			if ('error' in built) throw new Error(built.error);
			if (DRY_RUN) {
				lines.proposed.push(`- ${link} as ${KIND_LABELS[built.kind]}: would add\n${codeBlock(JSON.stringify(built.entry, null, 2))}\n  ${quiet(v.reason)}`);
				proposed++;
				continue;
			}
			const url = await propose(c, built.kind, built.entry, input.goMod.path, v.reason);
			lines.proposed.push(`- ${link} as ${KIND_LABELS[built.kind]}: ${url}`);
			proposed++;
		} catch (err) {
			const why = err instanceof Error ? err.message : String(err);
			if (asked) seen[repo.toLowerCase()] = remember('failed', why, now);
			lines.failed.push(`- ${link}: ${quiet(why)}`);
		}
	}

	say(`### ${DRY_RUN ? 'Would propose' : 'Proposed'} (${lines.proposed.length})\n\n${lines.proposed.join('\n') || 'None.'}\n`);
	say(`### Skipped (${lines.skipped.length})\n\n${lines.skipped.join('\n') || 'None.'}\n`);
	say(`### Failed (${lines.failed.length})\n\n${lines.failed.join('\n') || 'None.'}\n`);
	say(`Asked the model about ${triaged} repositories (at most ${MAX_TRIAGE}); the rest wait for the next run.`);
	if (env.SEEN_FILE && !DRY_RUN) await writeFile(env.SEEN_FILE, `${JSON.stringify(seen, null, '\t')}\n`);
}

try {
	await main();
} finally {
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${report.join('\n')}\n`);
}
