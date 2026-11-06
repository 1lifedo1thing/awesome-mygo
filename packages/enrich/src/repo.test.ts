import { describe, expect, it } from 'vitest';
import { type RepoFacts, iconSource } from './repo.ts';

const facts = (paths: string[], json?: unknown): RepoFacts => ({
	repo: 'owner/app',
	branch: 'main',
	paths,
	...(json === undefined ? {} : { mygo: { path: 'desktop/mygo.json', text: '', json } }),
});

describe('repository icon source', () => {
	it('prefers the icon named by MyGo', () => {
		expect(iconSource(facts(['desktop/assets/icon.png', 'assets/icon.png'], { icon: 'assets/icon.png' }))).toEqual({
			path: 'desktop/assets/icon.png',
			url: 'https://raw.githubusercontent.com/owner/app/main/desktop/assets/icon.png',
			guessed: false,
		});
	});

	it('falls back to a repository icon when the MyGo configuration has none or only a macOS bundle', () => {
		const fallback = {
			path: 'assets/icon.png',
			url: 'https://raw.githubusercontent.com/owner/app/main/assets/icon.png',
			guessed: true,
		};
		expect(iconSource(facts(['assets/icon.png'], {}))).toEqual(fallback);
		expect(iconSource(facts(['assets/icon.png'], { macos: { icon: 'AppIcon.icon' } }))).toEqual(fallback);
	});

	it('reports an unconvertible macOS icon when there is no bitmap fallback', () => {
		expect(iconSource(facts([], { macos: { icon: 'AppIcon.icon' } }))).toEqual({ why: "the app's only icon is `desktop/AppIcon.icon` (macos.icon), which cannot be converted here" });
	});
});
