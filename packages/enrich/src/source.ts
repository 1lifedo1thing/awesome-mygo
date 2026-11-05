// What can be learned about a submitted entry from the catalog files and the project's repository, without touching the network: pure functions, so they are tested on their own.

// What an entry is, for its copy: an app, which also has a description besides the one-line summary, or an entry of another category the submission bot files. Articles have no copy to complete.
export type EntryKind = 'app' | 'ui' | 'state' | 'plugin';

// The directory under the catalog's data that holds each kind's files, one per entry, named after its slug.
export const ENTRY_DIRS: Record<EntryKind, string> = { app: 'apps', ui: 'ui', state: 'state', plugin: 'plugins' };

// What each kind is, for the model writing its copy.
export const KIND_NAMES: Record<EntryKind, string> = { app: 'an app in the showcase', ui: 'a UI component library, theme or icon set', state: 'a state management library', plugin: 'a MyGo plugin' };

// The files in head that base does not have: the entries a branch adds to a directory.
export function addedFiles(base: readonly string[], head: readonly string[]): string[] {
	const known = new Set(base);
	return head.filter((name) => name.endsWith('.json') && !known.has(name)).sort();
}

export type Entry = Record<string, unknown>;

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

// The project's own MyGo configuration among the repository's paths: mygo.json, which apps of native UI have, or mygo.config.ts (or .mts, .js, .mjs), which apps with a web frontend have. The shallowest one outside dependencies and examples, so an app kept under app/ is found while a vendored copy of MyGo's examples is not; at the same depth mygo.json first.
export function pickMygoConfig(paths: readonly string[]): string | undefined {
	const skip = /(^|\/)(node_modules|vendor|examples?|testdata|third_party)\//;
	const rank = (p: string) => (p.endsWith('.json') ? 0 : 1);
	const found = paths.filter((p) => /(^|\/)mygo(\.json|\.config\.(ts|mts|js|mjs))$/.test(p) && !skip.test(p));
	found.sort((a, b) => a.split('/').length - b.split('/').length || rank(a) - rank(b) || a.localeCompare(b));
	return found[0];
}

