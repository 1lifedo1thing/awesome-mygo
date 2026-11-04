// The README badge app authors can add to their project (/badge.svg): the site's icon and name, and "listed". Drawn with satori, which turns the text into paths, so the badge looks the same wherever it is shown, whatever fonts the reader has.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createElement } from 'react';
import satori from 'satori';
import { type Paths, asPng, latinFonts } from './card';

export const BADGE_HEIGHT = 28;

export async function renderBadge(paths: Paths): Promise<string> {
	const [icon, fonts] = await Promise.all([readFile(join(paths.publicDir, 'icon-192.png')).then((b) => asPng(b, 18, 18)), latinFonts(paths.fontDir)]);
	const h = createElement;
	const badge = h(
		'div',
		{ style: { display: 'flex', height: BADGE_HEIGHT, borderRadius: 6, overflow: 'hidden', fontFamily: 'Bricolage Grotesque' } },
		h(
			'div',
			{ style: { display: 'flex', alignItems: 'center', height: '100%', padding: '0 9px 0 5px', background: '#0b0d10', color: '#eef2f5', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' } },
			h('img', { src: icon, width: 18, height: 18, style: { borderRadius: 4, marginRight: 6 } }),
			'Awesome ',
			h('span', { style: { color: '#3fd3f5', marginLeft: 4 } }, 'MyGo'),
		),
		h('div', { style: { display: 'flex', alignItems: 'center', height: '100%', padding: '0 9px', background: '#3fd3f5', color: '#0b0d10', fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700 } }, 'listed'),
	);
	return satori(badge, { height: BADGE_HEIGHT, fonts });
}
