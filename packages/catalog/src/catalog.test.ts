import { describe, expect, it } from 'vitest';
import { ABOUT } from './about';
import { AILOGO_CDN, APPS, DOCS, PLUGINS, STATE_SOLUTIONS, UI_LIBS, appBySlug, hostOf } from './catalog';
import { descMax, isBadUrl, isEntryComplete, readmeEntry, showcaseEntry } from './entry';
import { LANGS, fill, langRedirectScript, negotiateLang } from './lang';
import { buildSearchIndex, searchCatalog } from './search';
import { STRINGS } from './strings';
import { t } from './translate';

describe('catalog data', () => {
	it('has unique, URL-safe app slugs', () => {
		const slugs = APPS.map((a) => a.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
	});

	it('links only to https URLs', () => {
		for (const u of [...APPS.map((a) => a.url), ...UI_LIBS.map((l) => l.url), ...PLUGINS.map((p) => p.url), ...DOCS.map((d) => d.url), ...STATE_SOLUTIONS.map((s) => s.url)]) {
			expect(u.startsWith('https://')).toBe(true);
		}
	});

	it('translates every app, doc and string into every language', () => {
		for (const v of [...APPS.map((a) => a.desc), ...APPS.map((a) => a.about), ...STATE_SOLUTIONS.map((s) => s.desc), ...DOCS.map((d) => d.desc), ...Object.values(STRINGS)]) {
			expect(v).toHaveLength(LANGS.length);
			for (const s of v) expect(s.trim()).not.toBe('');
		}
	});

	it('has a long description for every app and none for unknown slugs', () => {
		expect(Object.keys(ABOUT).sort()).toEqual(APPS.map((a) => a.slug).sort());
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

	it('serves screenshots from /shots/', () => {
		for (const img of [...APPS.map((a) => a.image), ...UI_LIBS.map((l) => l.image), ...STATE_SOLUTIONS.map((s) => s.image)]) {
			if (img) expect(img).toMatch(/^\/shots\/[a-z0-9-]+\.(webp|svg)$/);
		}
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

describe('README entry', () => {
	const ph = { name: 'Name', desc: 'One-line description.' };

	it('renders placeholders for empty fields', () => {
		expect(readmeEntry({ name: '', url: '', desc: '' }, ph)).toBe('- [Name](https://…) - One-line description.');
	});

	it('trims the fields', () => {
		expect(readmeEntry({ name: ' kit ', url: ' https://x.dev ', desc: ' Does a thing ' }, ph)).toBe('- [kit](https://x.dev) - Does a thing');
	});

	it('flags non-https links only once something is typed', () => {
		expect(isBadUrl('')).toBe(false);
		expect(isBadUrl('http://x.dev')).toBe(true);
		expect(isBadUrl('https://x.dev')).toBe(false);
	});

	it('is complete only with every field and a valid link', () => {
		expect(isEntryComplete({ name: 'a', url: 'https://x', desc: 'd' })).toBe(true);
		expect(isEntryComplete({ name: 'a', url: 'http://x', desc: 'd' })).toBe(false);
		expect(isEntryComplete({ name: 'a', url: 'https://x', desc: ' ' })).toBe(false);
	});
});

describe('showcase entry', () => {
	it('matches the shape of showcase.ts and escapes quotes', () => {
		expect(showcaseEntry({ name: 'My "App"', url: 'https://x.dev', desc: 'Does a thing.' }, 'native', { name: 'Name', desc: 'Desc' })).toBe(
			['{', '  name: "My \\"App\\"",', '  description: "Does a thing.",', '  url: "https://x.dev",', '  mode: "native",', '},'].join('\n'),
		);
	});

	it('allows a longer description for apps', () => {
		expect(descMax('showcase')).toBeGreaterThan(descMax('ui'));
	});
});
