import { CatalogError } from './validate';
import { APP_KIND, APPS, ARTICLE_KIND, ARTICLES, type AppCategory, COMMUNITY_PLUGINS, DATA_DIR, type Kind, PLUGIN_KIND, PLUGINS, STATE_KIND, STATE_SOLUTIONS, UI_KIND, UI_LIBS, hostOf, readEntry, readEntryFile } from './catalog';

// Submission form: it writes the JSON entry for the category. The site's bot opens a pull request with it, or a contributor with a GitHub account sends it as an issue or adds it themselves. Every entry gets a file of its own, data/<dir>/<slug>.json, so entries submitted together never conflict.

export const SUBMIT_CATS = ['ui', 'state', 'plugin', 'showcase', 'article'] as const;
export type SubmitCat = (typeof SUBMIT_CATS)[number];

// The files each category's entries go in.
export const SUBMIT_KINDS: Record<SubmitCat, Kind<{ slug: string; added?: string }>> = { showcase: APP_KIND, ui: UI_KIND, state: STATE_KIND, plugin: PLUGIN_KIND, article: ARTICLE_KIND };

// Each category's name in a pull request title.
export const SUBMIT_LABELS: Record<SubmitCat, string> = { showcase: 'app', ui: 'UI components', state: 'state management', plugin: 'plugin', article: 'article' };

// When an entry is filed: now, in UTC to the second.
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// Where an entry goes, under DATA_DIR: its own file in the category's directory, named after its slug.
export function entryPath(cat: SubmitCat, entry: Record<string, unknown>): string {
	const slug = typeof entry.slug === 'string' && entry.slug ? entry.slug : slugify(pastedName(entry));
	return `${SUBMIT_KINDS[cat].dir}/${slug}.json`;
}

// Throws a CatalogError, naming the field, when entry would not pass its file's check.
export function checkEntry(cat: SubmitCat, entry: Record<string, unknown>): void {
	readEntry(SUBMIT_KINDS[cat], entry);
}

// The entry's file as the repository keeps it: its schema first, the entry, and when it was added.
function fileOf(cat: SubmitCat, entry: Record<string, unknown>, added: string): Record<string, unknown> {
	const { $schema: _schema, added: _added, ...rest } = entry;
	return { $schema: SUBMIT_KINDS[cat].schema, ...rest, added };
}

// The entry's file as text, added now unless given. Throws a CatalogError, naming the field, when it would not pass the file's check.
export function entryFileText(cat: SubmitCat, entry: Record<string, unknown>, added = now()): string {
	const file = fileOf(cat, entry, added);
	readEntryFile(SUBMIT_KINDS[cat], entryPath(cat, file).slice(SUBMIT_KINDS[cat].dir.length + 1), file);
	return `${JSON.stringify(file, null, '\t')}\n`;
}

// The name of the entry on the site that entry would repeat, by the field its category keeps unique across files (an app's or plugin's slug, a library's repository, an article's link), or undefined. A new slug is checked against the repository itself, as a file of that name.
export function alreadyListed(cat: SubmitCat, entry: Record<string, unknown>): string | undefined {
	switch (cat) {
		case 'showcase':
			return APPS.find((a) => a.slug === entry.slug)?.name;
		case 'ui':
			return UI_LIBS.find((l) => l.repo === entry.repo)?.name;
		case 'state':
			return STATE_SOLUTIONS.find((s) => s.repo === entry.repo)?.name;
		case 'plugin':
			return [...PLUGINS, ...COMMUNITY_PLUGINS].find((p) => p.slug === entry.slug)?.name;
		case 'article':
			return ARTICLES.find((a) => a.url === entry.url)?.title;
	}
}

// A card's line stays short; an app's description may run to a sentence or two.
export function descMax(cat: SubmitCat): number {
	return cat === 'showcase' ? 300 : 120;
}

