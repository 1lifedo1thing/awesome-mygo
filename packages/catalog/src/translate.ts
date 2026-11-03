import { type LangCode, langIndex } from './lang';
import { STRINGS, type StringKey } from './strings';

export type Translations = Record<StringKey, string>;

const cache = new Map<LangCode, Translations>();

// The whole UI dictionary resolved to one language.
export function t(lang: LangCode): Translations {
	let dict = cache.get(lang);
	if (!dict) {
		const i = langIndex(lang);
		dict = Object.fromEntries(Object.entries(STRINGS).map(([k, v]) => [k, v[i]])) as Translations;
		cache.set(lang, dict);
	}
	return dict;
}
