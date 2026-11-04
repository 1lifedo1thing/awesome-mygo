import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DEFAULT_MODEL, README_LIMIT, type LlmConfig, writeCopy } from './copy.ts';
import { downloadImage, isDefaultIcon, writeIcon, writeShot } from './image.ts';
import { APP_DIR, DATA_FILES, type DataFile, type Entry, type EntryKind, addedAppFiles, addedEntries, appCategories, appNameFrom, hasAllLanguages, iconOf, pickMygoJson, readmeImages, repoOfEntry, resolveImage, setCategory } from './source.ts';

// Run by .github/workflows/enrich-submission.yml on a pull request the submission bot opened. It finds the entries the branch adds, then for each fills in what the form cannot ask for: an app's icon (from its mygo.json) and screenshot (the first landscape one in its README), its category when the submission names none, and the copy in every site language. It changes files in the working tree and writes a Markdown report for the pull request; the workflow runs the catalog checks and commits.
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

async function github<T>(path: string): Promise<T | undefined> {
	const res = await fetch(`https://api.github.com${path}`, {
		headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) },
		signal: AbortSignal.timeout(30_000),
	});
	if (res.status === 404) return undefined;
	if (!res.ok) throw new Error(`GitHub ${path}: ${res.status}`);
	return (await res.json()) as T;
}

async function rawFile(repo: string, branch: string, path: string): Promise<string | undefined> {
	const res = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`, { signal: AbortSignal.timeout(30_000) });
	return res.ok ? res.text() : undefined;
}

interface RepoFacts {
	repo: string;
	branch: string;
	paths: string[];
	readme?: { path: string; text: string };
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
	const mygoPath = pickMygoJson(paths);
	if (mygoPath) {
		const text = await rawFile(repo, branch, mygoPath);
		if (text !== undefined) {
			try {
				facts.mygo = { path: mygoPath, text, json: JSON.parse(text) };
			} catch {
				say(`- \`${mygoPath}\` is not valid JSON, so its icon could not be read.`);
			}
		}
	}
	return facts;
}

const rawUrl = (facts: RepoFacts, path: string) => `https://raw.githubusercontent.com/${facts.repo}/${facts.branch}/${path.split('/').map(encodeURIComponent).join('/')}`;

// Adds the app's icon and returns where it was taken from, so the screenshot search can pass over the same image.
async function addIcon(entry: Entry, slug: string, facts: RepoFacts): Promise<string | undefined> {
	if (entry.icon !== undefined) return void say('- Icon: kept the one submitted.');
	if (!facts.mygo) return void say('- Icon: none added, as the repository has no mygo.json; the app shows a letter tile.');
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

async function addScreenshot(entry: Entry, slug: string, facts: RepoFacts, iconUrl: string | undefined): Promise<void> {
	if (entry.screenshot !== undefined) return say('- Screenshot: kept the one submitted.');
	if (!facts.readme) return say('- Screenshot: none added, as the repository has no README.');
	const tried: string[] = [];
	const skipped: string[] = [];
	for (const src of readmeImages(facts.readme.text)) {
		const url = resolveImage(src, facts.repo, facts.branch, facts.readme.path);
		if (!url || tried.includes(url)) continue;
		tried.push(url);
		if (url === iconUrl) {
			skipped.push(`${url} (the app icon)`);
			continue;
		}
		const img = await downloadImage(url);
		const result = img ? await writeShot(img, join(ROOT, PUBLIC, 'shots', `${slug}.webp`)) : 'unreadable';
		if (result === 'ok') {
			entry.screenshot = `${slug}.webp`;
			const passed = skipped.length ? ` It passed over ${skipped.join(', ')}.` : '';
			return say(`- Screenshot: ${url} from the README, saved as \`${PUBLIC}/shots/${slug}.webp\`. Check that it shows the app.${passed}`);
		}
		skipped.push(`${url} (${result === 'square' ? 'square, likely a logo' : result === 'narrow' ? 'under 600 px wide' : result === 'portrait' ? 'taller than wide' : 'not a PNG, JPEG or WebP under 10 MB'})`);
		if (tried.length >= 8) break;
	}
	say(skipped.length ? `- Screenshot: none added. The README's images: ${skipped.join(', ')}.` : '- Screenshot: the README has no image.');
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
		const copy = await writeCopy(cfg, { kind, entry, readme: facts?.readme?.text, mygoJson: facts?.mygo?.text, examples, categories });
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
async function complete(cfg: LlmConfig | undefined, kind: EntryKind, where: string, entry: Entry, examples: Entry[]): Promise<void> {
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
		if (facts) {
			const iconUrl = await addIcon(entry, slug, facts);
			await addScreenshot(entry, slug, facts, iconUrl);
		}
	}
	await addCopy(cfg, kind, entry, facts, examples);
}

const json = (v: unknown) => `${JSON.stringify(v, null, '\t')}\n`;

async function main(): Promise<void> {
	const cfg: LlmConfig | undefined = env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL || undefined, model: env.LLM_MODEL || DEFAULT_MODEL } : undefined;

	// Apps: the files in data/apps/ that the base branch does not have.
	const appDir = `${DATA_DIR}/${APP_DIR}`;
	const { stdout: listed } = await run('git', ['ls-tree', '--name-only', `${BASE_REF}:${appDir}`], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 });
	const newApps = addedAppFiles(listed.split('\n'), await readdir(join(ROOT, appDir)));
	if (newApps.length) {
		const examples = await Promise.all(EXAMPLE_APPS.map(async (slug) => JSON.parse(await readFile(join(ROOT, appDir, `${slug}.json`), 'utf8')) as Entry));
		for (const name of newApps) {
			const path = join(ROOT, appDir, name);
			const entry = JSON.parse(await readFile(path, 'utf8')) as Entry;
			await complete(cfg, 'app', `${appDir}/${name}`, entry, examples);
			await writeFile(path, json(entry));
		}
	}

	// The other categories: the entries a list file gains.
	for (const file of Object.keys(DATA_FILES) as DataFile[]) {
		const { list } = DATA_FILES[file];
		const path = join(ROOT, DATA_DIR, file);
		const head = JSON.parse(await readFile(path, 'utf8')) as Record<string, Entry[]>;
		const { stdout } = await run('git', ['show', `${BASE_REF}:${DATA_DIR}/${file}`], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
		const base = JSON.parse(stdout) as Record<string, Entry[]>;
		const added = addedEntries(base[list] ?? [], head[list]);
		if (!added.length) continue;
		const examples = (base[list] ?? []).slice(-2);
		for (const i of added) await complete(cfg, file, `${DATA_DIR}/${file}`, head[list][i], examples);
		await writeFile(path, json(head));
	}

	const text = report.length ? report.join('\n') : 'The branch adds no entry this workflow completes.';
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${text}\n`);
	console.log(text);
}

await main();
