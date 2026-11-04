import appsJson from '../data/apps.json';
import articlesJson from '../data/articles.json';
import docsJson from '../data/docs.json';
import pluginsJson from '../data/plugins.json';
import stateJson from '../data/state.json';
import uiJson from '../data/ui.json';
import type { Text } from './lang';
import type { StringKey } from './strings';
import { type Reader, readList, unique } from './validate';

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

// Each read* function checks a whole data file, the bundled one at load or a contributor's version of it, and throws a CatalogError naming the entry and field of the first mistake.

// ---- apps (data/apps.json) ----

export type AppKind = 'native' | 'web';

// The schema.org applicationCategory values Google's software-app structured data accepts that can describe a desktop app.
export const APP_CATEGORIES = ['BusinessApplication', 'CommunicationApplication', 'DesignApplication', 'DeveloperApplication', 'EducationalApplication', 'EntertainmentApplication', 'FinanceApplication', 'GameApplication', 'HealthApplication', 'LifestyleApplication', 'MultimediaApplication', 'ReferenceApplication', 'SecurityApplication', 'UtilitiesApplication'] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];

// What visitors browse the showcase by: a handful of groups over the schema.org categories, so a group never holds only one or two apps for long. An app without a category is `other`.
export const APP_GROUPS = ['dev', 'media', 'utility', 'chat', 'game', 'design', 'other'] as const;
export type AppGroup = (typeof APP_GROUPS)[number];

const GROUP_OF: Record<AppCategory, Exclude<AppGroup, 'other'>> = {
	DeveloperApplication: 'dev',
	MultimediaApplication: 'media',
	EntertainmentApplication: 'media',
	UtilitiesApplication: 'utility',
	BusinessApplication: 'utility',
	FinanceApplication: 'utility',
	LifestyleApplication: 'utility',
	ReferenceApplication: 'utility',
	SecurityApplication: 'utility',
	HealthApplication: 'utility',
	EducationalApplication: 'utility',
	CommunicationApplication: 'chat',
	GameApplication: 'game',
	DesignApplication: 'design',
};

// The category a submission gets when its author picks a group.
export const GROUP_CATEGORY: Record<Exclude<AppGroup, 'other'>, AppCategory> = {
	dev: 'DeveloperApplication',
	media: 'MultimediaApplication',
	utility: 'UtilitiesApplication',
	chat: 'CommunicationApplication',
	game: 'GameApplication',
	design: 'DesignApplication',
};

export function appGroup(app: { category?: AppCategory }): AppGroup {
	return app.category ? GROUP_OF[app.category] : 'other';
}

export function isAppGroup(v: unknown): v is AppGroup {
	return typeof v === 'string' && (APP_GROUPS as readonly string[]).includes(v);
}

export interface App {
	slug: string;
	name: string;
	author: string;
	kind: AppKind;
	// For structured data only; an entry without one names no category.
	category?: AppCategory;
	// The app's homepage: its website, or its repository when it has none.
	url: string;
	// Its GitHub repository as owner/name, for an open-source app; closed-source apps leave it out.
	repo?: string;
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

const readApp = (r: Reader): App => {
	r.only(['slug', 'name', 'author', 'kind', 'category', 'url', 'repo', 'summary', 'description', 'screenshot', 'icon']);
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
		category: r.raw.category === undefined ? undefined : r.oneOf('category', APP_CATEGORIES),
		url: r.url('url'),
		repo: r.raw.repo === undefined ? undefined : r.match('repo', REPO, 'owner/name'),
		desc: r.text('summary'),
		about: r.text('description'),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
		icon: iconUrl,
	};
};

export function readApps(json: unknown): App[] {
	const apps = readList('apps.json', json, 'apps', readApp);
	unique('apps.json', apps, 'slug', (a) => a.slug);
	return apps;
}

export const APPS: readonly App[] = readApps(appsJson);

// The app's GitHub repository link, unless its homepage is that repository already.
export function appSource(app: { url: string; repo?: string }): string | undefined {
	if (!app.repo) return undefined;
	const src = `https://github.com/${app.repo}`;
	return app.url.replace(/\/+$/, '').toLowerCase() === src.toLowerCase() ? undefined : src;
}

export function appBySlug(slug: string): App | undefined {
	return APPS.find((a) => a.slug === slug);
}

// The author's GitHub profile, only where the data proves the author name is a GitHub login: one of their apps lives in a repository that login owns. Otherwise undefined, since a name such as 'Faizan' is not necessarily a login.
export function authorProfile(author: string): string | undefined {
	const login = author.toLowerCase();
	const owns = APPS.some((a) => a.author === author && new URL(a.url).hostname === 'github.com' && new URL(a.url).pathname.split('/')[1]?.toLowerCase() === login);
	return owns ? `https://github.com/${author}` : undefined;
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

const readUiLib = (r: Reader): UiLib => {
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
};

export function readUiLibs(json: unknown): UiLib[] {
	const libs = readList('ui.json', json, 'libraries', readUiLib);
	unique('ui.json', libs, 'repo', (l) => l.repo);
	return libs;
}

export const UI_LIBS: readonly UiLib[] = readUiLibs(uiJson);

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

const readStateSolution = (r: Reader): StateSolution => {
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
};

export function readStateSolutions(json: unknown): StateSolution[] {
	const solutions = readList('state.json', json, 'solutions', readStateSolution);
	unique('state.json', solutions, 'repo', (x) => x.repo);
	return solutions;
}

export const STATE_SOLUTIONS: readonly StateSolution[] = readStateSolutions(stateJson);

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
	// The Go package the app imports, and the npm package of the JavaScript half when the plugin has one.
	goImport?: string;
	npm?: string;
	tags: readonly string[];
	url: string;
}

const GO_IMPORT = /^[a-z0-9.-]+(\/[A-Za-z0-9._~-]+)+$/;
const NPM_NAME = /^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$/;

const readPlugin = (r: Reader): Plugin => {
	r.only(['slug', 'name', 'mark', 'official', 'surface', 'import', 'npm', 'tags', 'docs', 'summary']);
	return {
		slug: r.match('slug', SLUG, 'lowercase letters, digits and hyphens'),
		name: r.str('name'),
		mark: r.match('mark', /^\S{1,2}$/, 'one or two characters'),
		official: r.bool('official'),
		surface: r.oneOf('surface', ['web', 'native', 'both'] as const),
		goImport: r.raw.import === undefined ? undefined : r.match('import', GO_IMPORT, 'a Go import path'),
		npm: r.raw.npm === undefined ? undefined : r.match('npm', NPM_NAME, 'an npm package name'),
		tags: r.strings('tags'),
		url: r.url('docs'),
		desc: r.text('summary'),
	};
};

export function readPlugins(json: unknown): Plugin[] {
	const plugins = readList('plugins.json', json, 'plugins', readPlugin);
	unique('plugins.json', plugins, 'slug', (p) => p.slug);
	return plugins;
}

const ALL_PLUGINS: readonly Plugin[] = readPlugins(pluginsJson);

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

const readArticle = (r: Reader): Article => {
	r.only(['title', 'site', 'url']);
	return { title: r.str('title'), site: r.str('site'), url: r.url('url') };
};

export function readArticles(json: unknown): Article[] {
	const articles = readList('articles.json', json, 'articles', readArticle);
	unique('articles.json', articles, 'url', (a) => a.url);
	return articles;
}

export const ARTICLES: readonly Article[] = readArticles(articlesJson);

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
