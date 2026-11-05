import { BINDINGS_DOC, STATE_SOLUTIONS, likeKey, pad2, pick } from '@awesome-mygo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Docky, WinBar } from '../components/bits';
import { LikeButton } from '../components/Like';
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

function StatePage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit, copy, copied } = useSite();
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
		<section className='page enter gap-40'>
			<div className='stack-14'>
				<span className='kicker kicker-amber'>
					<span className={`amber-dot ${listed ? '' : 'pulse'}`} />
					~/STATE · {listed ? t.cat_state_count.replace('{n}', String(STATE_SOLUTIONS.length)) : t.cat_state_badge}
				</span>
				<h1 className='page-h1'>{t.cat_state_name}</h1>
				<p className='page-p mw-740'>{t.state_p}</p>
			</div>

			{listed && (
				<div className='stack-16'>
					<h2 className='guides-h'>{t.state_listed_h}</h2>
					<div className='show-grid'>
						{STATE_SOLUTIONS.map((s, k) => {
							// As on a plugin card, the install line gives way to an ellipsis before its last path segment, which tells the lines apart.
							const cut = s.install.lastIndexOf('/') + 1;
							const key = `state:${s.slug}` as const;
							// The card opens the library's website when it has one; the bar then links its repository.
							const site = s.homepage ?? s.url;
							return (
								<div key={s.repo} className={`rv d${k % 6} flex`}>
									<article className='win card plug-card'>
										<WinBar label={`github.com/${s.repo}`} size='md' className='card-bar'>
											{s.homepage && (
												<a className='plug-bar-docs' href={s.url} target='_blank' rel='noopener'>
													{t.on_github}
												</a>
											)}
										</WinBar>
										{s.image && (
											<a className='card-shot card-shot-social' href={site} target='_blank' rel='noopener' tabIndex={-1} aria-hidden='true'>
												<img src={s.image} alt='' width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' />
											</a>
										)}
										<div className='plug-body'>
											<div className='show-id'>
												<div className='show-id-text'>
													<h3 className='show-name'>
														<a className='plug-link' href={site} target='_blank' rel='noopener'>
															{s.name}
														</a>
													</h3>
													<span className='show-by' title={s.author}>
														<span lang='en'>by</span> {s.author}
													</span>
												</div>
												<LikeButton item={likeKey.state(s)} name={s.name} className='like-btn like-end' />
											</div>
											<p className='show-desc'>{pick(s.desc, lang)}</p>
											<div className='cmd-row plug-cmd'>
												<code className='plug-cmd-text' lang='en'>
													<span className='plug-cmd-head'>{s.install.slice(0, cut)}</span>
													<span className='plug-cmd-tail'>{s.install.slice(cut)}</span>
												</code>
												<button type='button' className='cmd-copy' onClick={() => copy(s.install, key)} aria-label={`${t.copy}: ${s.install}`}>
													{copied === key ? t.copied : t.copy}
												</button>
											</div>
											<span className='plug-tags'>
												{s.tags.map((tg) => (
													<span key={tg} className='plug-tag' lang='en'>
														{tg}
													</span>
												))}
											</span>
										</div>
									</article>
								</div>
							);
						})}
					</div>
				</div>
			)}

			<div className='state-grid'>
				<div className='blocks' role='tablist' aria-label={t.a_builtin}>
					{blocks.map((b, i) => (
						<button key={b.id} type='button' role='tab' aria-selected={b.id === block} onClick={() => setBlock(b.id)} className='block-tab'>
							<span className='block-num'>{pad2(i + 1)}</span>
							<span className='stack-6'>
								<span className='block-name'>
									{b.name} <span className='block-kicker'>{b.kicker}</span>
								</span>
								<span className='block-desc'>{b.desc}</span>
							</span>
						</button>
					))}
				</div>
				<div className='code-panel' role='tabpanel'>
					<WinBar label='app.ts' size='md' className='panel-bar' />
					<div className='code code-block'>{current.code}</div>
					<a href={BINDINGS_DOC} target='_blank' rel='noopener' className='panel-link' lang='en'>
						Calling Go from the frontend ↗
					</a>
				</div>
			</div>

			{listed ? (
				<div className='rv cta-dashed cta-amber'>
					<div className='stack-6'>
						<h3 className='cta-h'>{t.state_more_h}</h3>
						<p className='cta-p cta-p-15'>{t.state_empty_p}</p>
					</div>
					<button type='button' className='btn-amber' onClick={() => openSubmit('state')}>
						{t.sub_state}
					</button>
				</div>
			) : (
				<div className='dots rv empty-state'>
					<Docky variant='laptop' />
					<h2 className='empty-h'>{t.state_empty_h}</h2>
					<p className='empty-p'>{t.state_empty_p}</p>
					<button type='button' className='btn-amber' onClick={() => openSubmit('state')}>
						{t.sub_state}
					</button>
				</div>
			)}
		</section>
	);
}
