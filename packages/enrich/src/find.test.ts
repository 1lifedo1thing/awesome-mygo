import { describe, expect, it } from 'vitest';
import { type Verdict, branchFor, configNear, entryFor, goModsIn, groupHits, isDue, isSamplePath, listedAs, listedFrom, moduleOf, normalizeLink, quiet, remember, reposInImportedBy, reposOfEntry, requiresMygo, uniqueSlug, withoutFailed } from './find.ts';

describe('what the site lists', () => {
	it('takes every repository an entry points at, in lower case', () => {
		expect(reposOfEntry({ repo: 'ELY-Open-Source/MujicaUI', url: 'https://github.com/ELY-Open-Source/MujicaUI' })).toEqual(['ely-open-source/mujicaui']);
		expect(reposOfEntry({ url: 'https://getbamboo.app/', repo: 'OldPanda/bamboo' })).toEqual(['oldpanda/bamboo']);
		expect(reposOfEntry({ docs: 'https://github.com/egoist/mygo/blob/main/docs/plugins/fetch.md', import: 'github.com/egoist/mygo/plugins/fetch' })).toEqual(['egoist/mygo']);
		expect(reposOfEntry({ url: 'https://github.com/you/app.git' })).toEqual(['you/app']);
		expect(reposOfEntry({ url: 'https://example.com' })).toEqual([]);
	});
});

describe('what the site lists without a repository', () => {
	const listed = listedFrom([
		{ slug: 'kero', author: 'egoist', url: 'https://kero.sh' },
		{ slug: 'meiro', author: 'elianiva', url: 'https://meiro.elianiva.com' },
		{ slug: 'nodra', author: 'yldm-tech', repo: 'yldm-tech/nodra', url: 'https://github.com/yldm-tech/nodra', homepage: 'https://nodra.yldm.ai' },
	]);

	it('writes links the same way whoever wrote them', () => {
		expect(normalizeLink('https://www.Kero.sh/')).toBe('kero.sh');
		expect(normalizeLink('meiro.elianiva.com')).toBe('meiro.elianiva.com');
		expect(normalizeLink('https://reef.echovic.com/?ref=gh#top')).toBe('reef.echovic.com');
		expect(normalizeLink('https://example.com/docs/')).toBe('example.com/docs');
		expect(normalizeLink('')).toBeUndefined();
		expect(normalizeLink('not a link')).toBeUndefined();
	});

	it('knows a repository by its repo field, its homepage, or its owner and name', () => {
		expect(listedAs(listed, 'Yldm-Tech/Nodra')).toBe('its repository');
		expect(listedAs(listed, 'kero-dev/kero-app', 'https://kero.sh/')).toBe('its homepage, kero.sh');
		expect(listedAs(listed, 'elianiva/meiro', null)).toBe('an entry of elianiva named meiro');
		expect(listedAs(listed, 'someone/kero', 'https://kero.example')).toBeUndefined();
		expect(listedAs(listed, 'egoist/kero-cli', null)).toBeUndefined();
	});

	it('does not take GitHub itself for a homepage', () => {
		expect(listed.links.has('github.com/yldm-tech/nodra')).toBe(false);
		expect(listed.links.has('nodra.yldm.ai')).toBe(true);
	});
});

