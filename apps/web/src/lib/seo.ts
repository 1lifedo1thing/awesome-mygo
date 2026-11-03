import { DEFAULT_LANG, type LangCode, type StringKey, t } from '@awesome-mygo/catalog';

export const SITE_NAME = 'MyGo Dock';

// Per-page <title> and description in the page's language. `title` omitted means the home page.
export function pageHead(lang: LangCode | undefined, title: StringKey | null, desc: StringKey) {
	const tr = t(lang ?? DEFAULT_LANG);
	const fullTitle = title ? `${tr[title]} · ${SITE_NAME}` : `${SITE_NAME} · MyGo ecosystem`;
	return {
		meta: [
			{ title: fullTitle },
			{ name: 'description', content: tr[desc] },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: SITE_NAME },
			{ property: 'og:title', content: fullTitle },
			{ property: 'og:description', content: tr[desc] },
			{ property: 'og:image', content: '/og-image-1200x630.png' },
			{ property: 'og:image:width', content: '1200' },
			{ property: 'og:image:height', content: '630' },
			{ property: 'og:image:alt', content: 'awesome-mygo' },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:image', content: '/og-image-1200x630.png' },
		],
	};
}
