// Submission form: the README line a contributor pastes into a PR on the upstream list.

export const SUBMIT_CATS = ['ui', 'state', 'plugin', 'showcase', 'article'] as const;
export type SubmitCat = (typeof SUBMIT_CATS)[number];

export const DESC_MAX = 120;

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
export function readmeEntry(d: EntryDraft, placeholders: { name: string; desc: string }): string {
	return `- [${d.name.trim() || placeholders.name}](${d.url.trim() || 'https://…'}) - ${d.desc.trim() || placeholders.desc}`;
}
