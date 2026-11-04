// Submission form. Apps go to egoist/mygo's showcase.ts as a pull request; everything else is an issue on this site's repository.

export const SUBMIT_CATS = ['ui', 'state', 'plugin', 'showcase', 'article'] as const;
export type SubmitCat = (typeof SUBMIT_CATS)[number];

// A list entry stays one line; showcase.ts asks for "a sentence or two".
export function descMax(cat: SubmitCat): number {
	return cat === 'showcase' ? 300 : 120;
}

export interface EntryDraft {
	name: string;
	url: string;
	desc: string;
}

// Empty is not "bad": the error only shows once something that is not an https link has been typed.
export function isBadUrl(url: string): boolean {
	return url.length > 0 && !url.startsWith('https://');
}

export function isEntryComplete(d: EntryDraft): boolean {
	return Boolean(d.name.trim() && d.url.trim() && !isBadUrl(d.url) && d.desc.trim());
}

// Missing fields render as placeholders so the preview always shows the final shape.
export function listEntry(d: EntryDraft, placeholders: { name: string; desc: string }): string {
	return `- [${d.name.trim() || placeholders.name}](${d.url.trim() || 'https://…'}) - ${d.desc.trim() || placeholders.desc}`;
}

// A new-issue link on repo, prefilled with the entry, so a submission is one click once the form is filled.
export function issueUrl(repo: string, catLabel: string, d: EntryDraft, placeholders: { name: string; desc: string }): string {
	const q = new URLSearchParams({ title: `Add ${d.name.trim() || placeholders.name} (${catLabel})`, body: `${catLabel}\n\n${listEntry(d, placeholders)}\n` });
	return `${repo}/issues/new?${q}`;
}

// An entry for egoist/mygo website/src/showcase.ts, in that file's shape (two-space indent, double quotes).
export function showcaseEntry(d: EntryDraft, mode: 'native' | 'web', placeholders: { name: string; desc: string }): string {
	const q = (s: string) => JSON.stringify(s);
	return ['{', `  name: ${q(d.name.trim() || placeholders.name)},`, `  description: ${q(d.desc.trim() || placeholders.desc)},`, `  url: ${q(d.url.trim() || 'https://…')},`, `  mode: ${q(mode)},`, '},'].join('\n');
}
