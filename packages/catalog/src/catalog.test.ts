import { describe, expect, it } from 'vitest';
import apps from '../data/apps.json';
import articles from '../data/articles.json';
import docs from '../data/docs.json';
import plugins from '../data/plugins.json';
import appsSchema from '../data/schema/apps.schema.json';
import articlesSchema from '../data/schema/articles.schema.json';
import docsSchema from '../data/schema/docs.schema.json';
import pluginsSchema from '../data/schema/plugins.schema.json';
import stateSchema from '../data/schema/state.schema.json';
import uiSchema from '../data/schema/ui.schema.json';
import state from '../data/state.json';
import ui from '../data/ui.json';
import { AILOGO_CDN, APPS, ARTICLES, COMMUNITY_PLUGINS, DOCS, PLUGINS, STATE_SOLUTIONS, UI_LIBS, appBySlug, hostOf } from './catalog';
import { SUBMIT_CATS, SUBMIT_FILES, descMax, editUrl, isBadUrl, isEntryComplete, issueUrl, jsonEntry, slugify } from './entry';
import { LANGS, type Text, fill, langRedirectScript, negotiateLang, pick } from './lang';
import { buildSearchIndex, searchCatalog } from './search';
import { STRINGS } from './strings';
import { t } from './translate';
import { CatalogError, readList, unique } from './validate';

// The tests run on Node 24; this package has no Node type definitions, so the one function needed is declared here.
declare const process: { getBuiltinModule(id: 'node:fs'): { existsSync(path: URL): boolean } };
const { existsSync } = process.getBuiltinModule('node:fs');

const PUBLIC = new URL('../../../apps/web/public/', import.meta.url);
type Schema = { $id: string; properties: Record<string, { items: { required: string[]; properties: Record<string, unknown> } }> };
const SCHEMAS: Record<string, Schema> = { 'apps.json': appsSchema, 'ui.json': uiSchema, 'state.json': stateSchema, 'plugins.json': pluginsSchema, 'docs.json': docsSchema, 'articles.json': articlesSchema } as unknown as Record<string, Schema>;
const FILES: Record<string, { $schema: string }> = { 'apps.json': apps, 'ui.json': ui, 'state.json': state, 'plugins.json': plugins, 'docs.json': docs, 'articles.json': articles };
const texts = (): Text[] => [...APPS.flatMap((a) => [a.desc, a.about]), ...UI_LIBS.map((l) => l.desc), ...STATE_SOLUTIONS.map((s) => s.desc), ...PLUGINS.map((p) => p.desc), ...COMMUNITY_PLUGINS.map((p) => p.desc), ...DOCS.map((d) => d.desc)];

describe('catalog data', () => {
	it('loads every data file', () => {
		expect(APPS.length).toBeGreaterThan(0);
		expect(UI_LIBS.length).toBeGreaterThan(0);
		expect(PLUGINS.length).toBeGreaterThan(0);
		expect(DOCS.length).toBeGreaterThan(0);
		expect(ARTICLES.length).toBeGreaterThan(0);
	});

	it('links only to https URLs', () => {
		for (const u of [...APPS.map((a) => a.url), ...UI_LIBS.map((l) => l.url), ...PLUGINS.map((p) => p.url), ...DOCS.map((d) => d.url), ...STATE_SOLUTIONS.map((s) => s.url), ...ARTICLES.map((a) => a.url)]) {
			expect(u.startsWith('https://')).toBe(true);
		}
	});

	it('has English for every entry, and only site languages', () => {
		for (const text of texts()) {
			expect(text.en.trim()).not.toBe('');
			for (const lang of Object.keys(text)) expect(LANGS.map((l) => l.code)).toContain(lang);
		}
	});

	it('falls back to English for a missing language', () => {
		expect(pick({ en: 'Hello' }, 'ja')).toBe('Hello');
		expect(pick({ en: 'Hello', ja: 'こんにちは' }, 'ja')).toBe('こんにちは');
	});

	it('has the UI copy in every language', () => {
		for (const v of Object.values(STRINGS)) {
			expect(v).toHaveLength(LANGS.length);
			for (const s of v) expect(s.trim()).not.toBe('');
		}
	});

	it('takes icons from ai-logo, a local official icon for a few, and none for the apps on the mygo init default', () => {
		const slugs = (pred: (icon: string | undefined) => boolean) => APPS.filter((a) => pred(a.icon)).map((a) => a.slug).sort();
		expect(slugs((i) => i === undefined)).toEqual(['2048', 'uma']);
		expect(slugs((i) => i !== undefined && !i.startsWith(AILOGO_CDN))).toEqual(['repo-hopper', 'tomoru']);
		for (const a of APPS) {
			if (!a.icon) continue;
			expect(a.icon).toMatch(a.icon.startsWith(AILOGO_CDN) ? /^https:\/\/ailogo\.yldm\.ai\/avatar\/[a-z0-9]+\.webp$/ : new RegExp(`^/icons/${a.slug}\\.webp$`));
		}
	});

	it('has every screenshot and local icon it names in apps/web/public', () => {
		const files = [...APPS.flatMap((a) => [a.image, a.icon?.startsWith('/') ? a.icon : undefined]), ...UI_LIBS.map((l) => l.image), ...STATE_SOLUTIONS.map((s) => s.image)];
		for (const f of files) if (f) expect(existsSync(new URL(f.slice(1), PUBLIC)), f).toBe(true);
	});

	it('points every data file at its schema', () => {
		for (const [file, json] of Object.entries(FILES)) expect(json.$schema, file).toBe(`./schema/${SCHEMAS[file].$id}`);
	});

	it('resolves apps by slug', () => {
		expect(appBySlug('kero')?.name).toBe('Kero');
		expect(appBySlug('nope')).toBeUndefined();
	});

	it('strips the scheme and trailing slash for display', () => {
		expect(hostOf('https://kero.sh/')).toBe('kero.sh');
		expect(hostOf('https://github.com/egoist/gorex')).toBe('github.com/egoist/gorex');
	});
});

