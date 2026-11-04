// What can be learned about a submitted entry from the catalog files and the project's repository, without touching the network: pure functions, so they are tested on their own.

// The list files the submission bot appends to, with the list each keeps its entries in. Articles have no copy to complete. Apps are not here: each is a file of its own under APP_DIR.
export const DATA_FILES = {
	'ui.json': { list: 'libraries' },
	'state.json': { list: 'solutions' },
	'plugins.json': { list: 'plugins' },
} as const;
export type DataFile = keyof typeof DATA_FILES;

// What an entry is, for its copy: an app, which also has a description besides the one-line summary, or an entry of a list file.
export type EntryKind = 'app' | DataFile;

// The directory under the catalog's data that holds one file per app, named after its slug.
export const APP_DIR = 'apps';

// The app files in head that base does not have: the apps a branch adds.
export function addedAppFiles(base: readonly string[], head: readonly string[]): string[] {
	const known = new Set(base);
	return head.filter((name) => name.endsWith('.json') && !known.has(name)).sort();
}

export type Entry = Record<string, unknown>;

// Indices of the entries in head that base does not have, compared by their whole content, so a reordered or untouched entry is never taken for a new one.
export function addedEntries(base: readonly unknown[], head: readonly unknown[]): number[] {
	const known = new Set(base.map((e) => JSON.stringify(e)));
	return head.flatMap((e, i) => (known.has(JSON.stringify(e)) ? [] : [i]));
}

// owner/name of the entry's GitHub repository: its `repo` field, or else its link when that is a repository.
export function repoOfEntry(entry: Entry): string | undefined {
	if (typeof entry.repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(entry.repo)) return entry.repo;
	for (const key of ['url', 'docs']) {
		const v = entry[key];
		if (typeof v !== 'string') continue;
		const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/.exec(v.trim());
		if (m) return `${m[1]}/${m[2]}`;
	}
	return undefined;
}

// The project's own mygo.json among the repository's paths: the shallowest one outside dependencies and examples, so an app kept under app/ is found while a vendored copy of MyGo's examples is not.
export function pickMygoJson(paths: readonly string[]): string | undefined {
	const skip = /(^|\/)(node_modules|vendor|examples?|testdata|third_party)\//;
	const found = paths.filter((p) => (p === 'mygo.json' || p.endsWith('/mygo.json')) && !skip.test(p));
	found.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
	return found[0];
}

