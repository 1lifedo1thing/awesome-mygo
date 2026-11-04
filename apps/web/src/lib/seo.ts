import { APPS, DEFAULT_LANG, LANGS, type LangCode, SITE_URL, type StringKey, appBySlug, pick, t } from '@awesome-mygo/catalog';
import type { JSX } from 'react';

export const SITE_NAME = 'MyGo Dock';
const OG_IMAGE = `${SITE_URL}/og-image-1200x630.png`;
const OG_LOCALE: Record<LangCode, string> = { 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', en: 'en_US', ja: 'ja_JP', ko: 'ko_KR' };

export type SitePath = '/' | '/ui' | '/state' | '/plugins' | '/showcase' | '/learn';
export const SITE_PATHS: readonly SitePath[] = ['/', '/ui', '/state', '/plugins', '/showcase', '/learn'];

// Simplified Chinese lives at the bare path, other languages at ?lang=…; an open app adds ?app=…. Any other query (utm tags…) is left out of canonical URLs.
export function pageUrl(path: SitePath, lang: LangCode, app?: string): string {
	const q = new URLSearchParams();
	if (lang !== DEFAULT_LANG) q.set('lang', lang);
	if (app) q.set('app', app);
	const qs = q.toString();
	return `${SITE_URL}${path}${qs ? `?${qs}` : ''}`;
}

// TanStack renders { 'script:ld+json': data } as an escaped <script type="application/ld+json">; its meta type only lists <meta> props, hence the cast.
const ldJson = (data: Record<string, unknown>) => ({ 'script:ld+json': { '@context': 'https://schema.org', ...data } }) as unknown as JSX.IntrinsicElements['meta'];

interface PageSeo {
	lang: LangCode | undefined;
	path: SitePath;
	// null for the home page.
	title: StringKey | null;
	desc: StringKey;
	// Slug from ?app=; a known app turns the page's preview into that app's card.
	app?: string;
}

export function pageHead(p: PageSeo) {
	const lang = p.lang ?? DEFAULT_LANG;
	const tr = t(lang);
	const app = p.app ? appBySlug(p.app) : undefined;
	const title = app ? `${app.name} · ${SITE_NAME}` : p.title ? `${tr[p.title]} · ${SITE_NAME}` : `${SITE_NAME} · MyGo ecosystem`;
	const desc = app ? pick(app.about, lang) : tr[p.desc];
	const url = pageUrl(p.path, lang, app?.slug);
	const image = app?.image && !app.image.endsWith('.svg') ? `${SITE_URL}${app.image}` : OG_IMAGE;

	const jsonLd: Record<string, unknown>[] = [];
	if (p.path === '/' && !app) jsonLd.push({ '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, inLanguage: lang, description: desc });
	if (p.path === '/showcase' && !app) {
		jsonLd.push({
			'@type': 'ItemList',
			name: title,
			itemListElement: APPS.map((a, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				item: { '@type': 'SoftwareApplication', name: a.name, url: a.url, description: pick(a.desc, lang), operatingSystem: 'macOS, Windows, Linux', applicationCategory: 'DesktopApplication', author: { '@type': 'Person', name: a.author } },
			})),
		});
	}
	if (app) {
		jsonLd.push({ '@type': 'SoftwareApplication', name: app.name, url: app.url, description: desc, applicationCategory: 'DesktopApplication', author: { '@type': 'Person', name: app.author }, ...(app.image ? { screenshot: `${SITE_URL}${app.image}` } : {}) });
	}

	return {
		meta: [
			{ title },
			{ name: 'description', content: desc },
			{ name: 'robots', content: 'index, follow, max-image-preview:large' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: SITE_NAME },
			{ property: 'og:title', content: title },
			{ property: 'og:description', content: desc },
			{ property: 'og:url', content: url },
			{ property: 'og:locale', content: OG_LOCALE[lang] },
			{ property: 'og:image', content: image },
			...(image === OG_IMAGE ? [{ property: 'og:image:width', content: '1200' }, { property: 'og:image:height', content: '630' }] : []),
			{ property: 'og:image:alt', content: app ? app.name : SITE_NAME },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: title },
			{ name: 'twitter:description', content: desc },
			{ name: 'twitter:image', content: image },
			...jsonLd.map(ldJson),
		],
		links: [
			{ rel: 'canonical', href: url },
			...LANGS.map((l) => ({ rel: 'alternate', hrefLang: l.code, href: pageUrl(p.path, l.code, app?.slug) })),
			{ rel: 'alternate', hrefLang: 'x-default', href: pageUrl(p.path, DEFAULT_LANG, app?.slug) },
		],
	};
}
