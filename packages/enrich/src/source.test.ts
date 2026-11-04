import { describe, expect, it } from 'vitest';
import { addedEntries, appNameFrom, hasAllLanguages, iconPathOf, joinRepoPath, pickMygoJson, readmeImages, repoOfEntry, resolveImage, setShowcaseCount, sniffImage } from './source.ts';

describe('app names', () => {
	it('takes mygo.json’s spelling of the same name only', () => {
		expect(appNameFrom('myskills', { name: 'MySkills' })).toBe('MySkills');
		expect(appNameFrom('MySkills', { name: 'MySkills' })).toBeUndefined();
		expect(appNameFrom('Skill Shelf', { name: 'MySkills' })).toBeUndefined();
		expect(appNameFrom('myskills', {})).toBeUndefined();
	});

	it('keeps copy already in every site language', () => {
		expect(hasAllLanguages({ en: 'a', 'zh-CN': 'b', 'zh-TW': 'c', ja: 'd', ko: 'e' })).toBe(true);
		expect(hasAllLanguages({ en: 'a', 'zh-CN': 'b', 'zh-TW': 'c', ja: 'd', ko: ' ' })).toBe(false);
		expect(hasAllLanguages({ en: '本地 agent skills 库管理工具' })).toBe(false);
		expect(hasAllLanguages(undefined)).toBe(false);
	});
});

describe('submitted entries', () => {
	it('finds the entries a branch adds, by content', () => {
		const base = [{ slug: 'a' }, { slug: 'b' }];
		expect(addedEntries(base, [...base, { slug: 'c' }])).toEqual([2]);
		expect(addedEntries(base, [{ slug: 'b' }, { slug: 'a' }])).toEqual([]);
		expect(addedEntries([], [{ slug: 'a' }])).toEqual([0]);
	});

	it('takes the repository from repo, or from a GitHub link', () => {
		expect(repoOfEntry({ repo: 'you/app', url: 'https://app.dev' })).toBe('you/app');
		expect(repoOfEntry({ url: 'https://github.com/legibet/myskills' })).toBe('legibet/myskills');
		expect(repoOfEntry({ url: 'https://github.com/you/app.git' })).toBe('you/app');
		expect(repoOfEntry({ url: 'https://github.com/you/app/tree/main/app' })).toBe('you/app');
		expect(repoOfEntry({ docs: 'https://github.com/you/plugin#readme' })).toBe('you/plugin');
		expect(repoOfEntry({ url: 'https://app.dev' })).toBeUndefined();
	});
});

describe('the repository', () => {
	it('picks the app’s own mygo.json, not a vendored example', () => {
		expect(pickMygoJson(['README.md', 'app/mygo.json', 'go.mod'])).toBe('app/mygo.json');
		expect(pickMygoJson(['examples/demo/mygo.json', 'mygo.json'])).toBe('mygo.json');
		expect(pickMygoJson(['node_modules/x/mygo.json', 'examples/a/mygo.json'])).toBeUndefined();
		expect(pickMygoJson(['b/mygo.json', 'a/mygo.json'])).toBe('a/mygo.json');
	});

	it('resolves paths inside the repository only', () => {
		expect(joinRepoPath('app/mygo.json', 'icon/icon.png')).toBe('app/icon/icon.png');
		expect(joinRepoPath('app/mygo.json', './../assets/icon.png')).toBe('assets/icon.png');
		expect(joinRepoPath('mygo.json', '../../etc/passwd')).toBeUndefined();
	});

	it('reads the icon from mygo.json, and none when mygo init left it out', () => {
		expect(iconPathOf('app/mygo.json', { name: 'MySkills', icon: 'icon/icon.png' })).toBe('app/icon/icon.png');
		expect(iconPathOf('mygo.json', { name: '2048', identifier: 'com.example.2048' })).toBeUndefined();
		expect(iconPathOf('mygo.json', { icon: 'AppIcon.icns' })).toBeUndefined();
		expect(iconPathOf('mygo.json', null)).toBeUndefined();
	});
});

describe('README images', () => {
	it('lists Markdown and HTML images in order', () => {
		const md = '[![CI](https://github.com/a/b/actions/workflows/ci.yml/badge.svg)](x)\n<img src="docs/logo.png" width="64">\n\n![The app](docs/screenshot.png "Main window")\n![](<docs/two words.png>)';
		expect(readmeImages(md)).toEqual(['https://github.com/a/b/actions/workflows/ci.yml/badge.svg', 'docs/logo.png', 'docs/screenshot.png', 'docs/two words.png']);
	});

	it('downloads repository images raw, and skips badges and SVGs', () => {
		expect(resolveImage('docs/screenshot.png', 'legibet/myskills', 'main', 'README.md')).toBe('https://raw.githubusercontent.com/legibet/myskills/main/docs/screenshot.png');
		expect(resolveImage('../shot.png', 'a/b', 'dev', 'docs/README.md')).toBe('https://raw.githubusercontent.com/a/b/dev/shot.png');
		expect(resolveImage('/shot.png?raw=true', 'a/b', 'main', 'docs/README.md')).toBe('https://raw.githubusercontent.com/a/b/main/shot.png');
		expect(resolveImage('https://github.com/a/b/blob/main/docs/s.png', 'a/b', 'main', 'README.md')).toBe('https://raw.githubusercontent.com/a/b/main/docs/s.png');
		expect(resolveImage('https://github.com/user-attachments/assets/1234', 'a/b', 'main', 'README.md')).toBe('https://github.com/user-attachments/assets/1234');
		expect(resolveImage('https://img.shields.io/badge/go-1.27-blue', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('https://github.com/a/b/actions/workflows/ci.yml/badge.svg', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('docs/diagram.svg', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('http://example.com/s.png', 'a/b', 'main', 'README.md')).toBeUndefined();
		expect(resolveImage('data:image/png;base64,AAAA', 'a/b', 'main', 'README.md')).toBeUndefined();
	});

	it('knows an image by its bytes', () => {
		expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
		expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
		expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('webp');
		expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeUndefined();
	});
});

describe('README counts', () => {
	it('sets the showcase count in every language', () => {
		expect(setShowcaseCount('# A\n\n- **Showcase**: 25 desktop apps built with MyGo. 3 more\n', 26)).toBe('# A\n\n- **Showcase**: 26 desktop apps built with MyGo. 3 more\n');
		expect(setShowcaseCount('- **作品**：25 款用 MyGo 做的桌面应用', 26)).toBe('- **作品**：26 款用 MyGo 做的桌面应用');
		expect(setShowcaseCount('- **ショーケース**：MyGo で作られた 25 のデスクトップアプリ', 26)).toBe('- **ショーケース**：MyGo で作られた 26 のデスクトップアプリ');
		expect(setShowcaseCount('- **쇼케이스**: MyGo로 만든 데스크톱 앱 25개', 26)).toBe('- **쇼케이스**: MyGo로 만든 데스크톱 앱 26개');
		expect(setShowcaseCount('- **UI components**: 4 libraries', 26)).toBeUndefined();
	});
});
