// What the discover script decides about the projects it finds on GitHub, without touching the network: pure functions, so they are tested on their own.

import type { Entry, EntryKind } from './source.ts';

// A project is built with MyGo when one of its go.mod files requires this module.
export const MYGO_MODULE = 'github.com/egoist/mygo';

// The branches the discover script opens its pull requests from. A repository gets the same branch every time, so a pull request of that branch, open or closed, says it was proposed already.
export const BRANCH_PREFIX = 'discover/';

// Each kind's name in a pull request title, as the submission bot writes it (SUBMIT_LABELS in packages/catalog).
export const KIND_LABELS: Record<EntryKind, string> = { app: 'app', ui: 'UI components', state: 'state management', plugin: 'plugin' };

// Every GitHub repository an entry points at, as lower-case owner/name: its repo field, its GitHub links and a plugin's Go import path.
export function reposOfEntry(entry: Entry): string[] {
	const out = new Set<string>();
	if (typeof entry.repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(entry.repo)) out.add(entry.repo.toLowerCase());
	for (const key of ['url', 'docs', 'homepage', 'import']) {
		const v = entry[key];
		if (typeof v !== 'string') continue;
		const m = /^(?:https:\/\/)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/i.exec(v.trim());
		if (m) out.add(`${m[1]}/${m[2]}`.toLowerCase());
	}
	return [...out];
}

// What the site lists, to tell a found repository apart from the entries it already has: their repositories, their links, and author/slug pairs. An app need not name its repository (kero.sh, lorca.app), so a repository is also listed when its homepage is one of the links, or when its owner wrote an entry whose slug is the repository's name.
export interface Listed {
	repos: Set<string>;
	links: Set<string>;
	owned: Set<string>;
}

// A link as the site and GitHub may both write it: no scheme, www., query, fragment or trailing slash, in lower case. A repository's homepage may leave out the scheme (meiro.elianiva.com).
export function normalizeLink(url: string | null | undefined): string | undefined {
	const m = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s?#]*)?)(?:[?#]\S*)?$/i.exec((url ?? '').trim());
	return m ? m[1].replace(/\/+$/, '').toLowerCase() : undefined;
}

export function listedFrom(entries: readonly Entry[]): Listed {
	const listed: Listed = { repos: new Set(), links: new Set(), owned: new Set() };
	for (const e of entries) {
		for (const r of reposOfEntry(e)) listed.repos.add(r);
		for (const key of ['url', 'homepage']) {
			const link = normalizeLink(e[key] as string | undefined);
			if (link && !link.startsWith('github.com/')) listed.links.add(link);
		}
		if (typeof e.author === 'string' && typeof e.slug === 'string') listed.owned.add(`${e.author}/${e.slug}`.toLowerCase());
	}
	return listed;
}

// Why the site already lists a repository, or undefined when it does not.
export function listedAs(listed: Listed, repo: string, homepage?: string | null): string | undefined {
	const [owner, name] = repo.toLowerCase().split('/');
	if (listed.repos.has(`${owner}/${name}`)) return 'its repository';
	const link = normalizeLink(homepage);
	if (link && listed.links.has(link)) return `its homepage, ${link}`;
	if (listed.owned.has(`${owner}/${slugify(name)}`)) return `an entry of ${owner} named ${slugify(name)}`;
	return undefined;
}

// A go.mod in a folder of examples, tests, benchmarks or vendored code: a project that only shows or measures MyGo there is not built with it.
export function isSamplePath(path: string): boolean {
	return /(^|\/)(examples?|samples?|testdata|tests?|bench(es|marks?)?|vendor|third_party|node_modules)\//i.test(path);
}

export interface CodeHit {
	repo: string;
	path: string;
	fork: boolean;
}

