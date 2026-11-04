import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DEFAULT_MODEL, README_LIMIT, type LlmConfig, writeCopy } from './copy.ts';
import { downloadImage, writeIcon, writeShot } from './image.ts';
import { DATA_FILES, type DataFile, type Entry, addedEntries, appNameFrom, hasAllLanguages, iconPathOf, pickMygoJson, readmeImages, repoOfEntry, resolveImage, setShowcaseCount } from './source.ts';

// Run by .github/workflows/enrich-submission.yml on a pull request the submission bot opened. It finds the entries the branch adds, then for each fills in what the form cannot ask for: an app's icon (from its mygo.json) and screenshot (the first one in its README), the copy in every site language, and the README app counts. It changes files in the working tree and writes a Markdown report for the pull request; the workflow runs the catalog checks and commits.
//
// Environment: BASE_REF (the branch the entries are compared with, default origin/main), REPORT_FILE (where the report goes), GITHUB_TOKEN (for the GitHub API), and LLM_API_KEY with optional LLM_BASE_URL and LLM_MODEL for the copy; without LLM_API_KEY the copy is left as submitted.

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = 'packages/catalog/data';
const PUBLIC = 'apps/web/public';
const READMES = ['README.md', 'README.zh-CN.md', 'README.zh-TW.md', 'README.ja.md', 'README.ko.md'];
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

async function addIcon(entry: Entry, slug: string, facts: RepoFacts): Promise<void> {
	if (entry.icon !== undefined) return say('- Icon: kept the one submitted.');
	if (!facts.mygo) return say('- Icon: none added, as the repository has no mygo.json; the app shows a letter tile.');
	const path = iconPathOf(facts.mygo.path, facts.mygo.json);
	if (!path) return say(`- Icon: none added. \`${facts.mygo.path}\` names no PNG, JPEG or WebP icon, so the app uses MyGo's default icon (as \`mygo init\` leaves it) and shows a letter tile here.`);
	const url = `https://raw.githubusercontent.com/${facts.repo}/${facts.branch}/${path.split('/').map(encodeURIComponent).join('/')}`;
	const img = await downloadImage(url);
	if (!img) return say(`- Icon: \`${path}\` from mygo.json could not be downloaded as a PNG, JPEG or WebP under 10 MB.`);
	if (!(await writeIcon(img, join(ROOT, PUBLIC, 'icons', `${slug}.webp`)))) return say(`- Icon: \`${path}\` is smaller than 128 px, so none was added.`);
	entry.icon = { file: `${slug}.webp` };
	say(`- Icon: \`${path}\` (named in \`${facts.mygo.path}\`), cut to its plate and saved as \`${PUBLIC}/icons/${slug}.webp\`. Check that it looks right.`);
}

async function addScreenshot(entry: Entry, slug: string, facts: RepoFacts): Promise<void> {
	if (entry.screenshot !== undefined) return say('- Screenshot: kept the one submitted.');
	if (!facts.readme) return say('- Screenshot: none added, as the repository has no README.');
	const tried: string[] = [];
	for (const src of readmeImages(facts.readme.text)) {
		const url = resolveImage(src, facts.repo, facts.branch, facts.readme.path);
		if (!url || tried.includes(url)) continue;
		tried.push(url);
		const img = await downloadImage(url);
		if (img && (await writeShot(img, join(ROOT, PUBLIC, 'shots', `${slug}.webp`)))) {
			entry.screenshot = `${slug}.webp`;
			return say(`- Screenshot: the first one in the README (${url}), saved as \`${PUBLIC}/shots/${slug}.webp\`. Check that it shows the app.`);
		}
		if (tried.length >= 8) break;
	}
	say(tried.length ? `- Screenshot: none of the README's first ${tried.length} images is a PNG, JPEG or WebP at least 600 px wide.` : '- Screenshot: the README has no image.');
}

async function addCopy(cfg: LlmConfig | undefined, file: DataFile, entry: Entry, facts: RepoFacts | undefined, examples: Entry[]): Promise<void> {
	if (hasAllLanguages(entry.summary) && (!DATA_FILES[file].description || hasAllLanguages(entry.description))) return say('- Copy: kept, as it is already in every site language.');
	if (!cfg) return say('- Copy: left as submitted, as LLM_API_KEY is not set for this workflow.');
	if (facts?.readme && facts.readme.text.length > README_LIMIT) say(`- The README is ${facts.readme.text.length} characters long; the copy was written from its first ${README_LIMIT}.`);
	try {
		const copy = await writeCopy(cfg, { file, entry, readme: facts?.readme?.text, mygoJson: facts?.mygo?.text, examples });
		entry.summary = copy.summary;
		if (DATA_FILES[file].description && copy.description) entry.description = copy.description;
		say(`- Copy: written by ${cfg.model} in all five languages from the submission${facts?.readme ? ' and the README' : ''}. Read it before merging.`);
		if (copy.notes) say(`- Model's notes: ${copy.notes.replace(/\s+/g, ' ')}`);
	} catch (err) {
		say(`- Copy: left as submitted, as writing it failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

async function main(): Promise<void> {
	const cfg: LlmConfig | undefined = env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL || undefined, model: env.LLM_MODEL || DEFAULT_MODEL } : undefined;
	let appsAdded = false;
	let appCount = 0;

	for (const file of Object.keys(DATA_FILES) as DataFile[]) {
		const { list } = DATA_FILES[file];
		const path = join(ROOT, DATA_DIR, file);
		const head = JSON.parse(await readFile(path, 'utf8')) as Record<string, Entry[]>;
		const { stdout } = await run('git', ['show', `${BASE_REF}:${DATA_DIR}/${file}`], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
		const base = JSON.parse(stdout) as Record<string, Entry[]>;
		const added = addedEntries(base[list] ?? [], head[list]);
		if (file === 'apps.json') appCount = head[list].length;
		if (!added.length) continue;
		const examples = file === 'apps.json' ? head[list].filter((e) => EXAMPLE_APPS.includes(String(e.slug))) : (base[list] ?? []).slice(-2);

		for (const i of added) {
			const entry = head[list][i];
			const name = String(entry.name ?? entry.slug ?? '?');
			say(`### ${name} (\`${DATA_DIR}/${file}\`)`);
			const repo = repoOfEntry(entry);
			const facts = repo ? await repoFacts(repo) : undefined;
			if (!repo) say('- No GitHub repository in the entry, so nothing was taken from one.');
			else if (!facts) say(`- The repository ${repo} could not be found.`);
			if (file === 'apps.json') {
				appsAdded = true;
				const slug = String(entry.slug);
				const better = facts?.mygo ? appNameFrom(String(entry.name), facts.mygo.json) : undefined;
				if (better) {
					say(`- Name: ${better}, as \`${facts?.mygo?.path}\` spells it (submitted as ${String(entry.name)}).`);
					entry.name = better;
				}
				if (facts) {
					await addIcon(entry, slug, facts);
					await addScreenshot(entry, slug, facts);
				}
			}
			await addCopy(cfg, file, entry, facts, examples);
		}
		await writeFile(path, `${JSON.stringify(head, null, '\t')}\n`);
	}

	if (appsAdded) {
		for (const name of READMES) {
			const p = join(ROOT, name);
			const next = setShowcaseCount(await readFile(p, 'utf8'), appCount);
			if (next === undefined) say(`- \`${name}\` has no showcase count line to update.`);
			else await writeFile(p, next);
		}
		say(`- README app counts set to ${appCount}.`);
	}

	const text = report.length ? report.join('\n') : 'The branch adds no entry this workflow completes.';
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${text}\n`);
	console.log(text);
}

await main();