// What a mygo.config.ts or .js says that this package uses, read from its text since it is code: the name and icon when they are written as plain strings. An icon that is not a PNG, JPEG or WebP is macOS's own (an Icon Composer .icon or an .icns), as macos.icon is in mygo.json. Only the first name counts, as a file association has one too.
export function scriptConfig(text: string): { name?: string; icon?: string; macos?: { icon: string } } {
	const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
	const out: { name?: string; icon?: string; macos?: { icon: string } } = {};
	const name = /\bname\s*:\s*(?:(["'`])([^"'`\n]+)\1)?/.exec(code)?.[2]?.trim();
	if (name) out.name = name;
	for (const m of code.matchAll(/\bicon\s*:\s*(["'`])([^"'`\n]+)\1/g)) {
		const icon = m[2].trim();
		if (/\.(png|jpe?g|webp)$/i.test(icon)) out.icon ??= icon;
		else out.macos ??= { icon };
	}
	return out;
}

// A MyGo configuration's fields: mygo.json as JSON, which throws when it is not, and a script configuration as scriptConfig reads it.
export function parseMygoConfig(path: string, text: string): unknown {
	return path.endsWith('.json') ? JSON.parse(text) : scriptConfig(text);
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

// The app's icon as MyGo builds it (cmd/mygo/config.go): the configuration's `icon`, a square PNG, or else resources/icon.png beside the configuration when it exists, which is where `mygo init` puts MyGo's default icon; the caller tells that one apart by its pixels. An app whose only icon is macos.icon (an Icon Composer .icon, an Assets.car or an .icns) has one of its own that cannot be converted here: { macOnly } names it. undefined when the app has no icon at all.
export function iconOf(configPath: string, mygo: unknown, paths: readonly string[]): IconSource {
	const cfg = (mygo ?? {}) as { icon?: unknown; macos?: { icon?: unknown } };
	if (typeof cfg.icon === 'string' && cfg.icon.trim()) {
		const path = joinRepoPath(configPath, cfg.icon.trim());
		if (path && /\.(png|jpe?g|webp)$/i.test(path)) return { path };
	}
	const fallback = joinRepoPath(configPath, 'resources/icon.png');
	if (fallback !== undefined && paths.includes(fallback)) return { path: fallback };
	const mac = cfg.macos?.icon;
	if (typeof mac === 'string' && mac.trim()) return { macOnly: joinRepoPath(configPath, mac.trim()) ?? mac.trim() };
	return undefined;
}

// The app's icon files in a repository with no MyGo configuration to name one (BunnyBox keeps MyGo as a submodule and its icon in assets/icon-256.png), best first: an icon.png, appicon.png or icon-256.png at the root or in a folder of assets, largest first by the size in its name, and one with no size taken as large. Copies of other projects, examples and tests are passed over.
export function repoIcons(paths: readonly string[]): string[] {
	const name = /^(?:app[-_]?)?icon(?:[-_](\d+)(?:x\d+)?)?\.(?:png|jpe?g|webp)$/i;
	const folder = /^(?:assets|resources|build|icons?|images?|img|static|public|res)$/i;
	const foreign = /(^|\/)(node_modules|third_party|vendor|examples?|testdata|tests?)\//i;
	const size = (p: string) => Number(name.exec(p.split('/').pop() ?? '')?.[1] ?? 1024);
	return paths
		.filter((p) => {
			const parts = p.split('/');
			const file = parts.pop() ?? '';
			return name.test(file) && !foreign.test(p) && parts.every((d) => folder.test(d) || /^(?:app|desktop|src)$/i.test(d));
		})
		.sort((a, b) => size(b) - size(a) || a.split('/').length - b.split('/').length || a.localeCompare(b));
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

// Whether an image is far wider than a window, as a banner or a row of links is (LunaBox's QQ group strip is 720×240); a desktop window rarely runs past 2.4 to 1.
export function isBanner(width: number, height: number): boolean {
	return width > 0 && height > 0 && width / height > 2.4;
}

// Whether an image is taller than it is wide, such as a tray panel or a phone screen. The app page draws its screenshot at the column's full width, so a portrait one runs far taller than the window; a README usually has a window further down.
export function isPortrait(width: number, height: number): boolean {
	return width > 0 && height > width;
}

// ---- screenshots ----

// A file of a repository's branch as raw.githubusercontent.com serves it.
export const rawUrl = (repo: string, branch: string, path: string) => `https://raw.githubusercontent.com/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`;

// The narrowest image taken as a screenshot of a desktop window.
export const SHOT_MIN_WIDTH = 600;

export type ShotProblem = 'narrow' | 'square' | 'portrait' | 'banner';

// Why an image of this size is not a screenshot of a desktop window, or undefined when it can be one: under SHOT_MIN_WIDTH wide, square (an icon or a logo), taller than wide (a tray panel or a phone), or a banner. The submission workflow, the site's form and its Worker all judge by this.
export function shotProblem(width: number, height: number): ShotProblem | undefined {
	if (width < SHOT_MIN_WIDTH) return 'narrow';
	if (isSquarish(width, height)) return 'square';
	if (isPortrait(width, height)) return 'portrait';
	if (isBanner(width, height)) return 'banner';
	return undefined;
}

// What an image the form takes may be: a PNG, JPEG or WebP of at most this many bytes.
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

// Where the site's bot puts a screenshot a visitor uploaded with the form, on the pull request's branch: the submission workflow turns it into the site's WebP in apps/web/public/shots and removes it.
export const STAGED_SHOTS = 'submissions';
export const stagedShot = (slug: string, format: 'png' | 'jpeg' | 'webp') => `${STAGED_SHOTS}/${slug}.${format === 'jpeg' ? 'jpg' : format}`;

// The staged screenshot of slug among the files of STAGED_SHOTS, if there is one.
export function stagedShotOf(files: readonly string[], slug: string): string | undefined {
	const file = files.find((f) => new RegExp(`^${slug.replace(/[^a-z0-9-]/g, '')}\\.(png|jpg|webp)$`).test(f));
	return file ? `${STAGED_SHOTS}/${file}` : undefined;
}

// Where a repository's screenshots may be, in the order they are tried, each source with how many of its images are tried: the README's images, as the project picked them to show itself, then the images in its screenshot folders, which a project with none in its README often keeps for its website. An image is listed once; the caller passes over those named as artwork (isArtwork).
export function repoShotSources(r: { repo: string; branch: string; paths: readonly string[]; readme?: { path: string; text: string } }): { from: string; urls: string[]; tries: number }[] {
	const seen = new Set<string>();
	const keep = (u: string | undefined): u is string => !!u && !seen.has(u) && !!seen.add(u);
	return [
		{ from: 'the README', urls: r.readme ? readmeImages(r.readme.text).map((src) => resolveImage(src, r.repo, r.branch, (r.readme as { path: string }).path)).filter(keep) : [], tries: 8 },
		{ from: 'a screenshot folder in the repository', urls: repoScreenshots(r.paths).map((p) => rawUrl(r.repo, r.branch, p)).filter(keep), tries: 6 },
	];
}

// The screenshot link a visitor gave in the site's form, from the pull request the bot opened: apps/web/src/server/submit.ts writes it as <!-- submitted-screenshot: URL -->. The link is checked again with the form's rule (https, no space, quote, backtick or angle bracket), as the body could have been edited since.
export function submittedScreenshot(body: string | null | undefined): string | undefined {
	const m = /<!-- submitted-screenshot: (\S+) -->/.exec(body ?? '');
	const url = m?.[1];
	return url && url.length <= 300 && /^https:\/\/[^\s<>"'`]+$/.test(url) ? url : undefined;
}

// Images in the repository's screenshot folders (screenshots/, screenshot/, screens/ or shots/, at any depth), for an app whose README shows none that fits: a project often keeps them for its website instead (popMind's are in website/public/shots/en/). Folders for English come first where there are folders per language, then the rest in path order.
export function repoScreenshots(paths: readonly string[]): string[] {
	const inFolder = /(^|\/)(screenshots?|screens|shots)\//i;
	const image = /\.(png|jpe?g|webp)$/i;
	const english = (p: string) => (/\/en(-[a-z]+)?\//i.test(p) ? 0 : 1);
	return paths.filter((p) => inFolder.test(p) && image.test(p) && !p.includes('node_modules/')).sort((a, b) => english(a) - english(b) || a.localeCompare(b));
}

// The values a field may take in one of the catalog's schemas (properties.<field>.enum), such as an app's categories in app.schema.json.
export function schemaEnum(schema: unknown, field: string): string[] {
	const values = (schema as { properties?: Record<string, { enum?: unknown } | undefined> })?.properties?.[field]?.enum;
	return Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string') : [];
}

// A field the model picks from the values its schema allows.
export type ChoiceField = 'category' | 'tag' | 'surface';

// What the values of each field mean, for the model picking one; the same words as the discover workflow's triage.
export const CHOICE_HINTS: Record<ChoiceField, string> = {
	category: 'the one that best says what the app is for',
	tag: 'theme for a component library or theme, retro for one in a retro style, icons for an icon set',
	surface: 'web when it serves web pages (a JavaScript package), native when it works with the native UI (Go), both when it has a part for each',
};

// What the model picks along with the copy: the fields the site's form fills in without asking (buildEntry in packages/catalog), as long as they still hold its default. An app's category, which the form leaves out unless its author picked a group; a UI library's tag and surface, which it sets to theme and native; a plugin's surface, which it sets to web; and the tags of a state management library (just state) and of a plugin (none). An entry the discover workflow adds was triaged with these already, and one still at the default is only picked again.
export function formDefaults(kind: EntryKind, entry: Entry): { choices: ChoiceField[]; tags: boolean } {
	const tags = Array.isArray(entry.tags) ? entry.tags : [];
	const at = (field: ChoiceField, def?: string) => (entry[field] === undefined || entry[field] === def ? [field] : []);
	switch (kind) {
		case 'app':
			return { choices: at('category'), tags: false };
		case 'ui':
			return { choices: [...at('tag', 'theme'), ...at('surface', 'native')], tags: false };
		case 'state':
			return { choices: [], tags: tags.length === 0 || (tags.length === 1 && tags[0] === 'state') };
		case 'plugin':
			return { choices: at('surface', 'web'), tags: tags.length === 0 };
	}
}

// Up to four tags as the site keeps them: lowercase words, each once.
export function cleanTags(tags: readonly string[]): string[] {
	return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 4);
}

// The homepage a repository's settings give, as an entry's homepage: an https link that is not the repository itself.
export function homepageOf(homepage: string | null | undefined, repo: string): string | undefined {
	const h = homepage?.trim();
	if (!h?.startsWith('https://')) return undefined;
	try {
		const u = new URL(h);
		if (u.hostname === 'github.com' && u.pathname.replace(/\/+$/, '').toLowerCase() === `/${repo.toLowerCase()}`) return undefined;
	} catch {
		return undefined;
	}
	return h;
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

// The app's name as its MyGo configuration spells it, when the submitted name is the same word in other letter case: the form offers the repository's name (myskills), while the app calls itself MySkills. A name the visitor chose differently is kept.
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

// Whether an image's file name says it is not a screenshot of the app: a hero image, banner, cover, logo or social preview, which a README often puts first (LunaBox's screenshot/hero.png), or a link to a community, a sponsor page or a QR code.
export function isArtwork(url: string): boolean {
	const file = (url.split(/[?#]/)[0].split('/').pop() ?? '').toLowerCase();
	const words = file.replace(/\.[a-z0-9]+$/, '').split(/[-_.\s]+/);
	const art = ['hero', 'banner', 'cover', 'logo', 'og', 'social', 'community', 'qq', 'telegram', 'discord', 'wechat', 'weixin', 'sponsor', 'sponsors', 'donate', 'qr', 'qrcode', 'badge'];
	return words.some((w) => art.includes(w));
}

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
