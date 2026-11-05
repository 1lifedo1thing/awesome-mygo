// The issue opened on a newly listed project's own repository once the site lists it: that it was listed and where, the post on X about it, and the README badge's Markdown so the project can link back. Bilingual, English first, as the projects come from everywhere and many of their authors write Chinese.

import { ENTRY_DIRS, type EntryKind, type Entry, SITE_URL, githubUrl, sitePage } from './tweet.ts';

// The title every issue has, which is also how a later run finds that it was opened already.
export const ISSUE_TITLE = 'Listed on Awesome MyGo';

// MyGo's own repository, whose owner is MyGo's author.
export const MYGO_REPO = 'egoist/mygo';

// Why a repository is not told, or undefined when it is: one of this site's own owner, or one of MyGo's author, whose projects (MyGo's own apps, such as Kero or Lorca) are listed without telling them, as MyGo's maintainers know the site.
export function notTold(repo: string, siteOwner?: string): string | undefined {
	const owner = repo.split('/')[0].toLowerCase();
	if (siteOwner && owner === siteOwner.toLowerCase()) return `it belongs to ${repo.split('/')[0]}, the site's own owner`;
	if (owner === MYGO_REPO.split('/')[0]) return `it belongs to ${repo.split('/')[0]}, MyGo's author`;
	return undefined;
}

// The GitHub repository to tell, as owner/name: the entry's repository or GitHub link, or, for a community plugin, the repository its docs or Go import path name. An official plugin lives in MyGo's own repository, which needs no telling.
export function projectRepo(kind: EntryKind, entry: Entry): string | undefined {
	const own = githubUrl(entry)?.slice('https://github.com/'.length);
	if (own) return own;
	if (kind !== 'plugin' || entry.official === true) return undefined;
	for (const v of [entry.docs, entry.import]) {
		const m = typeof v === 'string' ? /^(?:https:\/\/)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/.exec(v) : null;
		if (m) return `${m[1]}/${m[2]}`;
	}
	return undefined;
}

// The README badge, linking to the entry's page on the site; the same Markdown as the app page shows (appBadgeMarkdown in apps/web/src/lib/seo.ts).
export function badgeMarkdown(kind: EntryKind, entry: Entry): string {
	return `[![Listed on Awesome MyGo](${SITE_URL}/badge.svg)](${sitePage(kind, entry)})`;
}

const KIND_EN: Record<EntryKind, string> = { app: 'in the showcase', ui: 'among the UI components', state: 'among the state management solutions', plugin: 'among the plugins' };
const KIND_ZH: Record<EntryKind, string> = { app: '作品', ui: 'UI 组件', state: '状态管理', plugin: '插件' };

// What the entry's page lacks that the project can give: a screenshot, for the kinds whose card shows one, and an icon, for an app, which shows a letter tile without one.
export function missingImages(kind: EntryKind, entry: Entry): { screenshot: boolean; icon: boolean } {
	return { screenshot: kind !== 'plugin' && entry.screenshot === undefined, icon: kind === 'app' && entry.icon === undefined };
}

// The entry's images that stand in until the project gives its own (the catalog's provisional field, which packages/enrich sets): the owner's GitHub avatar as an app's icon, a card of the repository as a screenshot.
export function standInImages(kind: EntryKind, entry: Entry): { screenshot: boolean; icon: boolean } {
	const list = Array.isArray(entry.provisional) ? (entry.provisional as unknown[]) : [];
	return { screenshot: kind !== 'plugin' && entry.screenshot !== undefined && list.includes('screenshot'), icon: kind === 'app' && entry.icon !== undefined && list.includes('icon') };
}

export interface IssueInput {
	kind: EntryKind;
	entry: Entry;
	// The post on X about the entry, when it was posted.
	postUrl?: string;
}