export interface EntryDraft {
	name: string;
	author: string;
	// The showcase's homepage, a plugin's docs, an article; for UI components and state management, the GitHub repository.
	url: string;
	desc: string;
	// Showcase only: the app's GitHub repository link, for an open-source app. Optional, since an app need not be open source.
	repo?: string;
	// Showcase only: the app's schema.org category, from the group its author picked. Left out when none was picked.
	category?: AppCategory;
	// An app, UI components or state management (takesShot): a link to a screenshot, for a project whose README and repository show none. Not part of the entry: the bot passes it to the submission workflow in the pull request, which downloads it into apps/web/public/shots. The form can upload an image instead, which the bot puts on the pull request's branch.
	screenshot?: string;
}

// Empty is not "bad": the error only shows once something that is not an https link has been typed.
export function isBadUrl(url: string): boolean {
	return url.length > 0 && !url.startsWith('https://');
}

// Articles have no author; every other category needs one.
export function needsAuthor(cat: SubmitCat): boolean {
	return cat !== 'article';
}

export function isEntryComplete(cat: SubmitCat, d: EntryDraft): boolean {
	return Boolean(d.name.trim() && d.url.trim() && !isBadUrl(d.url) && (cat === 'article' || d.desc.trim()) && (!needsAuthor(cat) || d.author.trim()));
}

export function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'my-app'
	);
}

