import { APPS, type AppKind, MYGO_SHOWCASE, fill, pick } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AppLink } from '../../components/bits';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { AppIcon, Note, StatusBar, Win, btnGo, btnSm, iconLabel, lnk, well } from '../ui';
import { noShot } from './AppPage';

type Sort = 'default' | 'az' | 'author';

const N_NATIVE = APPS.filter((a) => a.kind === 'native').length;
const N_WEB = APPS.length - N_NATIVE;

// Authors by number of apps, then name, for the side panel.
const AUTHORS = Object.entries(
	APPS.reduce<Record<string, number>>((acc, a) => {
		acc[a.author] = (acc[a.author] ?? 0) + 1;
		return acc;
	}, {}),
).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

// A row in the side panel: inverted while hovered or selected, like a Finder sidebar.
const place = 'flex w-full cursor-pointer items-center justify-between gap-1.5 border-0 bg-transparent px-1.5 text-left leading-5 hover:bg-ink hover:text-yel aria-pressed:bg-ink aria-pressed:text-yel';

export function Showcase() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const [kind, setKind] = useState<'all' | AppKind>('all');
	const [author, setAuthor] = useState<string | null>(null);
	const [sort, setSort] = useState<Sort>('default');

	const kinds = [
		{ key: 'all', label: t.all, n: APPS.length },
		{ key: 'native', label: t.surf_native, n: N_NATIVE },
		{ key: 'web', label: t.web_fe, n: N_WEB },
	] as const;

	const list = APPS.filter((a) => (kind === 'all' || a.kind === kind) && (author === null || a.author === author));
	if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
	if (sort === 'author') list.sort((a, b) => a.author.localeCompare(b.author));

	return (
		<div className='relative mx-auto max-w-[1440px] px-3.5 pt-3.5 desk:px-10 desk:pt-[30px] min-[1261px]:grid min-[1261px]:grid-cols-[minmax(0,1fr)_260px] min-[1261px]:items-start min-[1261px]:gap-x-10 min-[1261px]:pr-6'>
			<img src='/retro-gopher.png' alt='' width={144} height={144} className='pointer-events-none absolute right-1 bottom-[-64px] hidden size-[432px] pixelated min-[1261px]:block' />
			<Win title={t.cat_show_name} level={1}>
				<div className='flex flex-wrap items-center gap-x-3 gap-y-2 px-1.5 pt-[5px] pb-[7px]'>
					<nav aria-label={t.a_crumbs} className='hidden whitespace-nowrap desk:block'>
						<Link to='/' className={lnk}>
							MyGo Dock
						</Link>{' '}
						<span aria-hidden='true'>▸</span> {t.cat_show_name}
					</nav>
					<div role='group' aria-label={t.a_kind} className='flex'>
						{kinds.map((k) => (
							<button key={k.key} type='button' aria-pressed={kind === k.key} onClick={() => setKind(k.key)} className={`${btnSm} -ml-px first:ml-0`}>
								{k.label} <span className='font-mono'>{k.n}</span>
							</button>
						))}
					</div>
					<span className='flex-1' />
					<label className='flex items-center gap-1.5 whitespace-nowrap'>
						{t.sort}
						<select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className='h-[22px] cursor-pointer border border-ink bg-hi px-1 sunken'>
							<option value='default'>{t.sort_def}</option>
							<option value='az'>{t.sort_az}</option>
							<option value='author'>{t.sort_author}</option>
						</select>
					</label>
				</div>
				<div className='grid gap-1 desk:grid-cols-[176px_minmax(0,1fr)]'>
					<aside aria-label={t.f_author} className={`${well} hidden self-stretch px-1.5 py-2.5 desk:block`}>
						<p className='mx-1.5 mt-1 mb-0.5 text-faint'>{t.f_author}</p>
						<ul className='m-0 mb-3 list-none p-0'>
							<li>
								<button type='button' aria-pressed={author === null} onClick={() => setAuthor(null)} className={place}>
									<span>{t.all}</span>
									<span className='font-mono'>{APPS.length}</span>
								</button>
							</li>
							{AUTHORS.map(([name, n]) => (
								<li key={name}>
									<button type='button' aria-pressed={author === name} onClick={() => setAuthor(author === name ? null : name)} className={place}>
										<span className='truncate'>{name}</span>
										<span className='font-mono'>{n}</span>
									</button>
								</li>
							))}
						</ul>
						<p className='mx-1.5 mt-2.5 mb-0 border-t border-dotted border-lo pt-2.5 text-muted'>
							{t.show_p}{' '}
							<a className={`${lnk} whitespace-nowrap`} href={MYGO_SHOWCASE} target='_blank' rel='noopener'>
								mygo.egoist.dev/showcase
							</a>
						</p>
					</aside>
					<div className={`${well} grid min-h-[300px] grid-cols-2 content-start gap-x-3 gap-y-4 p-3 desk:min-h-[600px] desk:grid-cols-3 desk:gap-x-[18px] desk:gap-y-[22px] desk:p-[18px] min-[1261px]:grid-cols-4`}>
						{list.map((a) => (
							<AppLink key={a.slug} slug={a.slug} dialog className='group grid min-w-0 content-start gap-1 no-underline'>
								<span className='block aspect-[16/10] border border-ink bg-face p-[3px] bevel group-hover:bg-ink'>
									{a.image ? (
										<img src={a.image} alt='' width={1200} height={750} loading='lazy' decoding='async' className='block size-full border border-ink bg-paper object-cover object-top-left' />
									) : (
										<span className={`grid size-full place-items-center border border-ink ${noShot}`}>
											<AppIcon app={a} size={56} />
										</span>
									)}
								</span>
								<span className='mt-1 flex min-w-0 items-center gap-1.5'>
									<AppIcon app={a} size={24} />
									<span className={`truncate ${iconLabel}`}>{a.name}</span>
								</span>
								<span className='truncate pl-[30px] leading-[14px] text-muted'>{a.author}</span>
								<span className='sr-only'>{pick(a.desc, lang)}</span>
							</AppLink>
						))}
						{list.length === 0 && (
							<p className='col-span-full m-0'>
								{t.no_res}{' '}
								<button type='button' className={`${lnk} cursor-pointer border-0 bg-transparent p-0`} onClick={() => openSubmit('showcase')}>
									{t.submit_it}
								</button>
							</p>
						)}
					</div>
				</div>
				<StatusBar>
					<span aria-live='polite'>{fill(t.r_items, { n: list.length })}</span>
					<span>
						{t.surf_native} {N_NATIVE} · {t.web_fe} {N_WEB}
					</span>
					<a className={lnk} href={MYGO_SHOWCASE} target='_blank' rel='noopener'>
						mygo.egoist.dev/showcase ↗
					</a>
				</StatusBar>
			</Win>
			<Note title={t.r_note} className='mx-1 mt-10 min-[1261px]:mx-0 min-[1261px]:mt-32'>
				<p className='m-0 mb-2.5 text-2xl leading-8'>{t.m_title}</p>
				<p className='m-0 mb-2.5'>{t.m_desc_bot}</p>
				<div className='mt-3 flex flex-wrap items-center gap-2.5'>
					<button type='button' className={btnGo} onClick={() => openSubmit('showcase')}>
						{t.sub_send}
					</button>
				</div>
			</Note>
		</div>
	);
}
