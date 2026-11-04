import type { BitmapName } from './bitmaps';

// Pixel icon for each official plugin; a plugin missing here (a new one) shows the page icon.
export const PLUGIN_ICON: Record<string, BitmapName> = {
	fetch: 'globe',
	websocket: 'arrows',
	sqlite: 'db',
	watch: 'eye',
	updater: 'update',
	terminal: 'term',
	glass: 'glass',
	game: 'pad',
	loading: 'hourglass',
	automation: 'cursor',
	permissionflow: 'lock',
};