describe('validation of contributed entries', () => {
	const read = (entry: Record<string, unknown>) => () =>
		readList('apps.json', { apps: [entry] }, 'apps', (r) => {
			r.only(['name', 'url', 'kind', 'summary']);
			return [r.str('name'), r.url('url'), r.oneOf('kind', ['native', 'web']), r.text('summary')];
		});
	const ok = { name: 'Kit', url: 'https://x.dev', kind: 'native', summary: { en: 'A kit.' } };

	it('accepts a well-formed entry', () => {
		expect(read(ok)).not.toThrow();
	});

	it('names the file, entry and field of each mistake', () => {
		expect(read({ ...ok, summary: { 'zh-CN': '工具' } })).toThrow(/apps.json entry 1 \(Kit\): summary.en is required/);
		expect(read({ ...ok, summary: { en: 'A kit.', fr: 'Un kit.' } })).toThrow(/summary.fr is not a site language/);
		expect(read({ ...ok, url: 'http://x.dev' })).toThrow(/url must be an https link/);
		expect(read({ ...ok, kind: 'electron' })).toThrow(/kind must be one of native, web/);
		expect(read({ ...ok, descripton: 'typo' })).toThrow(/descripton is not a known field/);
		expect(read({ ...ok, name: ' ' })).toThrow(CatalogError);
	});

	it('rejects duplicates', () => {
		expect(() => unique('apps.json', [{ slug: 'a' }, { slug: 'a' }], 'slug', (x) => x.slug)).toThrow(/two entries have slug "a"/);
	});
});

describe('negotiateLang', () => {
	it('prefers a saved choice', () => {
		expect(negotiateLang('ja', 'en-US')).toBe('ja');
	});

	it('ignores an unknown saved value', () => {
		expect(negotiateLang('fr', 'ko-KR')).toBe('ko');
	});

	it('maps traditional Chinese locales to zh-TW', () => {
		expect(negotiateLang(null, 'zh-TW')).toBe('zh-TW');
		expect(negotiateLang(null, 'zh-HK')).toBe('zh-TW');
		expect(negotiateLang(null, 'zh-Hant-MO')).toBe('zh-TW');
		expect(negotiateLang(null, 'zh-CN')).toBe('zh-CN');
	});

	it('falls back to simplified Chinese', () => {
		expect(negotiateLang(null, 'de-DE')).toBe('zh-CN');
		expect(negotiateLang(null, undefined)).toBe('zh-CN');
	});
});

describe('langRedirectScript', () => {
	// Runs the inline script against a fake page and returns where it redirected, or null.
	const run = (href: string, saved: string | null, browser: string) => {
		let to: string | null = null;
		const location = { href, replace: (u: string) => (to = u) };
		const localStorage = { getItem: () => saved };
		new Function('location', 'localStorage', 'navigator', langRedirectScript())(location, localStorage, { language: browser });
		return to;
	};
	const cases: [string | null, string][] = [
		[null, 'en-US'],
		[null, 'zh-TW'],
		[null, 'zh-HK'],
		[null, 'zh-Hant-MO'],
		[null, 'zh-CN'],
		[null, 'ja-JP'],
		[null, 'ko-KR'],
		[null, 'de-DE'],
		['ja', 'en-US'],
		['fr', 'ko-KR'],
		['zh-CN', 'en-US'],
	];

	it('picks the same language as negotiateLang', () => {
		for (const [saved, browser] of cases) {
			const want = negotiateLang(saved, browser);
			const to = run('https://mygodock.dev/showcase?app=kero', saved, browser);
			expect(to ? new URL(to).searchParams.get('lang') : 'zh-CN').toBe(want);
		}
	});

	it('keeps the path and other parameters', () => {
		expect(run('https://mygodock.dev/showcase?app=kero', null, 'en-US')).toBe('https://mygodock.dev/showcase?app=kero&lang=en');
	});

	it('leaves a page that already names a language', () => {
		expect(run('https://mygodock.dev/?lang=ja', null, 'en-US')).toBeNull();
	});

	it('treats ?lang= of the default language as unset, like the router does', () => {
		expect(run('https://mygodock.dev/?lang=zh-CN', null, 'en-US')).toBe('https://mygodock.dev/?lang=en');
	});
});

