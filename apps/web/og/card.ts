// The share card of an app's page: a 1200×630 PNG with the app's icon, name, author and screenshot, which link previews (X, Slack, Discord, Telegram, Facebook, LinkedIn…) show in place of the raw screenshot, whose height they would crop. One card serves all five languages, so it carries no copy of its own: the localized title and description sit next to it in the preview.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { App } from '@awesome-mygo/catalog';
import { type CSSProperties, type ReactNode, createElement } from 'react';
import satori, { type Font, type FontWeight } from 'satori';
import sharp from 'sharp';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

// The original look's palette (src/styles.css :root).
const C = { bg: '#0b0d10', panel: '#12161b', bar: '#171c22', line2: '#252c35', line3: '#313a45', fg: '#eef2f5', fg2: '#a3afba', fg3: '#7e8b97', cyan: '#3fd3f5' };

const PAD = 64;
const LEFT_W = 456;
// The screenshot well: the right column's width, at the 1.6 aspect most screenshots have, so cropping removes little.
const SHOT_W = 576;
const SHOT_H = 360;
const ICON = 112;

interface Paths {
	// The site's public/ directory, which holds /shots/, /icons/ and the site icon.
	publicDir: string;
	// apps/web/og/fonts.
	fontDir: string;
}

const h = (type: string, style: CSSProperties, ...children: ReactNode[]) => createElement(type, { style }, ...children);
const img = (src: string, width: number, height: number, style: CSSProperties = {}) => createElement('img', { src, width, height, style });

const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;

// Satori only reads PNG, JPEG and GIF, while the screenshots and icons are WebP (and one screenshot SVG), so every image goes through sharp first, at twice its displayed size for sharpness.
async function asPng(input: Buffer, width: number, height: number): Promise<string> {
	return dataUri(await sharp(input, { density: 144 }).resize(width * 2, height * 2, { fit: 'cover', position: 'top' }).png().toBuffer());
}

// An image under public/ (a path such as /shots/x.webp) or on the ai-logo CDN.
async function imageBytes(src: string, publicDir: string, slug: string): Promise<Buffer> {
	if (src.startsWith('/')) return readFile(join(publicDir, src));
	const res = await fetch(src);
	if (!res.ok) throw new Error(`share card for ${slug}: ${src} answered ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

// ---- fonts ----

let latin: Promise<Font[]> | undefined;
function latinFonts(fontDir: string): Promise<Font[]> {
	latin ??= Promise.all([
		readFile(join(fontDir, 'bricolage-grotesque-800.ttf')).then((data): Font => ({ name: 'Bricolage Grotesque', data, weight: 800 })),
		readFile(join(fontDir, 'bricolage-grotesque-500.ttf')).then((data): Font => ({ name: 'Bricolage Grotesque', data, weight: 500 })),
		readFile(join(fontDir, 'jetbrains-mono-700.ttf')).then((data): Font => ({ name: 'JetBrains Mono', data, weight: 700 })),
	]);
	return latin;
}

// The bundled fonts cover Latin only. Text in another script (an app named 留白, an author with a Korean name) is set in the matching Noto family, fetched from Google Fonts subset to just the characters on the card, as the full CJK fonts are about 10 MB a weight. Satori files every Han character under ja-JP, so the family is picked from the characters themselves.
const NOTO: Record<string, string> = {
	'ko-KR': 'Noto Sans KR',
	'zh-TW': 'Noto Sans TC',
	'zh-HK': 'Noto Sans TC',
	'th-TH': 'Noto Sans Thai',
	'bn-IN': 'Noto Sans Bengali',
	'ar-AR': 'Noto Sans Arabic',
	'ta-IN': 'Noto Sans Tamil',
	'ml-IN': 'Noto Sans Malayalam',
	'he-IL': 'Noto Sans Hebrew',
	'te-IN': 'Noto Sans Telugu',
	devanagari: 'Noto Sans Devanagari',
	kannada: 'Noto Sans Kannada',
	symbol: 'Noto Sans Symbols 2',
	math: 'Noto Sans Math',
};

function notoFamily(code: string, segment: string): string {
	if (code === 'ko-KR' || /\p{scx=Hangul}/u.test(segment)) return 'Noto Sans KR';
	if (/\p{scx=Hira}|\p{scx=Kana}/u.test(segment)) return 'Noto Sans JP';
	if (code === 'ja-JP' || code === 'zh-CN' || /\p{scx=Han}/u.test(segment)) return NOTO[code] ?? 'Noto Sans SC';
	return NOTO[code] ?? 'Noto Sans';
}

// Google Fonts answers a client that is not a browser with TrueType, the format satori reads.
async function googleFont(family: string, weight: FontWeight, text: string): Promise<ArrayBuffer | undefined> {
	const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@${weight}&text=${encodeURIComponent(text)}`);
	if (!css.ok) return undefined;
	const url = (await css.text()).match(/src: url\((.+?)\)/)?.[1];
	if (!url) return undefined;
	const font = await fetch(url);
	if (!font.ok) throw new Error(`share card font ${family} ${weight}: ${url} answered ${font.status}`);
	return font.arrayBuffer();
}

// Each weight the card sets text in. A family without that weight (most Noto families outside CJK stop short of 800) falls back to its regular face.
const WEIGHTS: FontWeight[] = [800, 500];

