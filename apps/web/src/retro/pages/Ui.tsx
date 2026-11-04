import { NATIVE_UI_DOCS, UI_KEYS, UI_LIBS, type UiLib, type UiLibKey, fill, pick } from '@awesome-mygo/catalog';
import { useState } from 'react';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { DesktopIcons } from '../DesktopIcons';
import { Note, StatusBar, Win, btn, btnGo, btnSm, field, lnk, well } from '../ui';

const TAG: Record<UiLibKey, 'tag_theme' | 'tag_retro' | 'tag_icons'> = { theme: 'tag_theme', retro: 'tag_retro', icons: 'tag_icons' };

// Where each library window sits on the desktop, by its place in the filtered list: a cascade that steps left and right down the page, each window tucked under the previous one's corner. Rows start at 2, below the header window.
const SPOT = ['desk:col-span-8 desk:col-start-1 desk:row-start-2 desk:mt-6 desk:ml-6', 'desk:col-span-8 desk:col-start-5 desk:row-start-3 desk:-mt-3 desk:ml-2', 'desk:col-span-8 desk:col-start-2 desk:row-start-4 desk:-mt-3 desk:-ml-4'];

// The UI components page: a header window with the filter, then one browser-like window per library cascading down the desktop, and a sticky note asking for more.
export function Ui() {
	const t = useT();
	const [filter, setFilter] = useState<'all' | UiLibKey>('all');
	const chips = [{ key: 'all' as const, label: `${t.all} · ${UI_LIBS.length}` }, ...UI_KEYS.map((k) => ({ key: k, label: `${t[TAG[k]]} · ${UI_LIBS.filter((l) => l.key === k).length}` }))];
	const libs = UI_LIBS.filter((l) => filter === 'all' || l.key === filter);
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:grid-cols-12 desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Win level={1} title={t.cat_ui_name} className='desk:col-span-7 desk:col-start-1 desk:row-start-1'>
				<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
					<div role='group' aria-label={t.a_filter} className='flex flex-wrap'>
						{chips.map((c) => (
							<button key={c.key} type='button' aria-pressed={filter === c.key} onClick={() => setFilter(c.key)} className={`${btnSm} -ml-px first:ml-0`}>
								{c.label}
							</button>
						))}
					</div>
					<span className='flex-1' />
					<span className={`${field} font-mono`} lang='en'>
						~/ui
					</span>
				</div>
				<div className={`${well} px-5 pt-4 pb-[18px]`}>
					<p className='m-0 mb-3 max-w-[42em] leading-[22px]'>{t.ui_p}</p>
					<a className={lnk} href={NATIVE_UI_DOCS} target='_blank' rel='noopener'>
						{t.ui_builtin}
					</a>
				</div>
				<StatusBar>
					<span>
						<b className='bg-yel px-[3px] font-normal text-ink'>{libs.length}</b> / {fill(t.cat_ui_badge, { n: UI_LIBS.length })}
					</span>
					<span>{t.cat_ui_desc}</span>
				</StatusBar>
			</Win>
			{libs.map((l, i) => (
				<LibWindow key={l.repo} lib={l} first={i === 0} className={SPOT[i % SPOT.length]} />
			))}
			<CtaNote />
		</div>
	);
}

// One library as a little browser window: its repository in the address field, the screenshot, and the details beside it.
function LibWindow({ lib, first, className }: { lib: UiLib; first: boolean; className: string }) {
	const t = useT();
	const lang = useLang();
	return (
		<Win title={lib.name} idle={!first} className={className}>
			<div className='flex items-center gap-2 px-1.5 pt-[3px] pb-1.5'>
				<span className={`${field} min-w-0 flex-1`}>
					<span aria-hidden='true' className='text-faint'>
						⌂
					</span>
					<span lang='en' className='truncate font-mono'>
						github.com/{lib.repo}
					</span>
				</span>
				<span className='inline-block border border-ink bg-yel px-1.5 leading-4'>{t[TAG[lib.key]]}</span>
			</div>
			<div className={`${well} grid gap-[18px] p-3.5 desk:grid-cols-[1.3fr_1fr] desk:items-start`}>
				{lib.image ? (
					<a href={lib.url} target='_blank' rel='noopener' className='block bg-face p-[3px] hover:bg-ink'>
						<img src={lib.image} alt={`${lib.name} ${t.shot}`} width={1200} height={750} loading={first ? 'eager' : 'lazy'} fetchPriority={first ? 'high' : undefined} decoding='async' className='block aspect-[1200/750] w-full border border-ink bg-paper object-cover object-top-left' />
					</a>
				) : (
					<span aria-hidden='true' className='grid aspect-[1200/750] place-items-center border border-ink bg-face text-2xl leading-8'>
						{lib.name}
					</span>
				)}
				<div className='grid content-start gap-2.5'>
					<h2 className='m-0 text-2xl leading-8 font-normal'>{lib.name}</h2>
					<p className='m-0 -mt-2 text-muted'>
						<span lang='en'>by</span> {lib.author}
					</p>
					<p className='m-0'>{pick(lib.desc, lang)}</p>
					<div className='flex flex-wrap gap-2 pt-1'>
						<a className={btn} href={lib.url} target='_blank' rel='noopener'>
							{t.on_github}
						</a>
						{lib.homepage && (
							<a className={btn} href={lib.homepage} target='_blank' rel='noopener'>
								{t.visit}
							</a>
						)}
					</div>
				</div>
			</div>
		</Win>
	);
}

// The call for more libraries, pinned to the desktop beside the header window.
function CtaNote() {
	const t = useT();
	const { openSubmit } = useSite();
	return (
		<Note title={t.r_note} className='mx-1 desk:col-span-4 desk:col-start-8 desk:row-start-1 desk:m-0 desk:mt-16 desk:-ml-10'>
			<p className='m-0 mb-3.5 text-2xl leading-8 text-balance [&:lang(ko)]:break-keep'>{t.ui_cta}</p>
			<button type='button' className={btnGo} onClick={() => openSubmit('ui')}>
				{t.sub_ui}
			</button>
		</Note>
	);
}
