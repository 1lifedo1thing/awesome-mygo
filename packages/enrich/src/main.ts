import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DEFAULT_MODEL, README_LIMIT, type LlmConfig, writeCopy } from './copy.ts';
import { github, rawFile, rawUrl as rawRepoUrl } from './github.ts';
import { downloadImage, fetchImage, isDefaultIcon, writeCard, writeIcon, writeShot } from './image.ts';
import { ENTRY_DIRS, SHOT_KINDS, type Entry, type EntryKind, addedFiles, appCategories, appNameFrom, schemaEnum, hasAllLanguages, iconOf, isArtwork, parseMygoConfig, pickMygoConfig, readmeImages, repoOfEntry, repoScreenshots, resolveImage, setCategory, submittedScreenshot } from './source.ts';

// Run by .github/workflows/enrich-submission.yml on a pull request the submission bot opened, and by discover.ts on each entry it proposes. It finds the entries the branch adds, then for each fills in what the form cannot ask for: an app's icon (from its mygo.json) and screenshot (the first landscape one in its README, or else in a screenshot folder of the repository), its category when the submission names none, and the copy in every site language. It changes files in the working tree and writes a Markdown report for the pull request; the workflow runs the catalog checks and commits.
//
// Environment: BASE_REF (the branch the entries are compared with, default origin/main), REPORT_FILE (where the report goes), GITHUB_TOKEN (for the GitHub API), and LLM_API_KEY with optional LLM_BASE_URL and LLM_MODEL for the copy; without LLM_API_KEY the copy is left as submitted.

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = 'packages/catalog/data';
const PUBLIC = 'apps/web/public';
// Apps on the site whose copy, written by hand, sets the voice the generated copy should match.
const EXAMPLE_APPS = ['joplin-lite', 'nova'];

const env = process.env;
const BASE_REF = env.BASE_REF || 'origin/main';
const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
};

interface RepoFacts {
	repo: string;
	branch: string;
	paths: string[];
	readme?: { path: string; text: string };
	// The MyGo configuration, mygo.json or mygo.config.ts, with the fields read from it.
	mygo?: { path: string; text: string; json: unknown };
	// The repository's social preview: the image its owner set, or else the card GitHub draws of its name, description and owner.
	preview?: { url: string; custom: boolean };
}

async function repoFacts(repo: string): Promise<RepoFacts | undefined> {
	const info = await github<{ default_branch: string; private: boolean }>(`/repos/${repo}`);
	if (!info) return undefined;
	const branch = info.default_branch;
	const tree = await github<{ tree: { path: string; type: string }[]; truncated: boolean }>(`/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
	const paths = (tree?.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);
	const facts: RepoFacts = { repo, branch, paths };
	const readme = await github<{ path: string; content: string; encoding: string }>(`/repos/${repo}/readme`);
	if (readme?.encoding === 'base64') facts.readme = { path: readme.path, text: Buffer.from(readme.content, 'base64').toString('utf8') };
	const og = await github<{ data?: { repository: { openGraphImageUrl: string; usesCustomOpenGraphImage: boolean } | null } }>('/graphql', { method: 'POST', body: { query: 'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { openGraphImageUrl usesCustomOpenGraphImage } }', variables: { owner: repo.split('/')[0], name: repo.split('/')[1] } } }).catch(() => undefined);
	const preview = og?.data?.repository;
	if (preview?.openGraphImageUrl) facts.preview = { url: preview.openGraphImageUrl, custom: preview.usesCustomOpenGraphImage };
	const mygoPath = pickMygoConfig(paths);
	if (mygoPath) {
		const text = await rawFile(repo, branch, mygoPath);
		if (text !== undefined) {
			try {
				facts.mygo = { path: mygoPath, text, json: parseMygoConfig(mygoPath, text) };
			} catch {
				say(`- \`${mygoPath}\` is not valid JSON, so its icon could not be read.`);
			}
		}
	}
	return facts;
}

const rawUrl = (facts: RepoFacts, path: string) => rawRepoUrl(facts.repo, facts.branch, path);

// The app's own icon, where MyGo takes it from, written as the app's icon file. Returns the file it came from when there was one, so the screenshot search can pass over the same image, and why there is none otherwise.
async function ownIcon(slug: string, facts: RepoFacts): Promise<{ path: string; url: string } | { why: string; url?: string }> {
	if (!facts.mygo) return { why: 'the repository has no MyGo configuration (mygo.json or mygo.config.ts)' };
	const src = iconOf(facts.mygo.path, facts.mygo.json, facts.paths);
	if (!src) return { why: `neither \`${facts.mygo.path}\` nor resources/ beside it has an icon` };
	if ('macOnly' in src) return { why: `the app's only icon is \`${src.macOnly}\` (macos.icon), which cannot be converted here` };
	const url = rawUrl(facts, src.path);
	const img = await downloadImage(url);
	if (!img) return { why: `\`${src.path}\` could not be downloaded as a PNG, JPEG or WebP under 10 MB` };
	if (await isDefaultIcon(img)) return { why: `\`${src.path}\` is MyGo's default icon (as \`mygo init\` leaves it)`, url };
	if (!(await writeIcon(img, join(ROOT, PUBLIC, 'icons', `${slug}.webp`)))) return { why: `\`${src.path}\` is smaller than 128 px`, url };
	return { path: src.path, url };
}

