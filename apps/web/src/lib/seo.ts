import { type App, APPS, DEFAULT_LANG, LANGS, type LangCode, SITE_REPO, SITE_URL, type StringKey, authorProfile, pick, t } from '@awesome-mygo/catalog';
import type { MetaDescriptor } from '@tanstack/react-router';
import type { JSX } from 'react';

export const SITE_NAME = 'MyGo Dock';
const OG_IMAGE = `${SITE_URL}/og-image-1200x630.png`;
const OG_LOCALE: Record<LangCode, string> = { 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', en: 'en_US', ja: 'ja_JP', ko: 'ko_KR' };
// Node ids shared by every page's JSON-LD: the site, and the publisher it belongs to.
const WEBSITE_ID = `${SITE_URL}/#website`;
const ORG_ID = `${SITE_URL}/#organization`;

export type SitePath = '/' | '/ui' | '/state' | '/plugins' | '/showcase' | '/learn';
export const SITE_PATHS: readonly SitePath[] = ['/', '/ui', '/state', '/plugins', '/showcase', '/learn'];

// An app's own page.
export type AppPath = `/apps/${string}`;
export const appPath = (slug: string): AppPath => `/apps/${slug}`;

// Simplified Chinese lives at the bare path, other languages at ?lang=…. Any other query (?app= for the drawer, utm tags…) is left out of canonical URLs: an app's canonical page is its /apps/<slug> page.
export function pageUrl(path: SitePath | AppPath, lang: LangCode): string {
	return `${SITE_URL}${path}${lang !== DEFAULT_LANG ? `?lang=${lang}` : ''}`;
}

// The og:locale values of the page's other languages. TanStack keeps one meta per property, so these repeated tags are rendered by the root document rather than through a route head.
export const ogLocaleAlternates = (lang: LangCode): string[] => LANGS.filter((l) => l.code !== lang).map((l) => OG_LOCALE[l.code]);

// TanStack renders { 'script:ld+json': data } as an escaped <script type="application/ld+json">. The payload is typed with router-core's MetaDescriptor, which lists that form, but react-router types a route head's meta as plain <meta> props (RouteMatchExtensions in Matches.tsx), hence the cast.
type LdJson = Extract<MetaDescriptor, { 'script:ld+json': unknown }>['script:ld+json'];
const ldJson = (data: LdJson) => ({ 'script:ld+json': { '@context': 'https://schema.org', ...data } }) as unknown as JSX.IntrinsicElements['meta'];

const breadcrumbs = (crumbs: { name: string; item: string }[]): LdJson => ({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) });

// A screenshot as a share image; SVG is left out, as share cards and image search do not take it.
export const rasterShot = (app: App): string | undefined => (app.image && !app.image.endsWith('.svg') ? `${SITE_URL}${app.image}` : undefined);

interface PageSeo {
	lang: LangCode | undefined;
	path: SitePath;
	// The topic of the <title>, which is followed by the site name; null for the home page, whose whole title is title_home.
	title: StringKey | null;
	desc: StringKey;
	// The page's visible heading, which names it in the breadcrumb trail.
	name: StringKey;
}

export function pageHead(p: PageSeo) {
	const lang = p.lang ?? DEFAULT_LANG;
	const tr = t(lang);
	const url = pageUrl(p.path, lang);
	const title = p.title ? `${tr[p.title]} · ${SITE_NAME}` : tr.title_home;
	const desc = tr[p.desc];

	const jsonLd: LdJson[] = [];
	if (p.path === '/') {
		jsonLd.push(
			{ '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: lang, description: desc, publisher: { '@id': ORG_ID } },
			{ '@type': 'Organization', '@id': ORG_ID, name: SITE_NAME, url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 }, sameAs: [SITE_REPO] },
		);
	} else {
		// Every section page is a curated collection one level under home.
		const collection: LdJson = { '@type': 'CollectionPage', url, name: title, description: desc, inLanguage: lang, isPartOf: { '@id': WEBSITE_ID } };
		// The showcase's list only points at each app's own page, which carries the app's full SoftwareApplication data.
		if (p.path === '/showcase') collection.mainEntity = { '@type': 'ItemList', itemListElement: APPS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: pageUrl(appPath(a.slug), lang) })) };
		jsonLd.push(
			collection,
			breadcrumbs([
				{ name: tr.nav_home, item: pageUrl('/', lang) },
				{ name: tr[p.name], item: url },
			]),
		);
	}

	return headTags({ lang, path: p.path, title, desc, imageAlt: tr.og_alt, jsonLd });
}