describe('code search hits', () => {
	it('passes over examples, tests, benchmarks and vendored code', () => {
		expect(isSamplePath('example/go-native-gui/go.mod')).toBe(true);
		expect(isSamplePath('examples/mygo-stream/go.mod')).toBe(true);
		expect(isSamplePath('bench/go/go.mod')).toBe(true);
		expect(isSamplePath('go.mod')).toBe(false);
		expect(isSamplePath('apps/desktop/go.mod')).toBe(false);
		expect(isSamplePath('contrib/mygo/go.mod')).toBe(false);
	});

	it('groups go.mod files by repository, without forks, listed repositories or samples only', () => {
		const grouped = groupHits(
			[
				{ repo: 'caelyreth/untie', path: 'examples/mygo-simple/go.mod', fork: false },
				{ repo: 'caelyreth/untie', path: 'contrib/mygo/go.mod', fork: false },
				{ repo: 'Code-Hex/vz', path: 'example/go-native-gui/go.mod', fork: false },
				{ repo: 'egoist/Lorca', path: 'desktop/go.mod', fork: false },
				{ repo: 'someone/mygo', path: 'go.mod', fork: true },
				{ repo: 'AstraFoundry/Arion', path: 'apps/desktop/go.mod', fork: false },
				{ repo: 'AstraFoundry/Arion', path: 'go.mod', fork: false },
			],
			new Set(['egoist/lorca']),
		);
		expect([...grouped]).toEqual([
			['caelyreth/untie', ['contrib/mygo/go.mod']],
			['AstraFoundry/Arion', ['go.mod', 'apps/desktop/go.mod']],
		]);
	});

	it('finds the go.mod files of a repository found another way', () => {
		expect(goModsIn(['README.md', 'shell/go.mod', 'go.mod', 'shell/main.go'])).toEqual(['go.mod', 'shell/go.mod']);
		expect(goModsIn(['go.mod', 'third_party/mygo/go.mod', 'examples/demo/go.mod'])).toEqual(['go.mod']);
		expect(goModsIn(['web/package.json'])).toEqual([]);
	});

	it('reads the repositories pkg.go.dev lists as importers', () => {
		const html = '<a href="/github.com/egoist/mygo/ui">x</a><a href="/github.com/yldm-tech/nodra">nodra</a><a href="/github.com/yldm-tech/nodra/persist">p</a><a href="/github.com/Licoy/sshyard/internal/app?tab=doc">s</a><a href="/golang.org/x/sys">sys</a>';
		expect(reposInImportedBy(html)).toEqual(['yldm-tech/nodra', 'Licoy/sshyard']);
		expect(reposInImportedBy('')).toEqual([]);
	});

	it('takes only a go.mod that requires MyGo itself', () => {
		expect(requiresMygo('module x\n\nrequire (\n\tgithub.com/egoist/mygo v0.42.0\n)\n')).toBe(true);
		expect(requiresMygo('module x\n\nrequire github.com/egoist/mygo v0.0.0-20261101-abcdef\n')).toBe(true);
		expect(requiresMygo('module x\n\nrequire github.com/egoist/mygo-cli v1.0.0\n')).toBe(false);
		expect(requiresMygo('module x\n\n// like github.com/egoist/mygo v1, but smaller\n')).toBe(false);
		expect(moduleOf('module github.com/yldm-tech/nodra\n\ngo 1.27\n')).toBe('github.com/yldm-tech/nodra');
		expect(moduleOf('go 1.27\n')).toBeUndefined();
	});

	it('finds the MyGo configuration beside the go.mod, or else at the root', () => {
		expect(configNear('app/go.mod', ['app/go.mod', 'app/mygo.json', 'mygo.json'])).toBe('app/mygo.json');
		expect(configNear('desktop/go.mod', ['desktop/go.mod', 'mygo.config.ts'])).toBe('mygo.config.ts');
		expect(configNear('go.mod', ['go.mod', 'mygo.config.ts', 'package.json'])).toBe('mygo.config.ts');
		expect(configNear('go.mod', ['go.mod', 'main.go'])).toBeUndefined();
	});
});