describe('fill', () => {
	it('replaces both placeholders', () => {
		expect(fill(t('en').live_badge, { n: 17 })).toBe('17 community apps listed');
		expect(fill(t('en').more_by, { x: 'egoist' })).toBe('More by egoist');
	});
});

describe('search', () => {
	const index = buildSearchIndex('en');

	it('returns nothing for a blank query', () => {
		expect(searchCatalog(index, '   ')).toEqual([]);
	});

	it('matches case-insensitively', () => {
		expect(searchCatalog(index, 'KERO').map((r) => r.name)).toEqual(['Kero']);
	});

	it('matches app descriptions in any language', () => {
		const names = searchCatalog(index, '音乐').map((r) => r.name);
		expect(names).toContain('MixMusic');
		expect(names).toContain('MyGo 云音乐');
	});

	it('finds state solutions', () => {
		expect(searchCatalog(index, 'zustand').map((r) => r.name)).toEqual(['Nodra']);
	});

	it('finds plugins by tag and the cli by command', () => {
		expect(searchCatalog(index, 'no-cors').map((r) => r.name)).toEqual(['Fetch']);
		expect(searchCatalog(index, 'doctor')[0]?.target).toEqual({ type: 'page', path: '/plugins' });
	});
});

describe('submission entry', () => {
	const ph = { name: 'Name', desc: 'One-line description.' };
	const draft = { name: 'My "Kit"', author: 'someone', url: 'https://github.com/someone/my-kit', desc: 'Widgets for MyGo.' };

	it('writes, for every category, an entry with the fields its schema requires and no others', () => {
		for (const cat of SUBMIT_CATS) {
			const { file, list } = SUBMIT_FILES[cat];
			const item = SCHEMAS[file].properties[list].items;
			const entry = JSON.parse(jsonEntry(cat, draft, 'native', ph));
			for (const field of item.required) expect(entry, `${cat} ${field}`).toHaveProperty(field);
			for (const field of Object.keys(entry)) expect(Object.keys(item.properties), `${cat} ${field}`).toContain(field);
		}
	});

	it('derives the slug and the GitHub repo, and escapes quotes', () => {
		const app = JSON.parse(jsonEntry('showcase', draft, 'web', ph));
		expect(app).toMatchObject({ slug: 'my-kit', name: 'My "Kit"', kind: 'web', summary: { en: 'Widgets for MyGo.' } });
		expect(JSON.parse(jsonEntry('ui', draft, 'native', ph)).repo).toBe('someone/my-kit');
		expect(slugify('留白 Liubai')).toBe('liubai');
	});

	it('opens a prefilled issue, or the data file in GitHub\'s editor', () => {
		const entry = jsonEntry('ui', draft, 'native', ph);
		const u = new URL(issueUrl('https://github.com/yldm-tech/awesome-mygo', 'ui', 'UI', draft, entry, ph));
		expect(u.origin + u.pathname).toBe('https://github.com/yldm-tech/awesome-mygo/issues/new');
		expect(u.searchParams.get('title')).toBe('Add My "Kit" (UI)');
		expect(u.searchParams.get('body')).toBe(`UI: \`packages/catalog/data/ui.json\`\n\n\`\`\`json\n${entry}\n\`\`\`\n`);
		expect(editUrl('https://github.com/yldm-tech/awesome-mygo', 'showcase')).toBe('https://github.com/yldm-tech/awesome-mygo/edit/main/packages/catalog/data/apps.json');
	});

	it('flags non-https links only once something is typed', () => {
		expect(isBadUrl('')).toBe(false);
		expect(isBadUrl('http://x.dev')).toBe(true);
		expect(isBadUrl('https://x.dev')).toBe(false);
	});

	it('is complete only with every field it needs and a valid link', () => {
		expect(isEntryComplete('ui', draft)).toBe(true);
		expect(isEntryComplete('ui', { ...draft, author: '' })).toBe(false);
		expect(isEntryComplete('ui', { ...draft, url: 'http://x' })).toBe(false);
		expect(isEntryComplete('ui', { ...draft, desc: ' ' })).toBe(false);
		expect(isEntryComplete('article', { name: 'Post', author: '', url: 'https://x.dev/post', desc: '' })).toBe(true);
	});

	it('allows a longer description for apps', () => {
		expect(descMax('showcase')).toBeGreaterThan(descMax('ui'));
	});
});