// Adds the app's icon: its own, or else its owner's GitHub avatar, so an app with a repository never shows a bare letter tile. Returns where its own icon was taken from, for the screenshot search.
async function addIcon(entry: Entry, slug: string, facts: RepoFacts): Promise<string | undefined> {
	if (entry.icon !== undefined) return void say('- Icon: kept the one submitted.');
	const own = await ownIcon(slug, facts);
	if ('path' in own) {
		entry.icon = { file: `${slug}.webp` };
		say(`- Icon: \`${own.path}\`, cut to its plate and saved as \`${PUBLIC}/icons/${slug}.webp\`. Check that it looks right.`);
		return own.url;
	}
	const avatar = `https://github.com/${facts.repo.split('/')[0]}.png?size=512`;
	const img = await downloadImage(avatar);
	if (img && (await writeIcon(img, join(ROOT, PUBLIC, 'icons', `${slug}.webp`)))) {
		entry.icon = { file: `${slug}.webp` };
		say(`- Icon: ${own.why}, so the owner's GitHub avatar (${avatar}) stands in, saved as \`${PUBLIC}/icons/${slug}.webp\`. Replace it with the app's own icon when there is one.`);
	} else say(`- Icon: ${own.why}, and the owner's GitHub avatar could not be used either; the app shows a letter tile. **Add an icon before merging.**`);
	return own.url;
}

// The link the visitor gave in the form first, as they picked it; then the README's images, as the project picked them to show itself; then the images in the repository's screenshot folders, which a project with none in its README often keeps for its website. Each source gets its own number of tries, so a README full of badges does not use up the folders' turn. An app without a repository can still get the form's screenshot.
async function addScreenshot(entry: Entry, slug: string, facts: RepoFacts | undefined, iconUrl: string | undefined, submitted: string | undefined): Promise<void> {
	if (entry.screenshot !== undefined) return say('- Screenshot: kept the one submitted.');
	if (!facts && !submitted) return;
	const readme = facts?.readme;
	// picked: the visitor chose the image, so it is taken as it is; the repository's images may be artwork.
	const sources: { from: string; urls: string[]; tries: number; picked: boolean }[] = [
		{ from: 'the link given in the form', urls: submitted ? [submitted] : [], tries: 1, picked: true },
		{ from: 'the README', urls: facts && readme ? readmeImages(readme.text).map((src) => resolveImage(src, facts.repo, facts.branch, readme.path)).filter((u): u is string => !!u) : [], tries: 8, picked: false },
		{ from: 'a screenshot folder in the repository', urls: facts ? repoScreenshots(facts.paths).map((p) => rawUrl(facts, p)) : [], tries: 6, picked: false },
		// The last resort, so an entry with a repository is never without an image: the preview its owner set for the repository, or else the card GitHub draws of it.
		{ from: facts?.preview?.custom ? "the repository's social preview, as no screenshot was found" : "GitHub's card for the repository (its social preview), as no screenshot was found", urls: facts?.preview ? [facts.preview.url] : [], tries: 1, picked: true },
	];
	const tried: string[] = [];
	const skipped: string[] = [];
	for (const source of sources) {
		let n = 0;
		for (const url of source.urls) {
			if (tried.includes(url)) continue;
			tried.push(url);
			if (url === iconUrl) {
				skipped.push(`${url} (the app icon)`);
				continue;
			}
			if (!source.picked && isArtwork(url)) {
				skipped.push(`${url} (named as artwork, not a screenshot)`);
				continue;
			}
			const img = await fetchImage(url);
			const result = typeof img === 'string' ? img : await writeShot(img, join(ROOT, PUBLIC, 'shots', `${slug}.webp`));
			if (result === 'ok') {
				entry.screenshot = `${slug}.webp`;
				const passed = skipped.length ? ` It passed over ${skipped.join(', ')}.` : '';
				const check = url === facts?.preview?.url ? ' Replace it with a screenshot when there is one.' : ' Check that it shows the project.';
				return say(`- Screenshot: ${url} from ${source.from}, saved as \`${PUBLIC}/shots/${slug}.webp\`.${check}${passed}`);
			}
			skipped.push(`${url} (${result === 'square' ? 'square, likely a logo' : result === 'narrow' ? 'under 600 px wide' : result === 'portrait' ? 'taller than wide' : result === 'banner' ? 'a banner, far wider than a window' : result})`);
			if (++n >= source.tries) break;
		}
	}
	// Nothing the project has, nor GitHub's card: a card drawn here from the owner's avatar, so the entry is not left without an image.
	const passed = skipped.length ? ` The images tried: ${skipped.join(', ')}.` : '';
	if (facts) {
		const owner = facts.repo.split('/')[0];
		const avatar = await downloadImage(`https://github.com/${owner}.png?size=512`);
		if (avatar) {
			await writeCard(avatar, facts.repo, join(ROOT, PUBLIC, 'shots', `${slug}.webp`));
			entry.screenshot = `${slug}.webp`;
			return say(`- Screenshot: none found, so a card of ${owner}'s GitHub avatar and ${facts.repo} was drawn, saved as \`${PUBLIC}/shots/${slug}.webp\`. Replace it with a screenshot when there is one.${passed}`);
		}
	}
	const none = '**Add a screenshot before merging.**';
	if (skipped.length) return say(`- Screenshot: none added. The images tried: ${skipped.join(', ')}. ${none}`);
	say(!facts ? `- Screenshot: none added, as the entry has no GitHub repository to take one from. ${none}` : `- Screenshot: none added, as the repository has no image and GitHub gave no social preview. ${none}`);
}

