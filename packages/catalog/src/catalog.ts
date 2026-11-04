import appsJson from '../data/apps.json';
import articlesJson from '../data/articles.json';
import docsJson from '../data/docs.json';
import pluginsJson from '../data/plugins.json';
import stateJson from '../data/state.json';
import uiJson from '../data/ui.json';
import type { Text } from './lang';
import type { StringKey } from './strings';
import { readList, unique } from './validate';

// The entries live in packages/catalog/data/*.json, one file per category, so adding one is a JSON edit; data/schema/ describes their fields. Data sources: egoist/mygo (website/src/showcase.ts, docs/) and each project's own README.

export const SITE_URL = 'https://mygodock.dev';
export const MYGO_SITE = 'https://mygo.egoist.dev';
export const MYGO_SHOWCASE = 'https://mygo.egoist.dev/showcase';
export const MYGO_REPO = 'https://github.com/egoist/mygo';
// This site's own repository, where submissions arrive.
export const SITE_REPO = 'https://github.com/yldm-tech/awesome-mygo';
export const DATA_DIR = 'packages/catalog/data';
export const SPONSOR_URL = 'https://github.com/sponsors/egoist';
export const DOCS_BASE = 'https://github.com/egoist/mygo/blob/main/docs/';
export const BINDINGS_DOC = `${DOCS_BASE}bindings.md`;
export const PLUGINS_DOC = `${DOCS_BASE}plugins.md`;
export const NATIVE_UI_DOCS = `${MYGO_SITE}/docs/ui`;

export const RESOURCES = [
	{ key: 'res_site', url: MYGO_SITE },
	{ key: 'res_docs', url: `${MYGO_SITE}/docs` },
	{ key: 'res_ui', url: NATIVE_UI_DOCS },
	{ key: 'res_examples', url: `${MYGO_REPO}/tree/main/examples` },
	{ key: 'res_bench', url: `${MYGO_SITE}/benchmarks` },
	{ key: 'res_releases', url: `${MYGO_REPO}/releases` },
] as const satisfies readonly { key: StringKey; url: string }[];

const SLUG = /^[a-z0-9-]+$/;
const SHOT = /^[a-z0-9-]+\.(webp|svg)$/;
const REPO = /^[^/\s]+\/[^/\s]+$/;
const shot = (file: string | undefined) => (file ? `/shots/${file}` : undefined);

// ---- apps (data/apps.json) ----

export type AppKind = 'native' | 'web';

export interface App {
	slug: string;
	name: string;
	author: string;
	kind: AppKind;
	url: string;
	// One line, for cards and search results.
	desc: Text;
	// The full description, for the detail drawer.
	about: Text;
	// Screenshot under /shots/, when the project provides one.
	image?: string;
	// The app's icon: its ai-logo avatar on the ai-logo CDN, its official icon under /icons/, or none, for the letter tile.
	icon?: string;
}

// Icons come from yldm-tech/ai-logo (its avatar renders), served by its CDN.
export const AILOGO_CDN = 'https://ailogo.yldm.ai/avatar/';

export const APPS: readonly App[] = readList('apps.json', appsJson, 'apps', (r) => {
	r.only(['slug', 'name', 'author', 'kind', 'url', 'summary', 'description', 'screenshot', 'icon']);
	const icon = r.raw.icon as { ailogo?: unknown; file?: unknown } | undefined;
	let iconUrl: string | undefined;
	if (icon !== undefined) {
		if (typeof icon?.ailogo === 'string' && /^[a-z0-9]+$/.test(icon.ailogo) && Object.keys(icon).length === 1) iconUrl = `${AILOGO_CDN}${icon.ailogo}.webp`;
		else if (typeof icon?.file === 'string' && /^[a-z0-9-]+\.webp$/.test(icon.file) && Object.keys(icon).length === 1) iconUrl = `/icons/${icon.file}`;
		else r.fail('icon', 'must be { "ailogo": "<id>" } or { "file": "<name>.webp" }');
	}
	return {
		slug: r.match('slug', SLUG, 'lowercase letters, digits and hyphens'),
		name: r.str('name'),
		author: r.str('author'),
		kind: r.oneOf('kind', ['native', 'web'] as const),
		url: r.url('url'),
		desc: r.text('summary'),
		about: r.text('description'),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
		icon: iconUrl,
	};
});
unique('apps.json', APPS, 'slug', (a) => a.slug);

export function appBySlug(slug: string): App | undefined {
	return APPS.find((a) => a.slug === slug);
}

// ---- UI component libraries (data/ui.json) ----

export const UI_KEYS = ['theme', 'retro', 'icons'] as const;
export type UiLibKey = (typeof UI_KEYS)[number];

