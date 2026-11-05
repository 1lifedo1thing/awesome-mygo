import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DEFAULT_MODEL, README_LIMIT, type LlmConfig, writeCopy } from './copy.ts';
import { github, rawFile, rawUrl as rawRepoUrl } from './github.ts';
import { downloadImage, isDefaultIcon, writeIcon, writeShot } from './image.ts';
import { ENTRY_DIRS, type Entry, type EntryKind, addedFiles, appCategories, appNameFrom, hasAllLanguages, iconOf, isArtwork, parseMygoConfig, pickMygoConfig, readmeImages, repoOfEntry, repoScreenshots, resolveImage, setCategory, submittedScreenshot } from './source.ts';

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

// Adds the app's icon and returns where it was taken from, so the screenshot search can pass over the same image.
async function addIcon(entry: Entry, slug: string, facts: RepoFacts): Promise<string | undefined> {
	if (entry.icon !== undefined) return void say('- Icon: kept the one submitted.');
	if (!facts.mygo) return void say('- Icon: none added, as the repository has no MyGo configuration (mygo.json or mygo.config.ts); the app shows a letter tile.');
	const src = iconOf(facts.mygo.path, facts.mygo.json, facts.paths);
	if (!src) return void say(`- Icon: none added, as neither \`${facts.mygo.path}\` nor resources/ beside it has one; the app shows a letter tile.`);
	if ('macOnly' in src) return void say(`- Icon: the app's only icon is \`${src.macOnly}\` (macos.icon), which cannot be converted here. Add a 256 px WebP to \`${PUBLIC}/icons/${slug}.webp\` by hand and set \`"icon": { "file": "${slug}.webp" }\`.`);
	const url = rawUrl(facts, src.path);
	const img = await downloadImage(url);
	if (!img) return void say(`- Icon: \`${src.path}\` could not be downloaded as a PNG, JPEG or WebP under 10 MB.`);
	if (await isDefaultIcon(img)) {
		say(`- Icon: none added, as \`${src.path}\` is MyGo's default icon (as \`mygo init\` leaves it); the app shows a letter tile.`);
		return url;
	}
	if (!(await writeIcon(img, join(ROOT, PUBLIC, 'icons', `${slug}.webp`)))) {
		say(`- Icon: \`${src.path}\` is smaller than 128 px, so none was added.`);
		return url;
	}
	entry.icon = { file: `${slug}.webp` };
	say(`- Icon: \`${src.path}\`, cut to its plate and saved as \`${PUBLIC}/icons/${slug}.webp\`. Check that it looks right.`);
	return url;
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
			const img = await downloadImage(url);
			const result = img ? await writeShot(img, join(ROOT, PUBLIC, 'shots', `${slug}.webp`)) : 'unreadable';
			if (result === 'ok') {
				entry.screenshot = `${slug}.webp`;
				const passed = skipped.length ? ` It passed over ${skipped.join(', ')}.` : '';
				return say(`- Screenshot: ${url} from ${source.from}, saved as \`${PUBLIC}/shots/${slug}.webp\`. Check that it shows the app.${passed}`);
			}
			skipped.push(`${url} (${result === 'square' ? 'square, likely a logo' : result === 'narrow' ? 'under 600 px wide' : result === 'portrait' ? 'taller than wide' : result === 'banner' ? 'a banner, far wider than a window' : 'not a PNG, JPEG or WebP under 10 MB'})`);
			if (++n >= source.tries) break;
		}
	}
	if (skipped.length) return say(`- Screenshot: none added. The images tried: ${skipped.join(', ')}.`);
	say(!facts ? '- Screenshot: none added.' : readme ? '- Screenshot: none added, as neither the README nor a screenshot folder in the repository has an image.' : '- Screenshot: none added, as the repository has neither a README nor a screenshot folder.');
}