// The issue's title and body. The name is the project's own; no @mention is written, so nobody but the repository's watchers is notified.
export function composeIssue({ kind, entry, postUrl }: IssueInput): { title: string; body: string } {
	// A zero-width space after any @ in the name, which comes from the project, so it mentions no one.
	const name = (typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : String(entry.slug)).replace(/@(?=[\w-])/g, '@\u200b');
	const page = sitePage(kind, entry);
	const badge = badgeMarkdown(kind, entry);
	const site = `[Awesome MyGo](${SITE_URL})`;
	const slug = String(entry.slug);
	const file = `packages/catalog/data/${ENTRY_DIRS[kind]}/${slug}.json`;
	const missing = missingImages(kind, entry);
	const stand = standInImages(kind, entry);
	const standEn = [...(stand.icon ? ["your GitHub avatar as the app's icon"] : []), ...(stand.screenshot ? ['a card of the repository as its screenshot'] : [])];
	const standZh = [...(stand.icon ? ['图标（你的 GitHub 头像）'] : []), ...(stand.screenshot ? ['截图（仓库的卡片）'] : [])];
	const standFiles = [...(stand.screenshot ? [`\`apps/web/public/shots/${slug}.webp\` (WebP, up to 1200 px wide)`] : []), ...(stand.icon ? [`\`apps/web/public/icons/${slug}.webp\` (a 256 px square WebP)`] : [])];
	const standNames = [...(stand.icon ? ['"icon"'] : []), ...(stand.screenshot ? ['"screenshot"'] : [])];
	const lacks = [...(missing.screenshot ? ['screenshot'] : []), ...(missing.icon ? ['icon'] : [])];
	const lacksZh = [...(missing.screenshot ? ['截图'] : []), ...(missing.icon ? ['图标'] : [])];
	const how = [
		...(missing.screenshot ? [`a screenshot as \`apps/web/public/shots/${slug}.webp\` (WebP, up to 1200 px wide) with \`"screenshot": "${slug}.webp"\``] : []),
		...(missing.icon ? [`an icon as \`apps/web/public/icons/${slug}.webp\` (a 256 px square WebP) with \`"icon": { "file": "${slug}.webp" }\``] : []),
	];
	const body = [
		`${name} is now listed ${KIND_EN[kind]} on ${site}, the directory of projects built with [MyGo](https://github.com/${MYGO_REPO}): ${page}`,
		...(postUrl ? [`It was announced on X: ${postUrl}`] : []),
		"If you'd like to link back, here is a badge for your README:",
		`\`\`\`markdown\n${badge}\n\`\`\``,
		`${badge}`,
		...(lacks.length
			? [`The page has no ${lacks.join(' and no ')} yet${missing.icon ? ', so the app shows a letter tile' : ''}. It would look much better with ${lacks.length > 1 ? 'both' : 'one'}: reply here with a link to the image, or send a pull request to https://github.com/yldm-tech/awesome-mygo that adds ${how.join(', and ')} in \`${file}\`.`]
			: []),
		...(standEn.length
			? [`For now the page shows ${standEn.join(' and ')}, in place of the project's own. It would look much better with yours: reply here with a link to the image, or send a pull request to https://github.com/yldm-tech/awesome-mygo that replaces ${standFiles.join(' and ')} and drops ${standNames.join(' and ')} from \`provisional\` in \`${file}\`.`]
			: []),
		"If anything on the page is wrong, such as the description, the screenshot or the icon, reply here or open an issue or pull request at https://github.com/yldm-tech/awesome-mygo. If you would rather not be listed, say so and it will be taken down. Feel free to close this issue.",
		'---',
		`${name} 已被 ${site} 收录到${KIND_ZH[kind]}：${page}`,
		...(postUrl ? [`X 上的收录推文：${postUrl}`] : []),
		...(lacksZh.length ? [`页面上目前还没有${lacksZh.join('和')}${missing.icon ? '（应用暂时显示为字母图块）' : ''}，建议补上：直接在这里回复图片链接，或者给 https://github.com/yldm-tech/awesome-mygo 提 PR，按上面英文说明放好图片文件并在 \`${file}\` 里登记。`] : []),
		...(standZh.length ? [`页面上的${standZh.join('和')}暂时是替代图，换成项目自己的会好很多：直接在这里回复图片链接，或者给 https://github.com/yldm-tech/awesome-mygo 提 PR，替换上面英文说明里的图片文件，并把 \`${file}\` 里 \`provisional\` 中的对应项删掉。`] : []),
		'欢迎在 README 里加上上面的 badge 互相链接。页面上的介绍、截图或图标有误，直接在这里回复，或到 https://github.com/yldm-tech/awesome-mygo 提 issue 或 PR；不希望被收录也请告诉我们，会尽快下架。',
	];
	return { title: ISSUE_TITLE, body: `${body.join('\n\n')}\n` };
}