describe('proposals', () => {
	it('gives each repository a branch of its own', () => {
		expect(branchFor('Saramanda9988/LunaBox')).toBe('discover/saramanda9988/lunabox');
		expect(branchFor('a_b/c d')).toBe('discover/a_b/c-d');
	});

	it('picks a slug no entry has', () => {
		expect(uniqueSlug('LunaBox', 'Saramanda9988/LunaBox', new Set())).toBe('lunabox');
		expect(uniqueSlug('留白', 'echoVic/liubai', new Set())).toBe('liubai');
		expect(uniqueSlug('Pulse', 'someone/pulse', new Set(['pulse']))).toBe('pulse-someone');
		expect(uniqueSlug('Pulse', 'someone/pulse', new Set(['pulse', 'pulse-someone']))).toBe('pulse-someone-2');
	});

	const verdict = (v: Partial<Verdict>): Verdict => ({ verdict: 'app', reason: '', name: 'LunaBox', summary: 'A box.', kind: 'native', tag: '', surface: '', tags: [], ...v });
	const info = { repo: 'Saramanda9988/LunaBox', htmlUrl: 'https://github.com/Saramanda9988/LunaBox', homepage: '', module: 'github.com/Saramanda9988/LunaBox/apps/desktop' };

	it('writes an app entry, linking its homepage only when it is https', () => {
		expect(entryFor(verdict({ summary: ' A  box.\n' }), info, 'lunabox')).toEqual({
			kind: 'app',
			entry: { slug: 'lunabox', name: 'LunaBox', author: 'Saramanda9988', kind: 'native', url: 'https://github.com/Saramanda9988/LunaBox', repo: 'Saramanda9988/LunaBox', summary: { en: 'A box.' }, description: { en: 'A box.' } },
		});
		expect(entryFor(verdict({ kind: 'Web' }), { ...info, homepage: 'https://lunabox.app' }, 'lunabox')).toMatchObject({ entry: { kind: 'web', url: 'https://lunabox.app' } });
		expect(entryFor(verdict({}), { ...info, homepage: 'http://lunabox.app' }, 'lunabox')).toMatchObject({ entry: { url: info.htmlUrl } });
		expect(entryFor(verdict({ kind: 'desktop' }), info, 'lunabox')).toEqual({ error: 'the model gave no app kind (desktop)' });
	});

	it('writes library and plugin entries with the fields their schemas require', () => {
		expect(entryFor(verdict({ verdict: 'ui', tag: 'theme', surface: 'Native' }), info, 'x')).toMatchObject({ kind: 'ui', entry: { tag: 'theme', surface: 'native', repo: info.repo, url: info.htmlUrl } });
		expect(entryFor(verdict({ verdict: 'ui', tag: 'dark', surface: 'native' }), info, 'x')).toEqual({ error: 'the model gave no UI tag (dark)' });
		expect(entryFor(verdict({ verdict: 'ui', tag: 'icons' }), info, 'x')).toEqual({ error: 'the model gave no UI surface (empty)' });
		expect(entryFor(verdict({ verdict: 'state', tags: ['Store', 'store', 'Reactive State'] }), { ...info, module: 'github.com/yldm-tech/nodra' }, 'x')).toMatchObject({
			kind: 'state',
			entry: { install: 'go get github.com/yldm-tech/nodra@latest', tags: ['store', 'reactive-state'] },
		});
		expect(entryFor(verdict({ verdict: 'state' }), { ...info, module: undefined }, 'x')).toMatchObject({ entry: { install: 'go get github.com/Saramanda9988/LunaBox@latest', tags: ['state'] } });
		expect(entryFor(verdict({ verdict: 'plugin', name: 'Untie Stream', surface: 'both', tags: ['stream'] }), info, 'x')).toMatchObject({
			kind: 'plugin',
			entry: { mark: 'Un', official: false, surface: 'both', import: info.module, tags: ['stream'], docs: info.htmlUrl },
		});
		expect(entryFor(verdict({ verdict: 'Skip' }), info, 'x')).toEqual({ error: "the model's verdict is Skip" });
		expect(entryFor(verdict({ name: ' ' }), info, 'x')).toEqual({ error: 'the model gave no name or summary' });
	});

	it('looks at a skipped repository again after 90 days, and a failed one after 14', () => {
		const now = new Date('2026-11-05T00:00:00Z');
		const skipped = remember('skip', 'a template', now);
		expect(skipped).toEqual({ verdict: 'skip', reason: 'a template', at: '2026-11-05T00:00:00.000Z', until: '2027-02-03T00:00:00.000Z' });
		expect(isDue(skipped, new Date('2027-02-02T23:59:59Z'))).toBe(false);
		expect(isDue(skipped, new Date('2027-02-03T00:00:00Z'))).toBe(true);
		expect(remember('failed', '', now).until).toBe('2026-11-19T00:00:00.000Z');
		expect(isDue(undefined, now)).toBe(true);
	});

	it('forgets the failed repositories when asked to try them again, and keeps the skipped ones', () => {
		const now = new Date('2026-11-05T00:00:00Z');
		const seen = { 'a/skip': remember('skip', 'a template', now), 'b/failed': remember('failed', 'the catalog checks failed', now) };
		expect(withoutFailed(seen)).toEqual({ 'a/skip': seen['a/skip'] });
	});

	it('keeps text from a repository from mentioning anyone', () => {
		expect(quiet('ping @someone and @acme/maintainers, mail a@b.c')).toBe('ping @\u200bsomeone and @\u200bacme/maintainers, mail a@\u200bb.c');
	});
});
