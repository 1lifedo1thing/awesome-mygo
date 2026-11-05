import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { iconCut, shotProblem, sniffImage } from './source.ts';

// Icons and screenshots as the site keeps them: a 256 px WebP icon filling its square, and a WebP screenshot at most 1200 px wide. ImageMagick does the work; the runner has it, so the bot needs no image library.

const run = promisify(execFile);
const MAX_BYTES = 10 * 1024 * 1024;
const ICON_MIN = 128;

// ImageMagick 7 is `magick`; the Ubuntu runners ship 6, where the same work is `convert`.
let im: Promise<string> | undefined;
function imageMagick(): Promise<string> {
	im ??= run('magick', ['-version']).then(
		() => 'magick',
		() => 'convert',
	);
	return im;
}

async function magick(args: string[]): Promise<string> {
	const { stdout } = await run(await imageMagick(), args, { timeout: 60_000, maxBuffer: 1024 * 1024 });
	return stdout.trim();
}

// The normalized root mean square difference of two images of the same size, 0 for identical. `compare` reports it on stderr and exits 1 when the images differ, which is an answer here, not a failure.
async function rmse(a: string, b: string): Promise<number> {
	const [cmd, args] = (await imageMagick()) === 'magick' ? ['magick', ['compare']] : ['compare', []];
	let stderr: string;
	try {
		({ stderr } = await run(cmd, [...args, '-metric', 'RMSE', a, b, 'null:'], { timeout: 60_000 }));
	} catch (err) {
		const e = err as { code?: unknown; stderr?: string };
		if (e.code !== 1 || typeof e.stderr !== 'string') throw err;
		stderr = e.stderr;
	}
	const m = /\(([\d.e+-]+)\)/.exec(stderr);
	if (!m) throw new Error(`compare printed no difference: ${stderr.trim()}`);
	return Number(m[1]);
}

// MyGo's default app icon, which `mygo init` draws into resources/icon.png, scaled to 64 px. Compared by pixels rather than bytes, so a MyGo release that encodes it differently is still recognised.
const DEFAULT_ICON = fileURLToPath(new URL('./mygo-default-icon-64.png', import.meta.url));

// Whether the icon is MyGo's default one: an app that kept it is shown with a letter tile on the site.
export async function isDefaultIcon(img: Downloaded): Promise<boolean> {
	return withInput(img, async (input, dir) => {
		const small = join(dir, 'small.png');
		await magick([input, '-resize', '64x64!', '-strip', `png:${small}`]);
		return (await rmse(small, DEFAULT_ICON)) < 0.02;
	});
}

export interface Downloaded {
	bytes: Uint8Array;
	format: 'png' | 'jpeg' | 'webp';
}

// The file at url when it is a PNG, JPEG or WebP no larger than 10 MB, judged by its bytes; undefined otherwise.
export async function downloadImage(url: string): Promise<Downloaded | undefined> {
	const img = await fetchImage(url);
	return typeof img === 'string' ? undefined : img;
}

// An image, or why it could not be had, for the report. A server that asks to be asked again within a minute (429 with Retry-After, as GitHub's social preview cards do) is, once.
export async function fetchImage(url: string): Promise<Downloaded | string> {
	let res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
	const wait = Number(res.headers.get('retry-after'));
	if (res.status === 429 && wait > 0 && wait <= 60) {
		await new Promise((r) => setTimeout(r, wait * 1000));
		res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
	}
	if (!res.ok) return `HTTP ${res.status}`;
	if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return 'over 10 MB';
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (bytes.length > MAX_BYTES) return 'over 10 MB';
	const format = sniffImage(bytes);
	return format ? { bytes, format } : 'not a PNG, JPEG or WebP';
}

// The fonts a drawn card's text can use, the first that exists: DejaVu on the Ubuntu runners, Helvetica or Arial on a Mac.
const CARD_FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf'];

// A screenshot of last resort, drawn here when a project has no image of its own and GitHub's card cannot be had: the owner's avatar over owner/name on a dark ground, at the size of a social preview (1200 × 630), so a card on the site is never blank. Without any of the fonts the label is left out.
export async function writeCard(avatar: Downloaded, label: string, out: string): Promise<void> {
	const font = CARD_FONTS.find((f) => existsSync(f));
	await withInput(avatar, (input) =>
		magick([
			'-size', '1200x630', 'xc:#0b1220',
			'(', input, '-resize', '240x240^', '-gravity', 'center', '-extent', '240x240', ')',
			'-gravity', 'center', '-geometry', '+0-50', '-composite',
			...(font ? ['-font', font, '-fill', '#e6edf3', '-pointsize', '46', '-gravity', 'center', '-annotate', '+0+140', label] : []),
			'-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`,
		]),
	);
}

// Runs fn on the image written to a temporary file, named with its real format so ImageMagick reads it as nothing else, in a directory fn may also write to.
async function withInput<T>(img: Downloaded, fn: (input: string, dir: string) => Promise<T>): Promise<T> {
	const dir = await mkdtemp(join(tmpdir(), 'enrich-'));
	try {
		const file = join(dir, `in.${img.format}`);
		await writeFile(file, img.bytes);
		return await fn(`${img.format}:${file}[0]`, dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

const size = (input: string) => magick(['-ping', input, '-format', '%w %h', 'info:']);

// Writes the icon to out as the site's 256 px WebP. A macOS icon sits on a plate inside transparent margins with a faint shadow; the box around its mostly opaque pixels is that plate, so the icon is cut to it and centred on a square, as the official icons in apps/web/public/icons are. Returns false for an icon too small to use.
export async function writeIcon(img: Downloaded, out: string): Promise<boolean> {
	return withInput(img, async (input) => {
		const [w, h] = (await size(input)).split(' ').map(Number);
		if (Math.min(w, h) < ICON_MIN) return false;
		const { crop, side } = iconCut(await magick([input, '-alpha', 'extract', '-threshold', '50%', '-format', '%@', 'info:']), w, h);
		if (side < ICON_MIN) return false;
		await magick([input, ...(crop ? ['-crop', crop, '+repage'] : []), '-background', 'none', '-gravity', 'center', '-extent', `${side}x${side}`, '-resize', '256x256', '-strip', '-quality', '90', '-define', 'webp:method=6', `webp:${out}`]);
		return true;
	});
}

// Writes the screenshot to out as WebP, scaled down to 1200 px wide when larger, and says 'ok'. An image too narrow to be a screenshot of a desktop app, a square one (an icon or a logo at the top of the README) or a portrait one (a tray panel) is not written: 'narrow', 'square' or 'portrait' says why.
export async function writeShot(img: Downloaded, out: string): Promise<'ok' | 'narrow' | 'square' | 'portrait' | 'banner'> {
	return withInput(img, async (input) => {
		const [w, h] = (await size(input)).split(' ').map(Number);
		const problem = shotProblem(w, h);
		if (problem) return problem;
		await magick([input, '-resize', '1200x>', '-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`]);
		return 'ok';
	});
}
