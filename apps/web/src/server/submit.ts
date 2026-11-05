import { CatalogError, DATA_DIR, SITE_REPO, SITE_URL, SUBMIT_LABELS, type SubmitCat, alreadyListed, codeFence, entryFileText, entryPath, slugify } from '@awesome-mygo/catalog';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/core';

// Submissions from visitors without a GitHub account: the site's GitHub App adds the entry's file on a new branch and opens a pull request, which CI checks and a maintainer merges.

const [OWNER, REPO] = SITE_REPO.replace('https://github.com/', '').split('/');
const BASE = 'main';
const BRANCH_PREFIX = 'submit/';
// Past this many open submissions the bot stops opening more, so a flood cannot bury the repository.
const MAX_OPEN = 20;

export interface BotConfig {
	appId: string;
	privateKey: string;
	siteKey: string;
	turnstileSecret: string;
}

// Raised when too many submissions are waiting for review.
export class SubmissionsBusy extends Error {}

let cached: { appId: string; octokit: Octokit } | undefined;

// An Octokit acting as the app's installation on this repository; the app token is looked up once per isolate and refreshed by auth-app.
async function installation(cfg: BotConfig): Promise<Octokit> {
	if (cached?.appId === cfg.appId) return cached.octokit;
	const auth = { appId: cfg.appId, privateKey: cfg.privateKey };
	const app = new Octokit({ authStrategy: createAppAuth, auth });
	const { data } = await app.request('GET /repos/{owner}/{repo}/installation', { owner: OWNER, repo: REPO });
	const octokit = new Octokit({ authStrategy: createAppAuth, auth: { ...auth, installationId: data.id } });
	cached = { appId: cfg.appId, octokit };
	return octokit;
}

function toBase64(text: string): string {
	let bin = '';
	for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
	return btoa(bin);
}

// Whether path exists at ref on the repository; GitHub answers 404 when it does not.
async function fileExists(gh: Octokit, path: string, ref: string): Promise<boolean> {
	try {
		await gh.request('GET /repos/{owner}/{repo}/contents/{path}', { owner: OWNER, repo: REPO, path, ref });
		return true;
	} catch (err) {
		if ((err as { status?: number }).status === 404) return false;
		throw err;
	}
}

export async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
	const body = new URLSearchParams({ secret, response: token });
	if (ip) body.set('remoteip', ip);
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
	if (!res.ok) return false;
	const data = (await res.json()) as { success?: boolean };
	return data.success === true;
}

// The marker the submission workflow reads an app's screenshot link from (packages/enrich, submittedScreenshot). The link has passed isBadShot, so it holds no space, quote, backtick or angle bracket and cannot end the comment.
const shotMarker = (url: string) => `<!-- submitted-screenshot: ${url} -->`;

// Opens the pull request and returns it. Throws a CatalogError when the entry is already listed or would not pass its file's check, and SubmissionsBusy when too many are open. screenshot is an app's screenshot link from the form, which is not part of the entry: the pull request carries it for the submission workflow.
export async function openSubmission(cfg: BotConfig, cat: SubmitCat, name: string, entry: Record<string, unknown>, screenshot?: string): Promise<{ url: string; number: number }> {
	const gh = await installation(cfg);
	const repo = { owner: OWNER, repo: REPO };

	const { data: open } = await gh.request('GET /repos/{owner}/{repo}/pulls', { ...repo, state: 'open', per_page: 100 });
	if (open.filter((p) => p.head.ref.startsWith(BRANCH_PREFIX)).length >= MAX_OPEN) throw new SubmissionsBusy();

	const label = SUBMIT_LABELS[cat];
	const file = entryPath(cat, entry);
	const path = `${DATA_DIR}/${file}`;
	const { data: ref } = await gh.request('GET /repos/{owner}/{repo}/git/ref/{ref}', { ...repo, ref: `heads/${BASE}` });
	// Every entry is a new file of its own, so it only has to be new: no file of its slug on main, and nothing the site lists already under the field its category keeps unique.
	if (await fileExists(gh, path, ref.object.sha)) throw new CatalogError(`${file}: an entry with this slug is already listed`);
	const listed = alreadyListed(cat, entry);
	if (listed) throw new CatalogError(`${file}: the site already lists it, as ${listed}`);
	const next = entryFileText(cat, entry);

	// '@' is dropped from the title so a name cannot mention anyone.
	const plainName = name.replace(/@/g, '');
	const branch = `${BRANCH_PREFIX}${cat}-${slugify(plainName)}-${crypto.randomUUID().slice(0, 8)}`;
	await gh.request('POST /repos/{owner}/{repo}/git/refs', { ...repo, ref: `refs/heads/${branch}`, sha: ref.object.sha });
	try {
		await gh.request('PUT /repos/{owner}/{repo}/contents/{path}', { ...repo, path, branch, message: `feat(catalog): add ${plainName}`, content: toBase64(next) });
		const body = [
			`Submitted through the form on ${SITE_URL} by a visitor without a GitHub account, so the site's bot opened this pull request.`,
			`Category: ${label} (\`${path}\`)`,
			codeFence(JSON.stringify(entry, null, 2), 'json'),
			// In a code span, so the visitor's link does not become a link here; the workflow downloads it and the report says whether it was used.
			...(screenshot ? [`Screenshot from the form: \`${screenshot}\`\n${shotMarker(screenshot)}`] : []),
			'The entry passed the catalog checks before it was submitted, and CI runs them again. The *Complete submission* workflow then adds what the form cannot ask for (an app\'s icon, its screenshot from the form\'s link or the project\'s repository, and the copy in every site language) and comments what it did. Before merging, check that the project exists and is built with MyGo, read the generated copy, and fill in what the form leaves at a default (such as `tag`, `tags` or `surface`).',
		].join('\n\n');
		const { data: pr } = await gh.request('POST /repos/{owner}/{repo}/pulls', { ...repo, title: `Add ${plainName} (${label})`, head: branch, base: BASE, body });
		return { url: pr.html_url, number: pr.number };
	} catch (err) {
		// Leave no branch behind when the pull request could not be opened; the original error is the one worth reporting.
		await gh.request('DELETE /repos/{owner}/{repo}/git/refs/{ref}', { ...repo, ref: `heads/${branch}` }).catch(() => undefined);
		throw err;
	}
}
