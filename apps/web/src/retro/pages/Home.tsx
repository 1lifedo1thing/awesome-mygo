import { APPS, ARTICLES, DOCS, INSTALL_CMDS, INSTALL_TABS, type InstallTab, type LangCode, MYGO_SITE, PLUGINS, STATE_SOLUTIONS, UI_LIBS, appBySlug, fill, pad2, pick } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AppLink } from '../../components/bits';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { DesktopIcons } from '../DesktopIcons';
import { PLUGIN_ICON } from '../plugin-icons';
import { AppIcon, Note, PixelIcon, StatusBar, Win, btn, btnGo, btnSm, iconLabel, lnk, well } from '../ui';

const FEATURED = ['mixmusic', 'pulse', 'liubai', 'godwit'] as const;

// Headline size per language, so the longest line of r_h1 fits the README window (530px of text at the desktop width): a CJK character is a full em, the pixel face's Latin about half.
const H1_SIZE: Record<LangCode, string> = {
	'zh-CN': 'text-[48px] leading-[56px] desk:text-[96px] desk:leading-[104px]',
	'zh-TW': 'text-[48px] leading-[56px] desk:text-[96px] desk:leading-[104px]',
	ja: 'text-[40px] leading-[48px] desk:text-[72px] desk:leading-[80px]',
	ko: 'text-[40px] leading-[48px] desk:text-[72px] desk:leading-[80px]',
	en: 'text-[28px] leading-[36px] desk:text-[56px] desk:leading-[64px]',
};

export function Home() {
	return (
		<>
			<Desk />
			<Rooms />
		</>
	);
}

// The first screen: a desktop with folder icons, the dithered gopher wallpaper and three windows. Below the desktop breakpoint the windows stack in reading order.
function Desk() {
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[22px] overflow-x-clip px-3.5 pt-3.5 desk:block desk:h-[868px] desk:overflow-visible desk:p-0'>
			<img src='/retro-gopher.png' alt='' width={144} height={144} className='pointer-events-none order-0 -mt-1.5 -mr-[30px] -mb-[176px] size-[288px] self-end pixelated desk:absolute desk:top-10 desk:right-1.5 desk:m-0 desk:size-[576px] min-[1321px]:size-[720px]' />
			<Welcome />
			<Dialog />
			<DesktopIcons className='order-3 grid grid-cols-3 justify-items-center gap-x-0 gap-y-3.5 py-1.5 desk:absolute desk:top-[26px] desk:left-[18px] desk:z-[2] desk:grid-cols-1 desk:gap-4 desk:p-0' />
			<Terminal />
		</div>
	);
}

function Welcome() {
	const t = useT();
	const lang = useLang();
	const lines = t.r_h1.split('\n');
	return (
		<Win title='README.txt' level={2} className='order-1 desk:absolute desk:top-[34px] desk:left-[136px] desk:w-[604px]'>
			<div className={`${well} relative px-5 pt-[22px] pb-[18px] desk:pt-[30px] desk:pr-[34px] desk:pb-[26px] desk:pl-10`}>
				<span aria-hidden='true' className='absolute inset-x-0 top-0 h-3 border-b border-lo ruler' />
				<h1 className={`my-3 font-normal desk:mt-[18px] desk:mb-[22px] ${H1_SIZE[lang]}`}>
					{lines.map((line, i) => (
						<span key={line} className='block whitespace-nowrap'>
							{line.split(/(\bGo\b)/).map((part, j) =>
								part === 'Go' ? (
									<mark key={j} className='mx-[0.08em] bg-ink px-[0.08em] text-yel'>
										Go
									</mark>
								) : (
									part
								),
							)}
							{i === lines.length - 1 && <span aria-hidden='true' className='ml-[0.04em] inline-block h-[0.92em] w-[0.08em] animate-blink bg-ink align-[-0.06em]' />}
							{i < lines.length - 1 && ' '}
						</span>
					))}
				</h1>
				<p className='m-0 max-w-[35em] leading-[22px]'>{t.hero_p}</p>
			</div>
			<StatusBar>
				<span>
					<b className='bg-yel px-[3px] font-normal text-ink'>{APPS.length}</b> {t.st_apps}
				</span>
				<span>
					<b className='bg-yel px-[3px] font-normal text-ink'>{PLUGINS.length}</b> {t.st_plugins}
				</span>
				<span>
					<b className='bg-yel px-[3px] font-normal text-ink'>{UI_LIBS.length}</b> {t.st_libs}
				</span>
				<span>
					<b className='bg-yel px-[3px] font-normal text-ink'>MIT</b> {t.st_mit}
				</span>
			</StatusBar>
		</Win>
	);
}

