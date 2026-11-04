import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { sniffImage } from './source.ts';

// Icons and screenshots as the site keeps them: a 256 px WebP icon filling its square, and a WebP screenshot at most 1200 px wide. ImageMagick does the work; the runner has it, so the bot needs no image library.

const run = promisify(execFile);
const MAX_BYTES = 10 * 1024 * 1024;
const ICON_MIN = 128;
const SHOT_MIN_WIDTH = 600;

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

export interface Downloaded {
	bytes: Uint8Array;
	format: 'png' | 'jpeg' | 'webp';
}

// The file at url when it is a PNG, JPEG or WebP no larger than 10 MB, judged by its bytes; undefined otherwise.
export async function downloadImage(url: string): Promise<Downloaded | undefined> {
	const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
	if (!res.ok) return undefined;
	if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return undefined;
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (bytes.length > MAX_BYTES) return undefined;
	const format = sniffImage(bytes);
	return format ? { bytes, format } : undefined;
}

// Runs fn on the image written to a temporary file, named with its real format so ImageMagick reads it as nothing else.
async function withInput<T>(img: Downloaded, fn: (input: string) => Promise<T>): Promise<T> {
	const dir = await mkdtemp(join(tmpdir(), 'enrich-'));
	try {
		const file = join(dir, `in.${img.format}`);
		await writeFile(file, img.bytes);
		return await fn(`${img.format}:${file}[0]`);
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
		const box = await magick([input, '-alpha', 'extract', '-threshold', '50%', '-format', '%@', 'info:']);
		const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(box);
		const side = m ? Math.max(Number(m[1]), Number(m[2])) : Math.max(w, h);
		if (side < ICON_MIN) return false;
		await magick([input, ...(m ? ['-crop', box, '+repage'] : []), '-background', 'none', '-gravity', 'center', '-extent', `${side}x${side}`, '-resize', '256x256', '-strip', '-quality', '90', '-define', 'webp:method=6', `webp:${out}`]);
		return true;
	});
}

// Writes the screenshot to out as WebP, scaled down to 1200 px wide when larger. Returns false for an image too narrow to be a screenshot of a desktop app (an icon or a logo in the README).
export async function writeShot(img: Downloaded, out: string): Promise<boolean> {
	return withInput(img, async (input) => {
		const [w] = (await size(input)).split(' ').map(Number);
		if (w < SHOT_MIN_WIDTH) return false;
		await magick([input, '-resize', '1200x>', '-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`]);
		return true;
	});
}