// The slug, and so the file name, of a new entry: from its name, or, for a name with no Latin letter or digit (留白), from its link (a repository's name, or the address), since every such name would otherwise become my-app and the second one could not be filed.
function entrySlug(name: string, url: string): string {
	if (/[a-z0-9]/i.test(name)) return slugify(name);
	return slugify(repoOf(url)?.split('/')[1] ?? url.replace(/^https:\/\//, '').slice(0, 60));
}

// owner/name of a GitHub link, which UI libraries and state management ask for.
export function repoOf(url: string): string | undefined {
	const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/.exec(url.trim());
	return m ? `${m[1]}/${m[2].replace(/\.git$/, '')}` : undefined;
}

// A link typed or pasted without its scheme (github.com/you/app) is meant as https; anything else is left for isBadUrl to judge.
export function withScheme(url: string): string {
	const u = url.trim();
	if (!u || /^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
	return /^[^\s/]+\.[^\s/]+/.test(u) ? `https://${u}` : u;
}

// For a GitHub repository link, the repository's name and its owner, which the form offers as the entry's name and author.
export function guessFromLink(url: string): { name: string; author: string } | undefined {
	const repo = repoOf(url);
	if (!repo) return undefined;
	const [author, name] = repo.split('/');
	return { name, author };
}

export type DraftField = 'url' | 'name' | 'author' | 'desc';

// What the draft still lacks before it can be submitted, in the form's order. Empty exactly when isEntryComplete holds (the description's length is capped by the field itself).
export function missingFields(cat: SubmitCat, d: EntryDraft): DraftField[] {
	const out: DraftField[] = [];
	if (!d.url.trim() || isBadUrl(d.url)) out.push('url');
	if (!d.name.trim()) out.push('name');
	if (needsAuthor(cat) && !d.author.trim()) out.push('author');
	if (cat !== 'article' && !d.desc.trim()) out.push('desc');
	return out;
}

// The entry as it goes into its data file. Missing fields show as placeholders, so the preview always has the final shape.
export function buildEntry(cat: SubmitCat, d: EntryDraft, mode: 'native' | 'web', placeholders: { name: string; desc: string }): Record<string, unknown> {
	const name = d.name.trim() || placeholders.name;
	const author = d.author.trim() || 'your-github-login';
	const url = d.url.trim() || 'https://…';
	const summary = { en: d.desc.trim() || placeholders.desc };
	const repo = repoOf(url);
	switch (cat) {
		case 'showcase':
			return { slug: entrySlug(name, url), name, author, kind: mode, ...(d.category ? { category: d.category } : {}), url, ...(repoOf(d.repo ?? '') ? { repo: repoOf(d.repo ?? '') } : {}), summary, description: summary };
		case 'ui':
			return { slug: entrySlug(name, url), name, author, tag: 'theme', surface: 'native', summary, repo: repo ?? 'owner/name', url };
		case 'state':
			return { slug: entrySlug(name, url), name, author, summary, repo: repo ?? 'owner/name', url, install: repo ? `go get github.com/${repo}` : 'go get …', tags: ['state'] };
		case 'plugin':
			return { slug: entrySlug(name, url), name, mark: name.replace(/\s/g, '').slice(0, 2), official: false, surface: 'web', tags: [], docs: url, summary };
		case 'article':
			return { slug: entrySlug(name, url), title: name, site: d.url.trim() ? hostOf(url).split('/')[0] : 'example.com', url };
	}
}

export function jsonEntry(cat: SubmitCat, d: EntryDraft, mode: 'native' | 'web', placeholders: { name: string; desc: string }): string {
	return JSON.stringify(buildEntry(cat, d, mode, placeholders), null, 2);
}

// A screenshot link the form accepts: https, at most 300 characters, and none of the characters that could break out of where the bot quotes it in the pull request (an HTML comment and a code span).
const SHOT_URL = /^https:\/\/[^\s<>"'`]+$/;

// A screenshot link that is filled in but is not one the form accepts.
export function isBadShot(link: string): boolean {
	const v = link.trim();
	return v.length > 0 && (v.length > 300 || !SHOT_URL.test(v));
}

// A showcase app's optional GitHub link that is filled in but is not a repository link.
export function isBadRepo(link: string): boolean {
	return link.trim().length > 0 && !repoOf(link);
}

// UI components and state management are listed by their GitHub repository.
export function needsRepo(cat: SubmitCat): boolean {
	return cat === 'ui' || cat === 'state';
}

// The categories whose cards show a screenshot, which the form asks for when the project's repository has none to take.
export function takesShot(cat: SubmitCat): boolean {
	return cat === 'showcase' || needsRepo(cat);
}

// The GitHub repository (owner/name) the screenshot is looked for in: an app's repository, or its link when that is one; a library's link. undefined for an app without one, which then needs a screenshot from the form.
export function shotRepo(cat: SubmitCat, d: { url: string; repo?: string }): string | undefined {
	if (!takesShot(cat)) return undefined;
	return (cat === 'showcase' ? repoOf(d.repo ?? '') : undefined) ?? repoOf(d.url);
}

// The same for an entry pasted whole: its repo field, or its link when that is a repository.
export function pastedShotRepo(cat: SubmitCat, entry: Record<string, unknown>): string | undefined {
	if (!takesShot(cat)) return undefined;
	if (typeof entry.repo === 'string' && /^[^/\s]+\/[^/\s]+$/.test(entry.repo)) return entry.repo;
	return typeof entry.url === 'string' ? repoOf(entry.url) : undefined;
}

// Why the bot cannot submit this draft as it stands, or undefined when it can. The form shows the same rules; this is the server's copy of them for requests that skip the form.
export function entryProblem(cat: SubmitCat, d: EntryDraft): string | undefined {
	if (!isEntryComplete(cat, d)) return 'name, link, description and author are required, and the link must be https';
	if (d.desc.length > descMax(cat)) return `the description is longer than ${descMax(cat)} characters`;
	if (d.name.length > 80 || d.author.length > 80 || d.url.length > 300) return 'a field is too long';
	if ([d.name, d.author, d.url, d.desc].some((v) => /[\u0000-\u001f\u007f]/.test(v))) return 'fields must be a single line of text';
	if (/\s/.test(d.url.trim())) return 'the link must not contain spaces';
	if (needsRepo(cat) && !repoOf(d.url)) return 'UI components and state management need a GitHub repository link';
	if (cat === 'showcase' && d.repo?.trim() && (isBadRepo(d.repo) || d.repo.length > 300)) return 'the GitHub repository must be a link like https://github.com/owner/name';
	if (d.screenshot?.trim() && (!takesShot(cat) || isBadShot(d.screenshot))) return 'the screenshot must be an https link to an image, for an app, UI components or state management';
	return undefined;
}

// ---- a pasted entry ----

// A contributor may paste a whole entry instead of filling in the form: it then goes into its data file as written, translations and all, once it passes the same check the file does.

// The pasted text as one entry, or why it is not one.
export function parseEntryJson(text: string): { entry: Record<string, unknown> } | { error: 'json' | 'object' } {
	let v: unknown;
	try {
		v = JSON.parse(text);
	} catch {
		return { error: 'json' };
	}
	return v && typeof v === 'object' && !Array.isArray(v) ? { entry: v as Record<string, unknown> } : { error: 'object' };
}

// Why entry cannot be submitted as a cat entry, or undefined when it can. The file's own check names the field; the rest are the limits the form's fields have.
export function pastedEntryProblem(cat: SubmitCat, entry: Record<string, unknown>): string | undefined {
	try {
		checkEntry(cat, entry);
	} catch (err) {
		if (err instanceof CatalogError) return err.message;
		throw err;
	}
	// Images live in the repository, and a visitor cannot add one; a maintainer adds them after merging.
	if (entry.screenshot !== undefined || (entry.icon as { file?: unknown } | undefined)?.file !== undefined) return 'screenshot and icon.file name images in the repository, which a maintainer adds; leave them out';
	const name = pastedName(entry);
	if (name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return 'the name must be a single line of at most 80 characters';
	const url = String(entry.url ?? entry.docs ?? '');
	if (url.length > 300) return 'the link is longer than 300 characters';
	return undefined;
}

// The categories whose file accepts entry. The form switches to the category when exactly one does.
export function entryCats(entry: Record<string, unknown>): SubmitCat[] {
	return SUBMIT_CATS.filter((cat) => !pastedEntryProblem(cat, entry));
}

// The entry's name, for pull request and issue titles: articles have a title instead.
export function pastedName(entry: Record<string, unknown>): string {
	const v = entry.name ?? entry.title;
	return typeof v === 'string' ? v.trim() : '';
}

// A Markdown code fence longer than any run of backticks in text, so the text cannot close it early.
export function codeFence(text: string, lang = ''): string {
	const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	return `${fence}${lang}\n${text}\n${fence}`;
}

// A new-issue link on repo, prefilled with the entry.
export function issueUrl(repo: string, cat: SubmitCat, catLabel: string, d: EntryDraft, entry: string, placeholders: { name: string }): string {
	const parsed = parseEntryJson(entry);
	const path = entryPath(cat, 'entry' in parsed ? parsed.entry : {});
	const shot = takesShot(cat) && d.screenshot?.trim() && !isBadShot(d.screenshot) ? `\nScreenshot: ${d.screenshot.trim()}\n` : '';
	const q = new URLSearchParams({ title: `Add ${d.name.trim() || placeholders.name} (${catLabel})`, body: `${catLabel}: \`${DATA_DIR}/${path}\`\n\n${codeFence(entry, 'json')}\n${shot}` });
	return `${repo}/issues/new?${q}`;
}

// GitHub's editor for the entry: a new file in the category's directory, named after its slug, with the entry filled in. For a visitor without write access it forks the repository and opens a pull request.
export function editUrl(repo: string, cat: SubmitCat, entry: Record<string, unknown>): string {
	const { dir } = SUBMIT_KINDS[cat];
	const value = `${JSON.stringify(fileOf(cat, entry, now()), null, '\t')}\n`;
	const q = new URLSearchParams({ filename: entryPath(cat, entry).slice(dir.length + 1), value });
	return `${repo}/new/main/${DATA_DIR}/${dir}?${q}`;
}

