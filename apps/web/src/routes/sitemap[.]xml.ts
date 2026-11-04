import { APPS, DEFAULT_LANG, LANGS } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { SITE_PATHS, type SitePath, pageUrl } from '../lib/seo';

const esc = (s: string) => s.replace(/&/g, '&amp;');

// One <url> per page and language, each listing its language alternates, so search engines pair the translations. Every element sits on its own indented line so the file stays readable when opened directly.
function entry(path: SitePath, app?: string): string {
	const alternates = [...LANGS.map((l) => `\t\t<xhtml:link rel="alternate" hreflang="${l.code}" href="${esc(pageUrl(path, l.code, app))}"/>`), `\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${esc(pageUrl(path, DEFAULT_LANG, app))}"/>`].join('\n');
	return LANGS.map((l) => `\t<url>\n\t\t<loc>${esc(pageUrl(path, l.code, app))}</loc>\n${alternates}\n\t</url>`).join('\n');
}

export function sitemapXml(): string {
	const urls = [...SITE_PATHS.map((p) => entry(p)), ...APPS.map((a) => entry('/showcase', a.slug))];
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export const Route = createFileRoute('/sitemap.xml')({
	server: {
		handlers: {
			GET: () => new Response(sitemapXml(), { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
		},
	},
});
