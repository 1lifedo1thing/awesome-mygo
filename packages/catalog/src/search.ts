import { APPS, ARTICLE, PLUGINS, STATE_SOLUTIONS, UI_LIBS } from './catalog';
import { type LangCode, pick } from './lang';
import { t } from './translate';

export type SearchCat = 'ui' | 'state' | 'plugin' | 'showcase' | 'article';

export type SearchTarget = { type: 'url'; url: string } | { type: 'page'; path: '/plugins' } | { type: 'app'; slug: string };

export interface SearchItem {
	cat: SearchCat;
	name: string;
	desc: string;
	target: SearchTarget;
	// Lowercased text the query is matched against.
	hay: string;
}

export function buildSearchIndex(lang: LangCode): SearchItem[] {
	const tr = t(lang);
	const items: SearchItem[] = [];
	for (const l of UI_LIBS) {
		const desc = tr[l.descKey];
		items.push({ cat: 'ui', name: l.name, desc, target: { type: 'url', url: l.url }, hay: [l.name, l.author, desc, tr[l.tagKey]].join(' ') });
	}
	for (const st of STATE_SOLUTIONS) {
		items.push({ cat: 'state', name: st.name, desc: pick(st.desc, lang), target: { type: 'url', url: st.homepage ?? st.url }, hay: [st.name, st.author, ...st.desc, ...st.tags].join(' ') });
	}
	for (const p of PLUGINS) {
		const desc = tr[p.descKey];
		items.push({ cat: 'plugin', name: p.name, desc, target: { type: 'url', url: p.url }, hay: [p.name, desc, ...p.tags].join(' ') });
	}
	items.push({ cat: 'plugin', name: 'mygo-cli', desc: tr.tool_p, target: { type: 'page', path: '/plugins' }, hay: `mygo-cli cli doctor ${tr.tool_p}` });
	for (const a of APPS) {
		// Descriptions in every language, so a query in any language finds the app.
		items.push({ cat: 'showcase', name: a.name, desc: pick(a.desc, lang), target: { type: 'app', slug: a.slug }, hay: [a.name, a.author, ...a.desc, ...a.about, a.kind].join(' ') });
	}
	items.push({ cat: 'article', name: ARTICLE.title, desc: ARTICLE.site, target: { type: 'url', url: ARTICLE.url }, hay: `${ARTICLE.title} azukiazusa ${tr.article}` });
	for (const item of items) item.hay = item.hay.toLowerCase();
	return items;
}

export function searchCatalog(index: readonly SearchItem[], query: string): SearchItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return index.filter((item) => item.hay.includes(q));
}
