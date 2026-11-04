import { DEFAULT_LANG, type LangCode, isLangCode, langIndex } from './lang';
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