// An app needs a category: without one it is the only app in the showcase's other group, which the catalog checks reject. The form leaves it optional, so the model picks one along with the copy.
async function addCopy(cfg: LlmConfig | undefined, kind: EntryKind, entry: Entry, facts: RepoFacts | undefined, examples: Entry[]): Promise<void> {
	const needsCategory = kind === 'app' && entry.category === undefined;
	if (hasAllLanguages(entry.summary) && (kind !== 'app' || hasAllLanguages(entry.description))) {
		say('- Copy: kept, as it is already in every site language.');
		if (needsCategory) say('- Category: none submitted, and none picked as the copy was kept. Add one before merging.');
		return;
	}
	if (!cfg) return say(`- Copy: left as submitted, as LLM_API_KEY is not set for this workflow.${needsCategory ? ' No category was picked either; add one before merging.' : ''}`);
	if (facts?.readme && facts.readme.text.length > README_LIMIT) say(`- The README is ${facts.readme.text.length} characters long; the copy was written from its first ${README_LIMIT}.`);
	try {
		const categories = needsCategory ? appCategories(JSON.parse(await readFile(join(ROOT, DATA_DIR, 'schema/app.schema.json'), 'utf8'))) : undefined;
		const copy = await writeCopy(cfg, { kind, entry, readme: facts?.readme?.text, mygoConfig: facts?.mygo ? { path: facts.mygo.path, text: facts.mygo.text } : undefined, examples, categories });
		entry.summary = copy.summary;
		if (kind === 'app' && copy.description) entry.description = copy.description;
		say(`- Copy: written by ${cfg.model} in all five languages from the submission${facts?.readme ? ' and the README' : ''}. Read it before merging.`);
		if (copy.category) {
			setCategory(entry, copy.category);
			say(`- Category: ${copy.category}, picked by the model as the submission named none. Check it.`);
		} else if (needsCategory) say(`- Category: none submitted, and the model's pick${copy.badCategory ? ` (${copy.badCategory})` : ''} is not one the schema allows. Add one before merging.`);
		if (copy.notes) say(`- Model's notes: ${copy.notes.replace(/\s+/g, ' ')}`);
		if (copy.tooLong.length) say(`- Still longer than the hand-written examples after one rewrite (length/limit): ${copy.tooLong.join(', ')}. Shorten before merging.`);
	} catch (err) {
		say(`- Copy: left as submitted, as writing it failed: ${err instanceof Error ? err.message : String(err)}${needsCategory ? '. No category was picked either; add one before merging.' : ''}`);
	}
}

// Fills in one added entry, in place: for an app its name, icon and screenshot from its repository, and for every kind the copy.
// submitted is the screenshot link from the site's form, for an app.
async function complete(cfg: LlmConfig | undefined, kind: EntryKind, where: string, entry: Entry, examples: Entry[], submitted?: string): Promise<void> {
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
	}
	await addCopy(cfg, kind, entry, facts, examples);
}

const json = (v: unknown) => `${JSON.stringify(v, null, '\t')}\n`;

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
	for (const { kind, dir, known, names } of added) {
		const read = async (name: string) => JSON.parse(await readFile(join(ROOT, dir, name), 'utf8')) as Entry;
		// The voice to match: for apps the hand-written ones, for the rest the two entries added last before this branch.
		const examples = kind === 'app' ? await Promise.all(EXAMPLE_APPS.map((slug) => read(`${slug}.json`))) : (await Promise.all(known.map(read))).sort((a, b) => String(a.added ?? '').localeCompare(String(b.added ?? ''))).slice(-2);
		for (const name of names) {
			const entry = await read(name);
			await complete(cfg, kind, `${dir}/${name}`, entry, examples, kind === 'app' ? submitted : undefined);
			await writeFile(join(ROOT, dir, name), json(entry));
		}
	}

	const text = report.length ? report.join('\n') : 'The branch adds no entry this workflow completes.';
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${text}\n`);
	console.log(text);
}

await main();
