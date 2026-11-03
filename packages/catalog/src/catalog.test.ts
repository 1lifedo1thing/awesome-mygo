import { describe, expect, it } from 'vitest';
import { APPS, DOCS, PLUGINS, UI_LIBS, appBySlug, hostOf } from './catalog';
import { isBadUrl, isEntryComplete, readmeEntry } from './entry';
import { LANGS, fill, negotiateLang } from './lang';
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
		for (const u of [...APPS.map((a) => a.url), ...UI_LIBS.map((l) => l.url), ...PLUGINS.map((p) => p.url), ...DOCS.map((d) => d.url)]) {
			expect(u.startsWith('https://')).toBe(true);
		}
	});

	it('translates every app, doc and string into every language', () => {
		for (const v of [...APPS.map((a) => a.desc), ...DOCS.map((d) => d.desc), ...Object.values(STRINGS)]) {
			expect(v).toHaveLength(LANGS.length);
			for (const s of v) expect(s.trim()).not.toBe('');
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