export interface UiLib {
	name: string;
	author: string;
	key: UiLibKey;
	desc: Text;
	repo: string;
	url: string;
	homepage?: string;
	image?: string;
}

export const UI_LIBS: readonly UiLib[] = readList('ui.json', uiJson, 'libraries', (r) => {
	r.only(['name', 'author', 'tag', 'summary', 'repo', 'url', 'homepage', 'screenshot']);
	return {
		name: r.str('name'),
		author: r.str('author'),
		key: r.oneOf('tag', UI_KEYS),
		desc: r.text('summary'),
		repo: r.match('repo', REPO, 'owner/name'),
		url: r.url('url'),
		homepage: r.optUrl('homepage'),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
	};
});
unique('ui.json', UI_LIBS, 'repo', (l) => l.repo);

// ---- state management (data/state.json) ----

export interface StateSolution {
	name: string;
	author: string;
	desc: Text;
	repo: string;
	url: string;
	homepage?: string;
	install: string;
	tags: readonly string[];
	image?: string;
}

export const STATE_SOLUTIONS: readonly StateSolution[] = readList('state.json', stateJson, 'solutions', (r) => {
	r.only(['name', 'author', 'summary', 'repo', 'url', 'homepage', 'install', 'tags', 'screenshot']);
	return {
		name: r.str('name'),
		author: r.str('author'),
		desc: r.text('summary'),
		repo: r.match('repo', REPO, 'owner/name'),
		url: r.url('url'),
		homepage: r.optUrl('homepage'),
		install: r.str('install'),
		tags: r.strings('tags', 1),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
	};
});
unique('state.json', STATE_SOLUTIONS, 'repo', (s) => s.repo);

// ---- plugins (data/plugins.json) ----

export type PluginSurface = 'web' | 'native' | 'both';

export interface Plugin {
	slug: string;
	mark: string;
	name: string;
	desc: Text;
	official: boolean;
	// Which kind of window the plugin serves: web pages (a Go package plus an npm package), native UI (all Go), or both.
	surface: PluginSurface;
	tags: readonly string[];
	url: string;
}

const ALL_PLUGINS: readonly Plugin[] = readList('plugins.json', pluginsJson, 'plugins', (r) => {
	r.only(['slug', 'name', 'mark', 'official', 'surface', 'tags', 'docs', 'summary']);
	return {
		slug: r.match('slug', SLUG, 'lowercase letters, digits and hyphens'),
		name: r.str('name'),
		mark: r.match('mark', /^\S{1,2}$/, 'one or two characters'),
		official: r.bool('official'),
		surface: r.oneOf('surface', ['web', 'native', 'both'] as const),
		tags: r.strings('tags'),
		url: r.url('docs'),
		desc: r.text('summary'),
	};
});
unique('plugins.json', ALL_PLUGINS, 'slug', (p) => p.slug);

// Official plugins, in the order of docs/plugins.md.
export const PLUGINS: readonly Plugin[] = ALL_PLUGINS.filter((p) => p.official);
export const COMMUNITY_PLUGINS: readonly Plugin[] = ALL_PLUGINS.filter((p) => !p.official);

// ---- guides (data/docs.json) and articles (data/articles.json) ----

export interface Doc {
	title: string;
	url: string;
	desc: Text;
}

// The guides of docs/README.md, in its order.
export const DOCS: readonly Doc[] = readList('docs.json', docsJson, 'guides', (r) => {
	r.only(['title', 'file', 'summary']);
	return { title: r.str('title'), url: DOCS_BASE + r.str('file'), desc: r.text('summary') };
});

export interface Article {
	title: string;
	site: string;
	url: string;
}

export const ARTICLES: readonly Article[] = readList('articles.json', articlesJson, 'articles', (r) => {
	r.only(['title', 'site', 'url']);
	return { title: r.str('title'), site: r.str('site'), url: r.url('url') };
});
unique('articles.json', ARTICLES, 'url', (a) => a.url);

// ---- install commands ----

export type InstallTab = 'bun' | 'go' | 'native';

export const INSTALL_TABS: readonly { key: InstallTab; label: string }[] = [
	{ key: 'bun', label: 'bunx' },
	{ key: 'go', label: 'go run' },
	{ key: 'native', label: 'native' },
];

export const INSTALL_CMDS: Record<InstallTab, string> = {
	bun: 'bunx mygo-cli init my-app',
	go: 'go run github.com/egoist/mygo/cmd/mygo@latest init my-app',
	native: 'go run github.com/egoist/mygo/cmd/mygo@latest init -template native my-app',
};

export const CLI_CMDS = ['bunx mygo-cli init my-app', 'mygo doctor'] as const;

export function hostOf(url: string): string {
	return url.replace('https://', '').replace(/\/$/, '');
}

export function pad2(n: number): string {
	return (n < 10 ? '0' : '') + n;
}
