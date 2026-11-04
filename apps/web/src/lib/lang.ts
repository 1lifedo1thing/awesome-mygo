import { DEFAULT_LANG, LANG_STORAGE_KEY, type LangCode, type Translations, isLangCode, t } from '@awesome-mygo/catalog';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';

// Search params owned by the root route. `lang` is retained across navigation; `app` (the open detail drawer) is not, so moving to another page closes it. The site itself never writes ?lang=zh-CN (Simplified Chinese is the bare URL), but an explicit one is kept so it is not redirected away.
export interface RootSearch {
	lang?: LangCode;
	app?: string;
}

// Both keys are always returned, undefined when invalid: TanStack merges the validated object over the raw parsed search (router-core matchRoutes: `{ ...parentSearch, ...strictSearch }`), so a key left out kept its raw value (?lang=fr) and reached useLang and every head, which crashed the render with a 500. With the key overridden, the server's canonical-URL check redirects ?lang=fr, ?lang=EN or a repeated lang to the same URL without it. The query decoder turns all-digit values into numbers, so a slug such as ?app=2048 arrives as 2048.
export function validateRootSearch(search: Record<string, unknown>): RootSearch {
	const app = typeof search.app === 'number' ? String(search.app) : search.app;
	return {
		lang: isLangCode(search.lang) ? search.lang : undefined,
		app: typeof app === 'string' && /^[a-z0-9-]{1,64}$/.test(app) ? app : undefined,
	};
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