// An app needs a category: without one it is the only app in the showcase's other group, which the catalog checks reject. The form leaves it optional, so the model picks one along with the copy, from the categories apps on the site already have: a group of a single app reads as a mistake, and the checks reject that too (godraw's Design was such a group). UI components get their filter the same way, as the form always submits its default.
// used: the categories of the apps on the site.
async function addCopy(cfg: LlmConfig | undefined, kind: EntryKind, entry: Entry, facts: RepoFacts | undefined, examples: Entry[], used: ReadonlySet<string>): Promise<void> {
	const needsCategory = kind === 'app' && entry.category === undefined;
	if (hasAllLanguages(entry.summary) && (kind !== 'app' || hasAllLanguages(entry.description))) {
		say('- Copy: kept, as it is already in every site language.');
		if (needsCategory) say('- Category: none submitted, and none picked as the copy was kept. Add one before merging.');
		return;
	}
	if (!cfg) return say(`- Copy: left as submitted, as LLM_API_KEY is not set for this workflow.${needsCategory ? ' No category was picked either; add one before merging.' : ''}`);
	if (facts?.readme && facts.readme.text.length > README_LIMIT) say(`- The README is ${facts.readme.text.length} characters long; the copy was written from its first ${README_LIMIT}.`);
	try {
		const schema = async (name: string) => JSON.parse(await readFile(join(ROOT, DATA_DIR, `schema/${name}.schema.json`), 'utf8')) as unknown;
		const categories = needsCategory ? appCategories(await schema('app')).filter((c) => used.has(c)) : undefined;
		const uiTags = kind === 'ui' ? schemaEnum(await schema('ui'), 'tag') : undefined;
		const copy = await writeCopy(cfg, { kind, entry, readme: facts?.readme?.text, mygoConfig: facts?.mygo ? { path: facts.mygo.path, text: facts.mygo.text } : undefined, examples, categories, uiTags });
		entry.summary = copy.summary;
		if (kind === 'app' && copy.description) entry.description = copy.description;
		say(`- Copy: written by ${cfg.model} in all five languages from the submission${facts?.readme ? ' and the README' : ''}. Read it before merging.`);
		if (copy.category) {
			setCategory(entry, copy.category);
			say(`- Category: ${copy.category}, picked by the model as the submission named none. Check it.`);
		} else if (needsCategory) say(`- Category: none submitted, and the model's pick${copy.badCategory ? ` (${copy.badCategory})` : ''} is not one the apps on the site have. **Add one before merging.**`);
		if (copy.tag && copy.tag !== entry.tag) {
			say(`- Tag: ${copy.tag}, picked by the model (submitted as ${String(entry.tag)}, the form's default). Check it.`);
			entry.tag = copy.tag;
		} else if (kind === 'ui' && copy.badTag) say(`- Tag: kept ${String(entry.tag)}, as the model's pick (${copy.badTag}) is not one the schema allows. Check it.`);
		if (copy.notes) say(`- Model's notes: ${copy.notes.replace(/\s+/g, ' ')}`);
		if (copy.tooLong.length) say(`- Still longer than the hand-written examples after one rewrite (length/limit): ${copy.tooLong.join(', ')}. Shorten before merging.`);
	} catch (err) {
		say(`- Copy: left as submitted, as writing it failed: ${err instanceof Error ? err.message : String(err)}${needsCategory ? '. No category was picked either; add one before merging.' : ''}`);
	}
}