// The head of an app's own page. The title stays short: the name and a localized descriptor, as names such as Pulse or Kero say little alone. The description is the app's one-line summary.
export function appHead(app: App, langParam: LangCode | undefined) {
	const lang = langParam ?? DEFAULT_LANG;
	const tr = t(lang);
	const path = appPath(app.slug);
	const url = pageUrl(path, lang);
	const title = `${app.name} — ${tr.app_kind} · ${SITE_NAME}`;
	const desc = pick(app.desc, lang);
	const shot = rasterShot(app);
	const profile = authorProfile(app.author);

	const software = {
		'@type': 'SoftwareApplication',
		name: app.name,
		url,
		sameAs: app.url,
		description: desc,
		...(app.category ? { applicationCategory: app.category } : {}),
		author: { '@type': 'Person', name: app.author, ...(profile ? { url: profile } : {}) },
		...(shot ? { screenshot: shot } : {}),
	};
	const jsonLd = [
		{ '@type': 'ItemPage', url, name: title, inLanguage: lang, isPartOf: { '@id': WEBSITE_ID }, mainEntity: software },
		breadcrumbs([
			{ name: tr.nav_home, item: pageUrl('/', lang) },
			{ name: tr.cat_show_name, item: pageUrl('/showcase', lang) },
			{ name: app.name, item: url },
		]),
	];

	return headTags({ lang, path, title, desc, image: shot, imageAlt: shot ? `${app.name} ${tr.app_shot}` : tr.og_alt, jsonLd });
}

interface HeadTags {
	lang: LangCode;
	path: SitePath | AppPath;
	title: string;
	desc: string;
	// Absolute URL; the site's share image when undefined.
	image?: string;
	// Localized, for og:image:alt and twitter:image:alt.
	imageAlt: string;
	jsonLd: LdJson[];
}

function headTags(h: HeadTags) {
	const url = pageUrl(h.path, h.lang);
	const image = h.image ?? OG_IMAGE;
	return {
		meta: [
			{ title: h.title },
			{ name: 'description', content: h.desc },
			{ name: 'robots', content: 'index, follow, max-image-preview:large' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: SITE_NAME },
			{ property: 'og:title', content: h.title },
			{ property: 'og:description', content: h.desc },
			{ property: 'og:url', content: url },
			{ property: 'og:locale', content: OG_LOCALE[h.lang] },
			{ property: 'og:image', content: image },
			...(image === OG_IMAGE ? [{ property: 'og:image:type', content: 'image/png' }, { property: 'og:image:width', content: '1200' }, { property: 'og:image:height', content: '630' }] : []),
			{ property: 'og:image:alt', content: h.imageAlt },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: h.title },
			{ name: 'twitter:description', content: h.desc },
			{ name: 'twitter:image', content: image },
			{ name: 'twitter:image:alt', content: h.imageAlt },
			...h.jsonLd.map(ldJson),
		],
		links: [
			{ rel: 'canonical', href: url },
			...LANGS.map((l) => ({ rel: 'alternate', hrefLang: l.code, href: pageUrl(h.path, l.code) })),
			{ rel: 'alternate', hrefLang: 'x-default', href: pageUrl(h.path, DEFAULT_LANG) },
		],
	};
}