// A path relative to a file in the repository, as a path from the repository root; undefined when it leaves the repository.
export function joinRepoPath(fromFile: string, rel: string): string | undefined {
	const parts = fromFile.split('/').slice(0, -1);
	for (const seg of rel.replace(/^\.\//, '').split('/')) {
		if (seg === '' || seg === '.') continue;
		if (seg === '..') {
			if (!parts.length) return undefined;
			parts.pop();
		} else parts.push(seg);
	}
	return parts.join('/');
}

export type IconSource = { path: string } | { macOnly: string } | undefined;

// The app's icon as MyGo builds it (cmd/mygo/config.go): mygo.json's `icon`, a square PNG, or else resources/icon.png beside mygo.json when it exists, which is where `mygo init` puts MyGo's default icon; the caller tells that one apart by its pixels. An app whose only icon is macos.icon (an Icon Composer .icon, an Assets.car or an .icns) has one of its own that cannot be converted here: { macOnly } names it. undefined when the app has no icon at all.
export function iconOf(mygoJsonPath: string, mygo: unknown, paths: readonly string[]): IconSource {
	const cfg = (mygo ?? {}) as { icon?: unknown; macos?: { icon?: unknown } };
	if (typeof cfg.icon === 'string' && cfg.icon.trim()) {
		const path = joinRepoPath(mygoJsonPath, cfg.icon.trim());
		if (path && /\.(png|jpe?g|webp)$/i.test(path)) return { path };
	}
	const fallback = joinRepoPath(mygoJsonPath, 'resources/icon.png');
	if (fallback !== undefined && paths.includes(fallback)) return { path: fallback };
	const mac = cfg.macos?.icon;
	if (typeof mac === 'string' && mac.trim()) return { macOnly: joinRepoPath(mygoJsonPath, mac.trim()) ?? mac.trim() };
	return undefined;
}

// Where to cut an icon, from ImageMagick's box (%@, "WxH+X+Y") around its mostly opaque pixels: a macOS icon's plate inside its transparent margins. An icon with no transparency at all gives an empty box (0x0), and is kept whole, as is one whose box cannot be read. side is the square the icon is centred on.
export function iconCut(box: string, width: number, height: number): { crop?: string; side: number } {
	const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(box.trim());
	const [w, h] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
	return w > 0 && h > 0 ? { crop: box.trim(), side: Math.max(w, h) } : { side: Math.max(width, height) };
}

// Whether an image's width and height are close enough to make it square: an app icon or a logo, not a screenshot of a desktop window.
export function isSquarish(width: number, height: number): boolean {
	return width > 0 && height > 0 && Math.max(width, height) / Math.min(width, height) < 1.15;
}

// Whether an image is taller than it is wide, such as a tray panel or a phone screen. The app page draws its screenshot at the column's full width, so a portrait one runs far taller than the window; a README usually has a window further down.
export function isPortrait(width: number, height: number): boolean {
	return width > 0 && height > width;
}

// Images in the repository's screenshot folders (screenshots/, screenshot/, screens/ or shots/, at any depth), for an app whose README shows none that fits: a project often keeps them for its website instead (popMind's are in website/public/shots/en/). Folders for English come first where there are folders per language, then the rest in path order.
export function repoScreenshots(paths: readonly string[]): string[] {
	const inFolder = /(^|\/)(screenshots?|screens|shots)\//i;
	const image = /\.(png|jpe?g|webp)$/i;
	const english = (p: string) => (/\/en(-[a-z]+)?\//i.test(p) ? 0 : 1);
	return paths.filter((p) => inFolder.test(p) && image.test(p) && !p.includes('node_modules/')).sort((a, b) => english(a) - english(b) || a.localeCompare(b));
}

// The app categories the catalog's schema allows (app.schema.json, properties.category.enum).
export function appCategories(schema: unknown): string[] {
	const values = (schema as { properties?: { category?: { enum?: unknown } } })?.properties?.category?.enum;
	return Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string') : [];
}

// Sets the entry's category in place, right after kind as in the files written by hand, since the entry is written back in its key order.
export function setCategory(entry: Entry, category: string): void {
	const fields = Object.entries(entry).filter(([k]) => k !== 'category');
	for (const k of Object.keys(entry)) delete entry[k];
	for (const [k, v] of fields) {
		entry[k] = v;
		if (k === 'kind') entry.category = category;
	}
	if (!('category' in entry)) entry.category = category;
}

export const SITE_LANGS = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko'] as const;

// Whether a text field has a non-empty string in every site language, as one written by hand or completed before does.
export function hasAllLanguages(text: unknown): boolean {
	if (!text || typeof text !== 'object') return false;
	const t = text as Record<string, unknown>;
	return SITE_LANGS.every((l) => typeof t[l] === 'string' && (t[l] as string).trim() !== '');
}

export type Caps = Partial<Record<(typeof SITE_LANGS)[number], number>>;

// The longest text each language has in a field of the example entries: the length new copy should keep within, as hand-written entries set it.
export function lengthCaps(examples: readonly Entry[], field: 'summary' | 'description'): Caps {
	const caps: Caps = {};
	for (const e of examples) {
		const t = e[field] as Record<string, unknown> | undefined;
		for (const l of SITE_LANGS) {
			const v = t?.[l];
			if (typeof v === 'string') caps[l] = Math.max(caps[l] ?? 0, [...v].length);
		}
	}
	return caps;
}

// The languages in which text runs more than a tenth past its cap, as "en 580/405".
export function overCaps(text: Record<string, string>, caps: Caps): string[] {
	return SITE_LANGS.flatMap((l) => {
		const cap = caps[l];
		const len = typeof text[l] === 'string' ? [...text[l]].length : 0;
		return cap && len > cap * 1.1 ? [`${l} ${len}/${cap}`] : [];
	});
}

// The app's name as mygo.json spells it, when the submitted name is the same word in other letter case: the form offers the repository's name (myskills), while the app calls itself MySkills. A name the visitor chose differently is kept.
export function appNameFrom(submitted: string, mygo: unknown): string | undefined {
	const name = (mygo as { name?: unknown } | null)?.name;
	if (typeof name !== 'string' || name === submitted) return undefined;
	return name.trim().toLowerCase() === submitted.trim().toLowerCase() ? name.trim() : undefined;
}

// Image sources in a README, in the order they appear: Markdown images and HTML <img> tags.
export function readmeImages(md: string): string[] {
	const out: { at: number; src: string }[] = [];
	for (const m of md.matchAll(/!\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^)\s]+))(?:\s+"[^"\n]*")?\s*\)/g)) out.push({ at: m.index, src: m[1] ?? m[2] });
	for (const m of md.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) out.push({ at: m.index, src: m[1] });
	return out.sort((a, b) => a.at - b.at).map((x) => x.src);
}

// Badges and other images that are never a screenshot of the app.
const NOT_A_SHOT = /(^|\.)(img\.shields\.io|badge\.fury\.io|badgen\.net|codecov\.io|goreportcard\.com|pkg\.go\.dev|deepwiki\.com)$/;

// Where to download a README image from: a link inside the repository becomes its raw file on the default branch, a link elsewhere is kept as long as it is https. SVGs, badges and workflow status images are skipped.
export function resolveImage(src: string, repo: string, branch: string, readmePath: string): string | undefined {
	const s = src.trim();
	if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !s.startsWith('https://')) return undefined;
	if (/\.svg(?:[?#]|$)/i.test(s) || /\/badge(\.svg)?(?:[?#]|$)/i.test(s)) return undefined;
	if (s.startsWith('https://')) {
		const url = new URL(s);
		if (NOT_A_SHOT.test(url.hostname)) return undefined;
		// github.com/<owner>/<name>/blob/<ref>/<path> is an HTML page; its raw file is what can be downloaded.
		const blob = /^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/.exec(url.pathname);
		if (url.hostname === 'github.com' && blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
		return url.href;
	}
	if (s.startsWith('//') || s.startsWith('#')) return undefined;
	const rel = s.split(/[?#]/)[0];
	const path = rel.startsWith('/') ? rel.slice(1) : joinRepoPath(readmePath, rel);
	return path ? `https://raw.githubusercontent.com/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}` : undefined;
}

// The image format from a file's first bytes. Only these three are handed to ImageMagick, whatever the server or the file name claims.
export function sniffImage(bytes: Uint8Array): 'png' | 'jpeg' | 'webp' | undefined {
	const at = (i: number, ...b: number[]) => b.every((x, j) => bytes[i + j] === x);
	if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';
	if (at(0, 0xff, 0xd8, 0xff)) return 'jpeg';
	if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'webp';
	return undefined;
}
