import { DATA_DIR, hostOf } from './catalog';

// Submission form: it writes the JSON entry for the category's data file, which a contributor sends as an issue or adds to the file in a pull request.

export const SUBMIT_CATS = ['ui', 'state', 'plugin', 'showcase', 'article'] as const;
export type SubmitCat = (typeof SUBMIT_CATS)[number];

// The data file and its list for each category.
export const SUBMIT_FILES: Record<SubmitCat, { file: string; list: string }> = {
	showcase: { file: 'apps.json', list: 'apps' },
	ui: { file: 'ui.json', list: 'libraries' },
	state: { file: 'state.json', list: 'solutions' },
	plugin: { file: 'plugins.json', list: 'plugins' },
	article: { file: 'articles.json', list: 'articles' },
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
function repoOf(url: string): string {
	const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/.exec(url.trim());
	return m ? `${m[1]}/${m[2].replace(/\.git$/, '')}` : 'owner/name';
}

// The entry as it would appear in its data file. Missing fields show as placeholders, so the preview always has the final shape.
export function jsonEntry(cat: SubmitCat, d: EntryDraft, mode: 'native' | 'web', placeholders: { name: string; desc: string }): string {
	const name = d.name.trim() || placeholders.name;
	const author = d.author.trim() || 'your-github-login';
	const url = d.url.trim() || 'https://…';
	const summary = { en: d.desc.trim() || placeholders.desc };
	let entry: Record<string, unknown>;
	switch (cat) {
		case 'showcase':
			entry = { slug: slugify(name), name, author, kind: mode, url, summary, description: summary };
			break;
		case 'ui':
			entry = { name, author, tag: 'theme', summary, repo: repoOf(url), url };
			break;
		case 'state':
			entry = { name, author, summary, repo: repoOf(url), url, install: 'go get …', tags: ['state'] };
			break;
		case 'plugin':
			entry = { slug: slugify(name), name, mark: name.slice(0, 2), official: false, surface: 'web', tags: [], docs: url, summary };
			break;
		case 'article':
			entry = { title: name, site: d.url.trim() ? hostOf(url).split('/')[0] : 'example.com', url };
			break;
	}
	return JSON.stringify(entry, null, 2);
}

// A new-issue link on repo, prefilled with the entry.
export function issueUrl(repo: string, cat: SubmitCat, catLabel: string, d: EntryDraft, entry: string, placeholders: { name: string }): string {
	const { file } = SUBMIT_FILES[cat];
	const q = new URLSearchParams({ title: `Add ${d.name.trim() || placeholders.name} (${catLabel})`, body: `${catLabel}: \`${DATA_DIR}/${file}\`\n\n\`\`\`json\n${entry}\n\`\`\`\n` });
	return `${repo}/issues/new?${q}`;
}

// GitHub's editor for the category's data file; for a visitor without write access it forks the repository and opens a pull request.
export function editUrl(repo: string, cat: SubmitCat): string {
	return `${repo}/edit/main/${DATA_DIR}/${SUBMIT_FILES[cat].file}`;
}

