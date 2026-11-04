import { APPS, type App, PLUGINS, type Plugin, STATE_SOLUTIONS, type StateSolution, UI_LIBS, type UiLib } from './catalog';

// Every entry a visitor can like has a stable key: its kind and its id in the catalog. The server accepts only keys of entries listed here, so the likes table cannot fill with made-up ids.
export const likeKey = {
	app: (a: App) => `app:${a.slug}`,
	ui: (l: UiLib) => `ui:${l.repo}`,
	state: (s: StateSolution) => `state:${s.repo}`,
	plugin: (p: Plugin) => `plugin:${p.slug}`,
} as const;

export const LIKE_KEYS: ReadonlySet<string> = new Set([...APPS.map(likeKey.app), ...UI_LIBS.map(likeKey.ui), ...STATE_SOLUTIONS.map(likeKey.state), ...PLUGINS.map(likeKey.plugin)]);