// The repositories among code search hits worth a look, each with its go.mod paths, shallowest first: no forks, no repository in skip (lower-case owner/name), and no go.mod that only sits among examples or tests.
export function groupHits(hits: readonly CodeHit[], skip: ReadonlySet<string>): Map<string, string[]> {
	const out = new Map<string, string[]>();
	for (const h of hits) {
		if (h.fork || skip.has(h.repo.toLowerCase()) || isSamplePath(h.path)) continue;
		const paths = out.get(h.repo) ?? [];
		if (!paths.includes(h.path)) paths.push(h.path);
		out.set(h.repo, paths);
	}
	for (const paths of out.values()) paths.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
	return out;
}

// The go.mod files among a repository's paths that could be the project's own, shallowest first: not among examples, tests or vendored code. For a repository found without a go.mod hit, by its MyGo configuration or its README.
export function goModsIn(paths: readonly string[]): string[] {
	return paths.filter((p) => (p === 'go.mod' || p.endsWith('/go.mod')) && !isSamplePath(p)).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
}

// The GitHub repositories pkg.go.dev lists as importing a package, from its importedby page: links such as /github.com/owner/name/sub. MyGo itself is left out.
export function reposInImportedBy(html: string): string[] {
	const out = new Map<string, string>();
	for (const m of html.matchAll(/href="\/github\.com\/([\w.-]+)\/([\w.-]+)[/"?#]/g)) {
		const repo = `${m[1]}/${m[2]}`;
		if (repo.toLowerCase() !== MYGO_MODULE.replace('github.com/', '')) out.set(repo.toLowerCase(), repo);
	}
	return [...out.values()];
}

// Whether a go.mod requires MyGo itself, not a module whose path merely starts the same (github.com/egoist/mygo-cli) or a comment that names it.
export function requiresMygo(gomod: string): boolean {
	const stripped = gomod.replace(/\/\/.*$/gm, '');
	return new RegExp(`(^|\\s)${MYGO_MODULE.replace(/[./]/g, '\\$&')}(/v\\d+)?\\s+v\\d`, 'm').test(stripped);
}

// The module path a go.mod declares.
export function moduleOf(gomod: string): string | undefined {
	return /^module\s+"?([^\s"]+)"?/m.exec(gomod)?.[1];
}

// The app's MyGo configuration among the repository's paths: mygo.json or mygo.config.ts beside the go.mod, or else at the root.
export function configNear(goModPath: string, paths: readonly string[]): string | undefined {
	const dir = goModPath.includes('/') ? goModPath.slice(0, goModPath.lastIndexOf('/') + 1) : '';
	const names = ['mygo.json', 'mygo.config.ts', 'mygo.config.mts', 'mygo.config.js', 'mygo.config.mjs'];
	for (const base of dir ? [dir, ''] : ['']) {
		const found = names.map((n) => base + n).find((p) => paths.includes(p));
		if (found) return found;
	}
	return undefined;
}

// The branch of a repository's pull request: discover/<owner>/<name> in lower case.
export function branchFor(repo: string): string {
	return BRANCH_PREFIX + repo.toLowerCase().replace(/[^a-z0-9._/-]+/g, '-');
}

// As slugify in packages/catalog/src/entry.ts, which this package cannot import: the catalog loads its data through Vite.
export function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'my-app'
	);
}

// A slug no file in the directory has yet: from the name, or the repository's name when the name has no Latin letter or digit; then with the owner's name added, then a number.
export function uniqueSlug(name: string, repo: string, taken: ReadonlySet<string>): string {
	const [owner, repoName] = repo.split('/');
	const base = slugify(/[a-z0-9]/i.test(name) ? name : repoName);
	if (!taken.has(base)) return base;
	const owned = `${base}-${slugify(owner)}`;
	if (!taken.has(owned)) return owned;
	for (let n = 2; ; n++) if (!taken.has(`${owned}-${n}`)) return `${owned}-${n}`;
}

// What the model makes of a repository, as it answers (triage.ts).
export interface Verdict {
	verdict: string;
	reason: string;
	name: string;
	summary: string;
	kind: string;
	tag: string;
	surface: string;
	tags: string[];
}

