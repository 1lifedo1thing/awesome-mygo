import type { App } from './catalog';
import { DEFAULT_LANG, type LangCode, fill, isLangCode, langIndex, pick } from './lang';
import { STRINGS, type StringKey } from './strings';

export type Translations = Record<StringKey, string>;

const cache = new Map<LangCode, Translations>();

// The whole UI dictionary resolved to one language. Anything that is not a site language (a raw ?lang= value that slipped through) gets the default language, so the cache only ever holds the five real dictionaries.
export function t(lang: LangCode): Translations {
	const code = isLangCode(lang) ? lang : DEFAULT_LANG;
	let dict = cache.get(code);
	if (!dict) {
		const i = langIndex(code);
		dict = Object.fromEntries(Object.entries(STRINGS).map(([k, v]) => [k, v[i]])) as Translations;
		cache.set(code, dict);
	}
	return dict;
}

// The meta description of an app's own page: its one-line summary, then who made it and with what, as many summaries alone are too short for a search snippet and name neither Go nor MyGo. A summary ending in a full-width stop needs no space before the next sentence; one in English (also the fallback for a missing language) does.
export function appDescription(app: App, lang: LangCode): string {
	const summary = pick(app.desc, lang);
	return `${summary}${summary.endsWith('。') ? '' : ' '}${fill(t(lang).app_desc_tail, { x: app.author })}`;
}
