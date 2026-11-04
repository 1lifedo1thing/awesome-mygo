import { ARTICLES, DOCS, DOCS_BASE, RESOURCES, fill, hostOf, pad2, pick } from '@awesome-mygo/catalog';
import { useLang, useT } from '../../lib/lang';
import type { BitmapName } from '../bitmaps';
import { DesktopIcons } from '../DesktopIcons';
import { PixelIcon, StatusBar, Win, btnGo, iconLabel, well } from '../ui';

// A shortcut icon for each official resource.
const RES_ICON: Record<(typeof RESOURCES)[number]['key'], BitmapName> = {
	res_site: 'globe',
	res_docs: 'page',
	res_ui: 'cursor',
	res_examples: 'hammer',
	res_bench: 'hourglass',
	res_releases: 'update',
};

// The learn page: a reader window with the community articles set like documents, a folder of shortcuts to the official resources beside it, and the official guides as a numbered details list across the desktop below.
export function Learn() {
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:grid-cols-12 desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Reader />
			<Resources />
			<Guides />
		</div>
	);
}

function Reader() {
	const t = useT();
	return (
		<Win level={1} title={t.learn_h} className='desk:col-span-7 desk:col-start-1 desk:row-start-1'>
			<div className={`${well} relative pt-3`}>
				<span aria-hidden='true' className='absolute inset-x-0 top-0 h-3 border-b border-lo ruler' />
				{ARTICLES.map((ar) => (
					<article key={ar.url} className='border-b border-dotted border-lo px-5 pt-5 pb-5 last:border-b-0 desk:px-10 desk:pt-7 desk:pb-7'>
						<p className='m-0 mb-3'>
							<span className='inline-block border border-ink bg-yel px-1.5 leading-4'>{fill(t.article_k, { x: ar.site })}</span>
						</p>
						<h2 lang='en' className='m-0 mb-5 text-2xl leading-8 font-normal desk:text-[36px] desk:leading-[44px]'>
							{ar.title}
						</h2>
						<a className={btnGo} href={ar.url} target='_blank' rel='noopener'>
							{t.read_full}
						</a>
					</article>
				))}
			</div>
			<StatusBar>
				<span>{fill(t.r_items, { n: ARTICLES.length })}</span>
				<span>{t.article}</span>
			</StatusBar>
		</Win>
	);
}

// The official resources as a folder window of shortcut icons, each with its host underneath.
function Resources() {
	const t = useT();
	return (
		<Win title={t.res_h} idle className='desk:col-span-5 desk:col-start-8 desk:row-start-1 desk:mt-16 desk:-ml-10'>
			<ul className={`${well} m-0 grid list-none grid-cols-2 gap-x-2 gap-y-3 p-3 min-[480px]:grid-cols-3`}>
				{RESOURCES.map((r) => (
					<li key={r.key} className='min-w-0'>
						<a href={r.url} target='_blank' rel='noopener' className='group grid justify-items-center gap-1 px-1 py-2 text-center no-underline'>
							<PixelIcon name={RES_ICON[r.key]} scale={2} />
							<span className={`${iconLabel} text-balance`}>{t[r.key]}</span>
							<span lang='en' className='max-w-full truncate font-mono text-faint'>
								{hostOf(r.url)}
							</span>
						</a>
					</li>
				))}
			</ul>
			<StatusBar>
				<span>{fill(t.r_items, { n: RESOURCES.length })}</span>
			</StatusBar>
		</Win>
	);
}

// The official guides in their docs order: number, page icon, English title and the localized summary on one row each.
function Guides() {
	const t = useT();
	const lang = useLang();
	return (
		<Win title={t.guides_h} idle className='desk:col-span-11 desk:col-start-2 desk:row-start-2 desk:mt-10 desk:-ml-6'>
			<ol className={`${well} m-0 list-none p-1.5`}>
				{DOCS.map((d, i) => (
					<li key={d.url} className='border-b border-dotted border-[#d6cfbb] last:border-b-0'>
						<a href={d.url} target='_blank' rel='noopener' className='group grid grid-cols-[22px_16px_1fr_auto] items-baseline gap-x-2.5 px-2 py-1.5 no-underline hover:bg-ink hover:text-paper desk:grid-cols-[22px_16px_220px_1fr_auto] desk:gap-x-3.5'>
							<span className='font-mono text-lo'>{pad2(i + 1)}</span>
							<PixelIcon name='page' scale={1} className='self-center' />
							<span lang='en' className='min-w-0'>
								{d.title}
							</span>
							<span className='col-start-3 row-start-2 text-faint group-hover:text-[#c9c2ae] desk:col-start-4 desk:row-start-1'>{pick(d.desc, lang)}</span>
							<span aria-hidden='true' className='col-start-4 row-start-1 text-muted group-hover:text-yel desk:col-start-5'>
								↗
							</span>
						</a>
					</li>
				))}
			</ol>
			<StatusBar>
				<span>{fill(t.r_items, { n: DOCS.length })}</span>
				<span lang='en' className='font-mono'>
					{DOCS_BASE.replace(/^https:\/\//, '')}
				</span>
			</StatusBar>
		</Win>
	);
}