function Terminal() {
	const t = useT();
	const { copy, copied } = useSite();
	const [tab, setTab] = useState<InstallTab>('bun');
	const cmd = INSTALL_CMDS[tab];
	return (
		<Win title={`${t.r_terminal} — my-app`} idle className='order-4 desk:absolute desk:top-[556px] desk:left-[560px] desk:w-[620px]'>
			<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
				<div role='group' aria-label={t.a_install} className='flex'>
					{INSTALL_TABS.map((it) => (
						<button key={it.key} type='button' aria-pressed={tab === it.key} onClick={() => setTab(it.key)} className={`${btnSm} -ml-px first:ml-0`}>
							{it.label}
						</button>
					))}
				</div>
				<span className='flex-1' />
				<button type='button' className={btnSm} onClick={() => copy(cmd, 'cmd')} aria-label={t.a_copy_install}>
					{copied === 'cmd' ? t.copied : t.copy}
				</button>
			</div>
			<div className='border border-ink bg-ink px-4 pt-3.5 pb-4 font-mono text-paper'>
				<p className='m-0 overflow-hidden break-all desk:truncate desk:break-normal'>
					<span className='text-sky'>~/code $ </span>
					<span className='text-yel'>{cmd}</span>
					<span aria-hidden='true' className='ml-0.5 inline-block h-[13px] w-[7px] animate-blink bg-paper align-[-2px]' />
				</p>
				<p className='m-0 mt-1 text-slate'># {t.tool_p}</p>
			</div>
		</Win>
	);
}

function Dialog() {
	const t = useT();
	return (
		<div className='order-2 mx-1 grid grid-cols-[44px_1fr] gap-x-4 gap-y-2.5 border border-ink bg-face p-3.5 outline-1 outline-offset-[3px] outline-ink shadow-[inset_1px_1px_0_var(--color-hi),inset_-1px_-1px_0_var(--color-lo),0_0_0_3px_var(--color-face),9px_9px_0_3px_rgba(16,35,58,.5)] desk:absolute desk:top-[704px] desk:left-[196px] desk:z-[3] desk:m-0 desk:w-[536px] desk:grid-cols-[56px_1fr] desk:px-[18px] desk:pt-4 desk:pb-3.5'>
			<img src='/icon-192.png' alt='' width={56} height={56} className='size-11 border border-ink desk:size-14' />
			<div>
				<p className='m-0 mb-1 text-2xl leading-8'>{fill(t.live_badge, { n: APPS.length })}</p>
				<p className='m-0'>{t.cat_show_desc}</p>
			</div>
			<div className='col-span-full flex flex-wrap justify-end gap-2.5 pt-1'>
				<a className={btn} href={MYGO_SITE} target='_blank' rel='noopener'>
					{t.site}
				</a>
				<Link to='/showcase' className={btnGo}>
					{t.explore} →
				</Link>
			</div>
		</div>
	);
}

// Below the desktop: overlapping windows for each section, placed on a 12-column grid with deliberate offsets.
function Rooms() {
	return (
		<div className='mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-[26px] desk:grid desk:grid-cols-12 desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-6 desk:pr-10 desk:pl-[136px]'>
			<AppsRoom />
			<PluginsRoom />
			<UiRoom />
			<StateRoom />
			<DocsRoom />
			<SubmitNote />
		</div>
	);
}

function AppsRoom() {
	const t = useT();
	const lang = useLang();
	return (
		<Win title={`${t.nav_showcase} — ${fill(t.r_items, { n: APPS.length })}`} className='desk:col-span-8 desk:col-start-1 desk:row-start-1'>
			<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
				<span>{t.feat_h}</span>
				<span className='hidden text-muted desk:inline'>{t.cat_show_desc}</span>
				<span className='flex-1' />
				<Link to='/showcase' className={btnSm}>
					{fill(t.feat_all, { n: APPS.length })} →
				</Link>
			</div>
			<div className={`${well} p-4`}>
				<div className='grid grid-cols-2 gap-x-3 gap-y-4 desk:grid-cols-4 desk:gap-[18px]'>
					{FEATURED.map((slug) => {
						const a = appBySlug(slug);
						if (!a) return null;
						return (
							<AppLink key={slug} slug={slug} dialog className='group grid content-start gap-1.5 no-underline'>
								<span className='block aspect-[16/10] overflow-hidden bg-face p-[3px] group-hover:bg-ink'>
									{a.image ? <img src={a.image} alt='' width={1200} height={750} loading='lazy' decoding='async' className='block size-full border border-ink object-cover object-top-left' /> : <span className='grid size-full place-items-center border border-ink bg-paper'><AppIcon app={a} size={48} /></span>}
								</span>
								<span className='mt-1 flex items-center gap-1.5'>
									<AppIcon app={a} size={16} />
									<span className={iconLabel}>{a.name}</span>
								</span>
								<span className='min-h-10'>{pick(a.desc, lang)}</span>
								<span className='text-muted'>
									{a.author} · {a.kind === 'native' ? t.surf_native : t.web_fe}
								</span>
							</AppLink>
						);
					})}
				</div>
				<div className='mt-[18px] mb-2 flex justify-between border-t border-dotted border-lo pt-2.5'>
					<span>{t.a_marquee}</span>
				</div>
				<div className='grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-1 gap-y-2.5'>
					{APPS.map((a) => (
						<AppLink key={a.slug} slug={a.slug} dialog className='group grid min-w-0 justify-items-center gap-1 text-center no-underline'>
							<AppIcon app={a} size={32} />
							<span className={`max-w-full truncate ${iconLabel}`}>{a.name}</span>
						</AppLink>
					))}
				</div>
			</div>
			<StatusBar>
				<span>{fill(t.r_items, { n: APPS.length })}</span>
				<span>{t.cats_src}</span>
			</StatusBar>
		</Win>
	);
}

