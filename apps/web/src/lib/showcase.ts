import { APP_GROUPS, type App, type AppGroup, type AppKind, appGroup, isAppGroup } from '@awesome-mygo/catalog';

// The showcase's filters in the address: ?cat= a group, ?ui= native or web. Both keys are always returned, undefined when absent or invalid, for the same reason as validateRootSearch: TanStack merges the validated object over the raw search.
export interface ShowcaseSearch {
	cat?: AppGroup;
	ui?: AppKind;
}

export function validateShowcaseSearch(search: Record<string, unknown>): ShowcaseSearch {
	return { cat: isAppGroup(search.cat) ? search.cat : undefined, ui: search.ui === 'native' || search.ui === 'web' ? search.ui : undefined };
}

// The groups that have apps, largest first; ties keep APP_GROUPS' order, and Other always comes last. `keep` (the chosen group) stays even when the interface filter leaves it empty, so the visitor sees which filter emptied the list. Shared by both looks.
export function groupChips(apps: readonly App[], keep?: AppGroup): { key: AppGroup; apps: App[] }[] {
	const chips = APP_GROUPS.map((key) => ({ key, apps: apps.filter((a) => appGroup(a) === key) })).filter((c) => c.apps.length > 0 || c.key === keep);
	return chips.sort((a, b) => Number(a.key === 'other') - Number(b.key === 'other') || b.apps.length - a.apps.length);
}
