import { CatalogError } from './validate';
import { DATA_DIR, hostOf, readApps, readArticles, readPlugins, readStateSolutions, readUiLibs } from './catalog';

// Submission form: it writes the JSON entry for the category's data file. The site's bot opens a pull request with it, or a contributor with a GitHub account sends it as an issue or adds it to the file themselves.

export const SUBMIT_CATS = ['ui', 'state', 'plugin', 'showcase', 'article'] as const;
export type SubmitCat = (typeof SUBMIT_CATS)[number];

// The data file and its list for each category, the check that file must pass, and the category's name in a pull request title.
export const SUBMIT_FILES: Record<SubmitCat, { file: string; list: string; check: (json: unknown) => unknown; label: string }> = {
	showcase: { file: 'apps.json', list: 'apps', check: readApps, label: 'app' },
	ui: { file: 'ui.json', list: 'libraries', check: readUiLibs, label: 'UI components' },
	state: { file: 'state.json', list: 'solutions', check: readStateSolutions, label: 'state management' },
	plugin: { file: 'plugins.json', list: 'plugins', check: readPlugins, label: 'plugin' },
	article: { file: 'articles.json', list: 'articles', check: readArticles, label: 'article' },
};

// A card's line stays short; an app's description may run to a sentence or two.
export function descMax(cat: SubmitCat): number {
	return cat === 'showcase' ? 300 : 120;
}

export interface EntryDraft {
	name: string;
	author: string;
	url: string;
	desc: string;
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

// owner/name of a GitHub link, which ui.json and state.json ask for.
export function repoOf(url: string): string | undefined {
	const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/.exec(url.trim());
	return m ? `${m[1]}/${m[2].replace(/\.git$/, '')}` : undefined;
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
			return { slug: slugify(name), name, author, kind: mode, url, summary, description: summary };
		case 'ui':
			return { name, author, tag: 'theme', summary, repo: repo ?? 'owner/name', url };
		case 'state':
			return { name, author, summary, repo: repo ?? 'owner/name', url, install: repo ? `go get github.com/${repo}` : 'go get …', tags: ['state'] };
		case 'plugin':
			return { slug: slugify(name), name, mark: name.replace(/\s/g, '').slice(0, 2), official: false, surface: 'web', tags: [], docs: url, summary };
		case 'article':
			return { title: name, site: d.url.trim() ? hostOf(url).split('/')[0] : 'example.com', url };
	}
}

export function jsonEntry(cat: SubmitCat, d: EntryDraft, mode: 'native' | 'web', placeholders: { name: string; desc: string }): string {
	return JSON.stringify(buildEntry(cat, d, mode, placeholders), null, 2);
}

// UI components and state management are listed by their GitHub repository.
export function needsRepo(cat: SubmitCat): boolean {
	return cat === 'ui' || cat === 'state';
}

// Why the bot cannot submit this draft as it stands, or undefined when it can. The form shows the same rules; this is the server's copy of them for requests that skip the form.
export function entryProblem(cat: SubmitCat, d: EntryDraft): string | undefined {
	if (!isEntryComplete(cat, d)) return 'name, link, description and author are required, and the link must be https';
	if (d.desc.length > descMax(cat)) return `the description is longer than ${descMax(cat)} characters`;
	if (d.name.length > 80 || d.author.length > 80 || d.url.length > 300) return 'a field is too long';
	if ([d.name, d.author, d.url, d.desc].some((v) => /[\u0000-\u001f\u007f]/.test(v))) return 'fields must be a single line of text';
	if (/\s/.test(d.url.trim())) return 'the link must not contain spaces';
	if (needsRepo(cat) && !repoOf(d.url)) return 'UI components and state management need a GitHub repository link';
	return undefined;
}

// The data file with entry added at the end of its list, formatted as the repository keeps it. Throws a CatalogError, naming the field, when the result would not pass the file's check, e.g. a duplicate.
export function appendEntry(cat: SubmitCat, fileText: string, entry: Record<string, unknown>): string {
	const { file, list, check } = SUBMIT_FILES[cat];
	const data = JSON.parse(fileText) as Record<string, unknown[]>;
	if (!Array.isArray(data[list])) throw new CatalogError(`${file}: "${list}" must be a list`);
	data[list] = [...data[list], entry];
	check(data);
	return `${JSON.stringify(data, null, '\t')}\n`;
}

// A Markdown code fence longer than any run of backticks in text, so the text cannot close it early.
export function codeFence(text: string, lang = ''): string {
	const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	return `${fence}${lang}\n${text}\n${fence}`;
}

// A new-issue link on repo, prefilled with the entry.
export function issueUrl(repo: string, cat: SubmitCat, catLabel: string, d: EntryDraft, entry: string, placeholders: { name: string }): string {
	const { file } = SUBMIT_FILES[cat];
	const q = new URLSearchParams({ title: `Add ${d.name.trim() || placeholders.name} (${catLabel})`, body: `${catLabel}: \`${DATA_DIR}/${file}\`\n\n${codeFence(entry, 'json')}\n` });
	return `${repo}/issues/new?${q}`;
}

// GitHub's editor for the category's data file; for a visitor without write access it forks the repository and opens a pull request.
export function editUrl(repo: string, cat: SubmitCat): string {
	return `${repo}/edit/main/${DATA_DIR}/${SUBMIT_FILES[cat].file}`;
}

