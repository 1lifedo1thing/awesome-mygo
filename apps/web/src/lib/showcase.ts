import { APPS, APP_GROUPS, type App, type AppGroup, type AppKind, HAS_SCORES, appGroup, byNewest, isAppGroup, likeKey, scoreRank } from '@awesome-mygo/catalog';
import type { LikesState } from './likes';
import { oneOf, text } from './page-search';

// The showcase's view in the address: ?cat= a group, ?ui= native or web, ?sort= natural, likes or score (newest first when absent), and in the retro look ?author= the author picked in its side panel. Every key is always returned, undefined when absent or invalid, for the same reason as validateRootSearch: TanStack merges the validated object over the raw search. An old link's ?sort=newest is dropped as invalid, which still shows newest first.
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
		sort: oneOf(search.sort, ['natural', 'likes', 'score'] as const),
		author: author !== undefined && AUTHORS.has(author) ? author : undefined,
	};
}

// The showcase's orders: by name in natural order (APPS' own order), newest first, most liked first, or highest score first.
export type AppSort = 'natural' | 'newest' | 'likes' | 'score';

// The order the showcase opens in, and falls back to when likes are off or there are no scores yet; the address leaves it out. Scores do not set the default order, so that newly listed apps are seen first and a high score does not feed itself.
export const DEFAULT_SORT = 'newest' satisfies AppSort;

// The order the showcase shows for the address's ?sort=: with likes off there is no most-liked order, and before the first scores no order by score, whatever the link says. Scores are part of the build, so the order by score needs no likes. Shared by both looks.
export function shownSort(sort: ShowcaseSearch['sort'], likes: LikesState['status']): AppSort {
	return (sort === 'likes' && likes === 'off') || (sort === 'score' && !HAS_SCORES) ? DEFAULT_SORT : (sort ?? DEFAULT_SORT);
}

// The apps in the chosen order; apps that tie (the same likes or score) keep their natural order, and apps without a score go after those with one. Shared by both looks.
export function sortApps(apps: readonly App[], sort: AppSort, likes: Readonly<Record<string, number>>): App[] {
	const list = [...apps];
	if (sort === 'newest') list.sort(byNewest);
	if (sort === 'likes') list.sort((a, b) => (likes[likeKey.app(b)] ?? 0) - (likes[likeKey.app(a)] ?? 0));
	if (sort === 'score') list.sort((a, b) => scoreRank(likeKey.app(b)) - scoreRank(likeKey.app(a)));
	return list;
}

// The groups that have apps, largest first; ties keep APP_GROUPS' order, and Other always comes last. `keep` (the chosen group) stays even when the interface filter leaves it empty, so the visitor sees which filter emptied the list. Shared by both looks.
export function groupChips(apps: readonly App[], keep?: AppGroup): { key: AppGroup; apps: App[] }[] {
	const chips = APP_GROUPS.map((key) => ({ key, apps: apps.filter((a) => appGroup(a) === key) })).filter((c) => c.apps.length > 0 || c.key === keep);
	return chips.sort((a, b) => Number(a.key === 'other') - Number(b.key === 'other') || b.apps.length - a.apps.length);
}