function PluginsRoom() {
	const t = useT();
	const lang = useLang();
	const [sel, setSel] = useState(() => Math.max(0, PLUGINS.findIndex((p) => p.slug === 'terminal')));
	const p = PLUGINS[sel];
	const surf = { web: t.surf_web, native: t.surf_native, both: t.surf_both } as const;
	return (
		<Win title={`${t.nav_plugins} — ${t.r_panel}`} idle className='desk:col-span-4 desk:col-start-9 desk:row-start-1 desk:mt-24 desk:-ml-11'>
			<p className='m-0 px-1.5 pt-[3px] pb-1.5'>{t.plug_p}</p>
			<div className={`${well} grid grid-cols-4 gap-0.5 p-2`}>
				{PLUGINS.map((pl, i) => (
					<button key={pl.slug} type='button' aria-pressed={i === sel} onClick={() => setSel(i)} className='group grid cursor-pointer justify-items-center gap-1 border border-transparent bg-transparent px-0.5 pt-2 pb-1.5 aria-pressed:border-dotted aria-pressed:border-ink'>
						<PixelIcon name={PLUGIN_ICON[pl.slug] ?? 'page'} />
						<span className='px-[3px] leading-4 group-hover:bg-ink group-hover:text-yel group-aria-pressed:bg-ink group-aria-pressed:text-yel'>{pl.name}</span>
					</button>
				))}
			</div>
			<div className={`${well} mt-1.5 px-3.5 py-3`} aria-live='polite'>
				<div className='flex items-center gap-2.5'>
					<span className='text-2xl leading-8'>{p.name}</span>
					<span className='inline-block border border-ink bg-ink px-1.5 leading-4 text-paper'>{surf[p.surface]}</span>
				</div>
				<p className='m-0 mb-2'>{pick(p.desc, lang)}</p>
				<div className='mb-2 flex flex-wrap gap-1.5'>
					{p.tags.map((tag) => (
						<code key={tag} lang='en' className='border border-lo bg-face px-1.5 font-mono'>
							{tag}
						</code>
					))}
				</div>
				<div className='flex flex-wrap gap-2'>
					<a className={btnSm} href={p.url} target='_blank' rel='noopener'>
						{t.docs_link}
					</a>
					<Link to='/plugins' className={btnSm}>
						{t.nav_plugins} →
					</Link>
				</div>
			</div>
		</Win>
	);
}

function UiRoom() {
	const t = useT();
	const lang = useLang();
	const [sel, setSel] = useState(0);
	const lib = UI_LIBS[sel];
	return (
		<Win title={`${t.nav_ui} — ${fill(t.cat_ui_badge, { n: UI_LIBS.length })}`} idle className='desk:col-span-7 desk:col-start-1 desk:row-start-2 desk:mt-11 desk:ml-10'>
			<p className='m-0 px-1.5 pt-[3px] pb-1.5'>{t.cat_ui_desc}</p>
			<div role='tablist' aria-label={t.nav_ui} className='flex gap-0.5 px-2.5 pt-1'>
				{UI_LIBS.map((l, i) => (
					<button key={l.name} type='button' role='tab' aria-selected={i === sel} onClick={() => setSel(i)} className='relative top-px h-6 cursor-pointer border border-b-0 border-ink bg-face-lo px-3 shadow-[inset_1px_1px_0_var(--color-hi)] aria-selected:z-[1] aria-selected:-mt-0.5 aria-selected:h-[26px] aria-selected:bg-paper'>
						{l.name}
					</button>
				))}
			</div>
			<div role='tabpanel' className={`${well} grid gap-[18px] p-3.5 desk:grid-cols-[1.25fr_1fr] desk:items-start`}>
				{lib.image ? (
					<a href={lib.url} target='_blank' rel='noopener' className='block bg-face p-[3px]'>
						<img src={lib.image} alt={`${lib.name} ${t.shot}`} width={1200} height={750} loading='lazy' decoding='async' className='block w-full border border-ink' />
					</a>
				) : null}
				<div>
					<p className='m-0 text-2xl leading-8'>{lib.name}</p>
					<p className='m-0 mb-2.5 text-muted'>{lib.author}</p>
					<p className='m-0 mb-2.5'>{pick(lib.desc, lang)}</p>
					<div className='flex flex-wrap gap-2'>
						<a className={btnSm} href={lib.repo} target='_blank' rel='noopener'>
							{t.on_github}
						</a>
						<Link to='/ui' className={btnSm}>
							{t.nav_ui} →
						</Link>
					</div>
				</div>
			</div>
		</Win>
	);
}