const extra = new Map<string, Promise<Font[]>>();
function extraFonts(code: string, segment: string): Promise<Font[]> {
	const key = `${code}\n${segment}`;
	let fonts = extra.get(key);
	if (!fonts) extra.set(key, (fonts = fetchExtraFonts(code, segment)));
	return fonts;
}

async function fetchExtraFonts(code: string, segment: string): Promise<Font[]> {
	// Colour emoji need SVG glyph images rather than a font; an emoji in a name is left out of the card.
	if (code === 'emoji') return [];
	const family = notoFamily(code, segment);
	return Promise.all(
		WEIGHTS.map(async (weight): Promise<Font> => {
			const data = (await googleFont(family, weight, segment)) ?? (await googleFont(family, 400, segment));
			if (!data) throw new Error(`share card: Google Fonts has no ${family} for ${JSON.stringify(segment)}`);
			return { name: family, data, weight };
		}),
	);
}

// ---- layout ----

// Long names step down so that two lines hold any name in the catalog.
function nameSize(name: string): number {
	// A CJK character is about twice as wide as a Latin one.
	const len = [...name].reduce((n, ch) => n + (/[⺀-￯]/u.test(ch) ? 2 : 1), 0);
	if (len <= 8) return 88;
	if (len <= 12) return 72;
	if (len <= 16) return 60;
	return 52;
}

function hostOf(url: string): string {
	return new URL(url).host.replace(/^www\./, '');
}

function letterTile(name: string, size: number): ReactNode {
	return h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: size * 0.22, background: C.cyan, color: C.bg, fontSize: size * 0.5, fontWeight: 800 }, name.charAt(0).toUpperCase());
}

function iconNode(icon: string | undefined, name: string, size: number): ReactNode {
	return icon ? img(icon, size, size, { borderRadius: size * 0.22 }) : letterTile(name, size);
}

function windowFrame(host: string, shot: string): ReactNode {
	const dot = h('div', { width: 12, height: 12, borderRadius: 6, background: C.line3, marginRight: 8 });
	return h(
		'div',
		{ display: 'flex', flexDirection: 'column', width: SHOT_W + 2, borderRadius: 18, border: `1px solid ${C.line3}`, background: C.panel, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55)' },
		h('div', { display: 'flex', alignItems: 'center', height: 40, padding: '0 16px', background: C.bar, borderBottom: `1px solid ${C.line2}` }, dot, dot, dot, h('div', { display: 'flex', marginLeft: 12, fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 700, color: C.fg3 }, host)),
		img(shot, SHOT_W, SHOT_H),
	);
}

interface CardImages {
	icon?: string;
	shot?: string;
	site: string;
}

function card(app: App, im: CardImages): ReactNode {
	// Without a screenshot the icon (or letter tile) fills the right column instead.
	const right = im.shot ? windowFrame(hostOf(app.url), im.shot) : h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: SHOT_W, height: SHOT_H + 40 }, iconNode(im.icon, app.name, 280));
	return h(
		'div',
		{ display: 'flex', alignItems: 'center', width: CARD_WIDTH, height: CARD_HEIGHT, padding: PAD, background: C.bg, backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(63, 211, 245, 0.18), rgba(63, 211, 245, 0) 60%)', fontFamily: 'Bricolage Grotesque', color: C.fg },
		h(
			'div',
			{ display: 'flex', flexDirection: 'column', width: LEFT_W, height: '100%' },
			h('div', { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: C.cyan }, `~/apps/${app.slug}`),
			im.shot ? h('div', { display: 'flex', marginTop: 36 }, iconNode(im.icon, app.name, ICON)) : h('div', { display: 'flex', flexGrow: 1 }),
			h('div', { display: 'flex', marginTop: 28, fontSize: nameSize(app.name), fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }, app.name),
			h('div', { display: 'flex', marginTop: 16, fontSize: 30, fontWeight: 500, color: C.fg2 }, `by ${app.author}`),
			h('div', { display: 'flex', flexGrow: 1 }),
			h('div', { display: 'flex', alignItems: 'center' }, img(im.site, 48, 48, { borderRadius: 12 }), h('div', { display: 'flex', marginLeft: 16, fontSize: 30, fontWeight: 800 }, 'mygodock.dev')),
		),
		h('div', { display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }, right),
	);
}

export async function renderCard(app: App, paths: Paths): Promise<Buffer> {
	const [icon, shot, site, fonts] = await Promise.all([
		app.icon ? imageBytes(app.icon, paths.publicDir, app.slug).then((b) => asPng(b, ICON * 2.5, ICON * 2.5)) : undefined,
		app.image ? imageBytes(app.image, paths.publicDir, app.slug).then((b) => asPng(b, SHOT_W, SHOT_H)) : undefined,
		readFile(join(paths.publicDir, 'icon-192.png')).then((b) => asPng(b, 48, 48)),
		latinFonts(paths.fontDir),
	]);
	const svg = await satori(card(app, { icon, shot, site }), { width: CARD_WIDTH, height: CARD_HEIGHT, fonts, loadAdditionalAsset: extraFonts });
	return sharp(Buffer.from(svg)).png().toBuffer();
}
