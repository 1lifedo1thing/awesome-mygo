import { describe, expect, it } from 'vitest';
import { ISSUE_TITLE, badgeMarkdown, composeIssue, missingImages, projectRepo } from './issue.ts';
import { SITE_URL } from './tweet.ts';

describe('the project to tell', () => {
	it("takes an entry's repository, or a community plugin's from its docs or import path", () => {
		expect(projectRepo('app', { repo: 'Binaryify/MyGit', url: 'https://binaryify.com/mygit/' })).toBe('Binaryify/MyGit');
		expect(projectRepo('app', { url: 'https://github.com/a/b' })).toBe('a/b');
		expect(projectRepo('app', { url: 'https://kero.sh' })).toBeUndefined();
		expect(projectRepo('plugin', { official: false, docs: 'https://github.com/caelyreth/untie/tree/main/contrib/mygo', import: 'github.com/caelyreth/untie/contrib/mygo' })).toBe('caelyreth/untie');
		expect(projectRepo('plugin', { official: false, docs: 'https://untie.iki.moe', import: 'github.com/caelyreth/untie/contrib/mygo' })).toBe('caelyreth/untie');
		expect(projectRepo('plugin', { official: true, docs: 'https://github.com/egoist/mygo/blob/main/docs/plugins/fetch.md' })).toBeUndefined();
	});
});

describe('missing images', () => {
	it('asks for a screenshot where a card shows one, and for an icon for an app', () => {
		expect(missingImages('app', { slug: 'a' })).toEqual({ screenshot: true, icon: true });
		expect(missingImages('app', { slug: 'a', screenshot: 'a.webp', icon: { file: 'a.webp' } })).toEqual({ screenshot: false, icon: false });
		expect(missingImages('ui', { slug: 'u' })).toEqual({ screenshot: true, icon: false });
		expect(missingImages('plugin', { slug: 'p' })).toEqual({ screenshot: false, icon: false });
	});

	it('suggests adding what the page lacks, and nothing when it lacks nothing', () => {
		const lacking = composeIssue({ kind: 'app', entry: { slug: 'kumo', name: 'Kumo', icon: { file: 'kumo.webp' } } }).body;
		expect(lacking).toContain('The page has no screenshot yet.');
		expect(lacking).toContain('`apps/web/public/shots/kumo.webp`');
		expect(lacking).toContain('`packages/catalog/data/apps/kumo.json`');
		expect(lacking).not.toContain('letter tile');
		expect(lacking).toContain('页面上目前还没有截图');
		const both = composeIssue({ kind: 'app', entry: { slug: 't', name: 'T' } }).body;
		expect(both).toContain('The page has no screenshot and no icon yet, so the app shows a letter tile.');
		expect(both).toContain('还没有截图和图标');
		const full = composeIssue({ kind: 'app', entry: { slug: 'm', name: 'M', screenshot: 'm.webp', icon: { file: 'm.webp' } } }).body;
		expect(full).not.toContain('The page has no');
		expect(full).not.toContain('还没有');
	});
});

describe('the issue', () => {
	it("links the entry's page, the post on X and the badge, in a code block and as it shows", () => {
		const { title, body } = composeIssue({ kind: 'app', entry: { slug: 'mygit', name: 'MyGit' }, postUrl: 'https://x.com/i/status/1' });
		const badge = `[![Listed on Awesome MyGo](${SITE_URL}/badge.svg)](${SITE_URL}/apps/mygit)`;
		expect(title).toBe(ISSUE_TITLE);
		expect(badgeMarkdown('app', { slug: 'mygit' })).toBe(badge);
		expect(body).toContain(`${SITE_URL}/apps/mygit`);
		expect(body).toContain('https://x.com/i/status/1');
		expect(body).toContain(`\`\`\`markdown\n${badge}\n\`\`\``);
		expect(body.split(badge).length - 1).toBe(2);
		expect(body).toContain('已被 [Awesome MyGo]');
	});

	it("links a library's category page, and leaves the post out when there is none", () => {
		const { body } = composeIssue({ kind: 'ui', entry: { slug: 'uix', name: 'uix' } });
		expect(body).toContain(`(${SITE_URL}/ui)`);
		expect(body).not.toContain('x.com');
		expect(body).not.toContain('推文');
	});

	it('mentions no one through the name', () => {
		const { body } = composeIssue({ kind: 'app', entry: { slug: 'a', name: 'Hi @someone' } });
		expect(body).not.toMatch(/@someone/);
		expect(body).toContain('@\u200bsomeone');
	});
});
