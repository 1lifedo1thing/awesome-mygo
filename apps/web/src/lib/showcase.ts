import { APPS, APP_GROUPS, type App, type AppGroup, type AppKind, appGroup, byNewest, isAppGroup, likeKey } from '@awesome-mygo/catalog';
import { oneOf, text } from './page-search';

// The showcase's view in the address: ?cat= a group, ?ui= native or web, ?sort= natural or likes (newest first when absent), and in the retro look ?author= the author picked in its side panel. Every key is always returned, undefined when absent or invalid, for the same reason as validateRootSearch: TanStack merges the validated object over the raw search. An old link's ?sort=newest is dropped as invalid, which still shows newest first.
export interface ShowcaseSearch {
	cat?: AppGroup;
	ui?: AppKind;
	sort?: Exclude<AppSort, typeof DEFAULT_SORT>;
	author?: string;
}

const AUTHORS = new Set(APPS.map((a) => a.author));

export function validateShowcaseSearch(search: Record<string, unknown>): ShowcaseSearch {
	const author = text(search.author);
	return {
		cat: isAppGroup(search.cat) ? search.cat : undefined,
		ui: search.ui === 'native' || search.ui === 'web' ? search.ui : undefined,
		sort: oneOf(search.sort, ['natural', 'likes'] as const),
		author: author !== undefined && AUTHORS.has(author) ? author : undefined,
	};
}

// The showcase's orders: by name in natural order (APPS' own order), newest first, or most liked first.
export type AppSort = 'natural' | 'newest' | 'likes';

// The order the showcase opens in, and falls back to when likes are off; the address leaves it out.
export const DEFAULT_SORT = 'newest' satisfies AppSort;

// The apps in the chosen order; apps that tie (the same likes) keep their natural order. Shared by both looks.
export function sortApps(apps: readonly App[], sort: AppSort, likes: Readonly<Record<string, number>>): App[] {
	const list = [...apps];
	if (sort === 'newest') list.sort(byNewest);
	if (sort === 'likes') list.sort((a, b) => (likes[likeKey.app(b)] ?? 0) - (likes[likeKey.app(a)] ?? 0));
	return list;
}

// The groups that have apps, largest first; ties keep APP_GROUPS' order, and Other always comes last. `keep` (the chosen group) stays even when the interface filter leaves it empty, so the visitor sees which filter emptied the list. Shared by both looks.
export function groupChips(apps: readonly App[], keep?: AppGroup): { key: AppGroup; apps: App[] }[] {
	const chips = APP_GROUPS.map((key) => ({ key, apps: apps.filter((a) => appGroup(a) === key) })).filter((c) => c.apps.length > 0 || c.key === keep);
	return chips.sort((a, b) => Number(a.key === 'other') - Number(b.key === 'other') || b.apps.length - a.apps.length);
}