function StateRoom() {
	const t = useT();
	const lang = useLang();
	const { copy, copied } = useSite();
	const s = STATE_SOLUTIONS[0];
	return (
		<Win title={`${t.nav_state} — ${fill(t.cat_state_count, { n: STATE_SOLUTIONS.length })}`} idle className='desk:col-span-5 desk:col-start-8 desk:row-start-2 desk:mt-[124px] desk:-ml-3'>
			<div className={`${well} p-3.5`}>
				<p className='m-0 mb-2.5'>{t.state_p}</p>
				{s && (
					<>
						{s.image && (
							<a href={s.url} target='_blank' rel='noopener' className='mb-3 block bg-ink p-[3px]'>
								<img src={s.image} alt={`${s.name} ${t.preview_img}`} width={1200} height={630} loading='lazy' decoding='async' className='block w-full' />
							</a>
						)}
						<p className='m-0 text-2xl leading-8'>
							{s.name} <span className='text-xs text-muted'>{s.author}</span>
						</p>
						<p className='m-0 mb-2.5'>{pick(s.desc, lang)}</p>
						<div className='mb-3 flex h-[30px] items-center justify-between gap-2 border border-ink bg-hi pr-[3px] pl-1.5 sunken'>
							<code lang='en' className='truncate font-mono'>
								{s.install}
							</code>
							<button type='button' className={btnSm} onClick={() => copy(s.install, 'line')}>
								{copied === 'line' ? t.copied : t.copy}
							</button>
						</div>
					</>
				)}
				<Link to='/state' className={btnSm}>
					{t.nav_state} →
				</Link>
			</div>
		</Win>
	);
}

function DocsRoom() {
	const t = useT();
	const lang = useLang();
	const article = ARTICLES[0];
	return (
		<Win title={`${t.nav_learn} — ${t.guides_h}`} idle className='desk:col-span-9 desk:col-start-1 desk:row-start-3 desk:mt-11 desk:-ml-24'>
			<div className={`${well} px-6 pt-[18px] pb-4`}>
				<ol className='m-0 list-none columns-1 gap-10 p-0 desk:columns-2'>
					{DOCS.map((d, i) => (
						<li key={d.url} className='break-inside-avoid'>
							<a href={d.url} target='_blank' rel='noopener' className='group grid grid-cols-[22px_auto_1fr] items-baseline gap-x-2.5 border-b border-dotted border-[#d6cfbb] p-1 leading-[18px] no-underline hover:bg-ink hover:text-paper'>
								<span className='font-mono text-lo'>{pad2(i + 1)}</span>
								<span lang='en' className='whitespace-nowrap'>
									{d.title}
								</span>
								<span className='col-start-2 col-end-[-1] text-faint group-hover:text-[#c9c2ae] desk:col-auto'>{pick(d.desc, lang)}</span>
							</a>
						</li>
					))}
				</ol>
				{article && (
					<p className='m-0 mt-4 border-t border-dotted border-lo pt-3'>
						<span className='mr-2 inline-block border border-ink bg-paper px-1.5 leading-4'>{fill(t.article_k, { x: article.site })}</span>
						<a className={lnk} href={article.url} target='_blank' rel='noopener' lang='en'>
							{article.title} ↗
						</a>
					</p>
				)}
			</div>
		</Win>
	);
}

function SubmitNote() {
	const t = useT();
	const { openSubmit } = useSite();
	return (
		<Note title={t.r_note} className='mx-1 desk:col-span-3 desk:col-start-10 desk:row-start-3 desk:m-0 desk:mt-[104px] desk:-ml-2'>
			<p className='m-0 mb-2.5 text-2xl leading-8'>{t.m_title}</p>
			<p className='m-0 mb-2.5'>{t.m_desc_bot}</p>
			<div className='mt-3 flex flex-wrap items-center gap-2.5'>
				<button type='button' className={btnGo} onClick={() => openSubmit()}>
					{t.sub_send}
				</button>
			</div>
		</Note>
	);
}