// What a repository's entry is built from besides the verdict.
export interface RepoInfo {
	repo: string;
	htmlUrl: string;
	homepage?: string | null;
	module?: string;
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
const httpsOnly = (url: string | null | undefined) => (url && /^https:\/\/[^\s]+$/.test(url.trim()) ? url.trim() : undefined);
const cleanTags = (tags: readonly string[]) => [...new Set(tags.map((t) => slugify(t)).filter((t) => t !== 'my-app'))].slice(0, 4);

// The entry a verdict asks for, as the site's form would write it (buildEntry in packages/catalog), or why there is none. The copy is English only; enrich writes it in every site language.
export function entryFor(v: Verdict, info: RepoInfo, slug: string): { kind: EntryKind; entry: Entry } | { error: string } {
	const verdict = v.verdict.trim().toLowerCase();
	const name = oneLine(v.name);
	const summary = { en: oneLine(v.summary) };
	if (!name || !summary.en) return { error: 'the model gave no name or summary' };
	const author = info.repo.split('/')[0];
	const homepage = httpsOnly(info.homepage);
	switch (verdict) {
		case 'app': {
			const kind = v.kind.trim().toLowerCase();
			if (kind !== 'native' && kind !== 'web') return { error: `the model gave no app kind (${v.kind || 'empty'})` };
			return { kind: 'app', entry: { slug, name, author, kind, url: homepage ?? info.htmlUrl, repo: info.repo, summary, description: summary } };
		}
		case 'ui': {
			const tag = v.tag.trim().toLowerCase();
			if (!['theme', 'retro', 'icons'].includes(tag)) return { error: `the model gave no UI tag (${v.tag || 'empty'})` };
			return { kind: 'ui', entry: { slug, name, author, tag, summary, repo: info.repo, url: info.htmlUrl, ...(homepage ? { homepage } : {}) } };
		}
		case 'state': {
			const tags = cleanTags(v.tags);
			return { kind: 'state', entry: { slug, name, author, summary, repo: info.repo, url: info.htmlUrl, ...(homepage ? { homepage } : {}), install: `go get ${info.module ?? `github.com/${info.repo}`}@latest`, tags: tags.length ? tags : ['state'] } };
		}
		case 'plugin': {
			const surface = v.surface.trim().toLowerCase();
			if (!['web', 'native', 'both'].includes(surface)) return { error: `the model gave no plugin surface (${v.surface || 'empty'})` };
			const mark = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || name.slice(0, 2);
			const importPath = info.module && /^[a-z0-9.-]+(\/[A-Za-z0-9._~-]+)+$/.test(info.module) ? info.module : undefined;
			return { kind: 'plugin', entry: { slug, name, mark, official: false, surface, ...(importPath ? { import: importPath } : {}), tags: cleanTags(v.tags), docs: homepage ?? info.htmlUrl, summary } };
		}
		default:
			return { error: `the model's verdict is ${v.verdict || 'empty'}` };
	}
}

// What the script remembers about a repository it looked at and did not propose, so it does not ask the model again every day: skipped (not a fit) or failed (its entry did not pass the checks), and until when.
export interface Seen {
	verdict: 'skip' | 'failed';
	reason: string;
	at: string;
	until: string;
}

export const RECHECK_DAYS = { skip: 90, failed: 14 } as const;

export function remember(verdict: Seen['verdict'], reason: string, now: Date): Seen {
	const until = new Date(now.getTime() + RECHECK_DAYS[verdict] * 86_400_000);
	return { verdict, reason, at: now.toISOString(), until: until.toISOString() };
}

// The repositories remembered, less those whose entry failed: for a run asked to try them again (RETRY_FAILED), once what made them fail is fixed.
export function withoutFailed(seen: Record<string, Seen>): Record<string, Seen> {
	return Object.fromEntries(Object.entries(seen).filter(([, s]) => s.verdict !== 'failed'));
}

// Whether a repository is due for a look: never seen, or its time is up.
export function isDue(seen: Seen | undefined, now: Date): boolean {
	return !seen || Date.parse(seen.until) <= now.getTime();
}

// Text from a stranger's repository or from the model, made safe to put in a pull request: no @mention that would notify someone.
export function quiet(text: string): string {
	return text.replace(/@(?=[\w-])/g, '@\u200b');
}