// Fills in one added entry, in place: for an app its name, icon and screenshot from its repository, for UI components and state management their screenshot, and for every kind the copy.
// used: the categories of the apps on the site. submitted: the screenshot link from the site's form, for an app.
async function complete(cfg: LlmConfig | undefined, kind: EntryKind, where: string, entry: Entry, examples: Entry[], used: ReadonlySet<string>, submitted?: string): Promise<void> {
	say(`### ${String(entry.name ?? entry.slug ?? '?')} (\`${where}\`)`);
	const repo = repoOfEntry(entry);
	const facts = repo ? await repoFacts(repo) : undefined;
	if (!repo) say('- No GitHub repository in the entry, so nothing was taken from one.');
	else if (!facts) say(`- The repository ${repo} could not be found.`);
	if (kind === 'app') {
		const slug = String(entry.slug);
		const better = facts?.mygo ? appNameFrom(String(entry.name), facts.mygo.json) : undefined;
		if (better) {
			say(`- Name: ${better}, as \`${facts?.mygo?.path}\` spells it (submitted as ${String(entry.name)}).`);
			entry.name = better;
		}
		const iconUrl = facts ? await addIcon(entry, slug, facts) : undefined;
		await addScreenshot(entry, slug, facts, iconUrl, submitted);
	} else if (SHOT_KINDS.includes(kind)) await addScreenshot(entry, String(entry.slug), facts, undefined, undefined);
	await addCopy(cfg, kind, entry, facts, examples, used);
}

// An entry's file, with added last as in the files written by hand, though a screenshot or icon was added after it.
const json = ({ added, ...rest }: Entry) => `${JSON.stringify(added === undefined ? rest : { ...rest, added }, null, '\t')}\n`;

async function main(): Promise<void> {
	const cfg: LlmConfig | undefined = env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL || undefined, model: env.LLM_MODEL || DEFAULT_MODEL } : undefined;

	// Each kind's new entries: the files in its directory that the base branch does not have.
	const added: { kind: EntryKind; dir: string; known: string[]; names: string[] }[] = [];
	for (const kind of Object.keys(ENTRY_DIRS) as EntryKind[]) {
		const dir = `${DATA_DIR}/${ENTRY_DIRS[kind]}`;
		const { stdout: listed } = await run('git', ['ls-tree', '--name-only', `${BASE_REF}:${dir}`], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 });
		const head = await readdir(join(ROOT, dir));
		// Only the files the branch still has: one it deletes or renames cannot be read as an example.
		const known = listed.split('\n').filter((name) => name && head.includes(name));
		const names = addedFiles(known, head);
		if (names.length) added.push({ kind, dir, known, names });
	}
	// The bot's pull request adds one app, and its body may carry the screenshot link from the form; with several apps it would be unclear whose it is, so it is left out.
	const newApps = added.find((a) => a.kind === 'app')?.names ?? [];
	const pr = newApps.length === 1 && env.PR && env.GITHUB_REPOSITORY ? await github<{ body: string | null }>(`/repos/${env.GITHUB_REPOSITORY}/pulls/${env.PR}`) : undefined;
	const submitted = newApps.length === 1 ? submittedScreenshot(pr?.body) : undefined;
	// The categories of the apps already on the site: a new app picks its own from them.
	const apps = added.find((a) => a.kind === 'app');
	const used = new Set<string>();
	for (const name of apps?.known ?? []) {
		const category = (JSON.parse(await readFile(join(ROOT, apps?.dir ?? '', name), 'utf8')) as Entry).category;
		if (typeof category === 'string') used.add(category);
	}
	for (const { kind, dir, known, names } of added) {
		const read = async (name: string) => JSON.parse(await readFile(join(ROOT, dir, name), 'utf8')) as Entry;
		// The voice to match: for apps the hand-written ones, for the rest the two entries added last before this branch.
		const examples = kind === 'app' ? await Promise.all(EXAMPLE_APPS.map((slug) => read(`${slug}.json`))) : (await Promise.all(known.map(read))).sort((a, b) => String(a.added ?? '').localeCompare(String(b.added ?? ''))).slice(-2);
		for (const name of names) {
			const entry = await read(name);
			await complete(cfg, kind, `${dir}/${name}`, entry, examples, used, kind === 'app' ? submitted : undefined);
			await writeFile(join(ROOT, dir, name), json(entry));
		}
	}

	const text = report.length ? report.join('\n') : 'The branch adds no entry this workflow completes.';
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${text}\n`);
	console.log(text);
}

await main();
