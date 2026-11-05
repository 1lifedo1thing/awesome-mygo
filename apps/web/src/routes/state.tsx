import { BINDINGS_DOC, STATE_SOLUTIONS, likeKey, pad2, pick } from '@awesome-mygo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Docky, WinBar } from '../components/bits';
import { SetupLine } from '../components/CopyCmd';
import { CtaBox, CtaHead } from '../components/Cta';
import { BarLink, CardHead, CardShot, EntryCard, TagList, cardShotImg, showBy, showDesc, showGrid } from '../components/EntryCard';
import { useLang, useT } from '../lib/lang';
import { type StateBlock, validateStateSearch } from '../lib/page-search';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/state')({
	// ?block= keeps the open example in the address, so a link reproduces the view.
	validateSearch: validateStateSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/state', title: 'title_state', desc: 'desc_state', name: 'cat_state_name' }),
	component: StatePage,
});

type BlockId = StateBlock;

const btnAmber = 'min-h-12 py-0 px-[22px] border-0 rounded-xl bg-amber text-bg font-bold text-[15px]';

function StatePage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: '/state' });
	const block: BlockId = search.block ?? 'bind';
	const setBlock = (b: BlockId) => void navigate({ search: (prev) => ({ ...prev, block: b === 'bind' ? undefined : b }), replace: true, resetScroll: false });
	const blocks = [
		{ id: 'bind', kicker: 'mygo.Bind', name: t.blk_bind_n, desc: t.blk_bind_d, code: 'import { Greeter } from "./mygo" // generated\n\nawait Greeter.greet("Ada")' },
		{ id: 'chan', kicker: 'channels', name: t.blk_chan_n, desc: t.blk_chan_d, code: `// ${t.see}\n// docs/bindings.md › channels` },
		{ id: 'evt', kicker: 'typed events', name: t.blk_evt_n, desc: t.blk_evt_d, code: `// ${t.see}\n// docs/bindings.md › typed events` },
	] as const;
	const current = blocks.find((b) => b.id === block) ?? blocks[0];
	const listed = STATE_SOLUTIONS.length > 0;

	return (
		<section className='page enter gap-10 max-sm:gap-6'>
			<div className='flex flex-col gap-3.5'>
				<span className='kicker inline-flex items-center gap-2.5 text-amber'>
					<span className={`size-2 rounded-full bg-amber ${listed ? '' : 'pulse'}`} />
					~/STATE · {listed ? t.cat_state_count.replace('{n}', String(STATE_SOLUTIONS.length)) : t.cat_state_badge}
				</span>
				<h1 className='page-h1'>{t.cat_state_name}</h1>
				<p className='page-p max-w-[740px]'>{t.state_p}</p>
			</div>

			{listed && (
				<div className='flex flex-col gap-4'>
					<h2 className='m-0 text-[26px] font-black'>{t.state_listed_h}</h2>
					<div className={showGrid}>
						{STATE_SOLUTIONS.map((s, k) => {
							// As on a plugin card, the install line gives way to an ellipsis before its last path segment, which tells the lines apart.
							const cut = s.install.lastIndexOf('/') + 1;
							const key = `state:${s.slug}` as const;
							// The card opens the library's website when it has one; the bar then links its repository.
							const site = s.homepage ?? s.url;
							return (
								<div key={s.repo} className={`rv d${k % 6} flex`}>
									<EntryCard
										label={`github.com/${s.repo}`}
										bar={s.homepage && <BarLink href={s.url}>{t.on_github}</BarLink>}
										shot={
											// A state solution's screenshot is its 1200x630 social card, shown whole.
											s.image && (
												<CardShot href={site} className='aspect-[1200/630]'>
													<img className={cardShotImg} src={s.image} alt='' width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' />
												</CardShot>
											)
										}
									>
										<CardHead as='h3' name={s.name} href={site} item={likeKey.state(s)}>
											<span className={showBy} title={s.author}>
												<span lang='en'>by</span> {s.author}
											</span>
										</CardHead>
										<p className={showDesc}>{pick(s.desc, lang)}</p>
										<SetupLine head={s.install.slice(0, cut)} tail={s.install.slice(cut)} copyKey={key} />
										<TagList tags={s.tags} />
									</EntryCard>
								</div>
							);
						})}
					</div>
				</div>
			)}

			<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-stretch gap-5'>
				<div className='flex flex-col gap-2.5' role='tablist' aria-label={t.a_builtin}>
					{blocks.map((b, i) => (
						<button key={b.id} type='button' role='tab' aria-selected={b.id === block} onClick={() => setBlock(b.id)} className='group flex items-start gap-[18px] rounded-2xl border border-line-2 bg-panel px-6 py-[22px] text-left text-fg transition-[border-color,background] duration-200 ease-[ease] aria-selected:border-cyan aria-selected:bg-cyan/6 max-sm:gap-3.5 max-sm:px-[18px] max-sm:py-[18px]'>
							<span className='pt-[3px] font-mono text-[13px] text-fg-3 group-aria-selected:text-cyan'>{pad2(i + 1)}</span>
							<span className='flex flex-col gap-1.5'>
								<span className='text-[19px] font-black'>
									{b.name} <span className='font-mono text-[12px] font-normal text-fg-3'>{b.kicker}</span>
								</span>
								<span className='text-[14px] leading-[1.65] text-fg-2'>{b.desc}</span>
							</span>
						</button>
					))}
				</div>
				<div className='flex flex-col overflow-hidden rounded-2xl border border-line-3 bg-panel' role='tabpanel'>
					<WinBar label='app.ts' size='md' className='panel-bar' />
					<div className='code flex-auto p-[22px] text-[14px] leading-[1.9] max-sm:p-[18px]'>{current.code}</div>
					<a href={BINDINGS_DOC} target='_blank' rel='noopener' className='flex min-h-[52px] items-center border-t border-line-2 px-[22px] text-[14px] no-underline max-sm:px-[18px]' lang='en'>
						Calling Go from the frontend ↗
					</a>
				</div>
			</div>

			{listed ? (
				<CtaBox amber>
					<CtaHead as='h3' title={t.state_more_h} text={t.state_empty_p} />
					<button type='button' className={btnAmber} onClick={() => openSubmit('state')}>
						{t.sub_state}
					</button>
				</CtaBox>
			) : (
				<div className='bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] bg-size-[22px_22px] rv flex flex-col items-center gap-4 rounded-[20px] border border-dashed border-amber bg-bg/60 px-7 py-14 text-center max-sm:px-5 max-sm:py-10'>
					<Docky variant='laptop' />
					<h2 className='m-0 text-[28px] font-black tracking-[-0.02em] max-sm:text-[24px]'>{t.state_empty_h}</h2>
					<p className='m-0 max-w-[580px] text-[15px] leading-[1.75] text-fg-2'>{t.state_empty_p}</p>
					<button type='button' className={btnAmber} onClick={() => openSubmit('state')}>
						{t.sub_state}
					</button>
				</div>
			)}
		</section>
	);
}
