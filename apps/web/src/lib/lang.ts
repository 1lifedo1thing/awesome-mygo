import { DEFAULT_LANG, LANG_STORAGE_KEY, type LangCode, type Translations, isLangCode, t } from '@awesome-mygo/catalog';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';

// Search params owned by the root route. `lang` is retained across navigation; `app` (the open detail drawer) is not, so moving to another page closes it.
export interface RootSearch {
	lang?: Exclude<LangCode, typeof DEFAULT_LANG>;
	app?: string;
}

export function validateRootSearch(search: Record<string, unknown>): RootSearch {
	const out: RootSearch = {};
	if (isLangCode(search.lang) && search.lang !== DEFAULT_LANG) out.lang = search.lang;
	if (typeof search.app === 'string' && /^[a-z0-9-]{1,64}$/.test(search.app)) out.app = search.app;
	return out;
}

export function useLang(): LangCode {
	const search = useSearch({ strict: false }) as RootSearch;
	return search.lang ?? DEFAULT_LANG;
}

export function useT(): Translations {
	return t(useLang());
}

export function useSetLang(): (lang: LangCode) => void {
	const navigate = useNavigate();
	return useCallback(
		(lang: LangCode) => {
			try {
				localStorage.setItem(LANG_STORAGE_KEY, lang);
			} catch {
				// Storage can be unavailable (private mode); the URL still carries the choice.
			}
			void navigate({
				to: '.',
				search: (prev: RootSearch): RootSearch => ({ ...prev, lang: lang === DEFAULT_LANG ? undefined : lang }),
				replace: true,
				resetScroll: false,
			});
		},
		[navigate],
	);
}
