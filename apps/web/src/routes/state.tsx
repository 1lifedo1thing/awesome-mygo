import { BINDINGS_DOC, STATE_SOLUTIONS, pad2, pick } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Docky, WinBar } from '../components/bits';
import { useLang, useT } from '../lib/lang';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/state')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/state', title: 'title_state', desc: 'desc_state', name: 'cat_state_name' }),
	component: StatePage,
});

type BlockId = 'bind' | 'chan' | 'evt';

function StatePage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit, copy, copied } = useSite();
	const [block, setBlock] = useState<BlockId>('bind');
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
					<div className='lib-grid state-list'>
						{STATE_SOLUTIONS.map((s, k) => (
							<div key={s.repo} className={`rv d${k} flex`}>
								<article className='win lib'>
									<WinBar label={`github.com/${s.repo}`} size='md' className='lib-bar' />
									{s.image && (
										<div className='lib-shot lib-shot-img'>
											<img src={s.image} alt={`${s.name} ${t.preview_img}`} width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' />
										</div>
									)}
									<div className='lib-body'>
										<div className='lib-head'>
											<div className='stack-4'>
												<h3 className='lib-name'>{s.name}</h3>
												<span className='lib-by'>
													<span lang='en'>by</span> {s.author}
												</span>
											</div>
											<span className='lib-tag lib-tag-amber'>{s.tags[0]}</span>
										</div>
										<p className='lib-desc'>{pick(s.desc, lang)}</p>
										<div className='cmd-row'>
											<span className='cmd-text'>
												<span className='c-cyan'>❯ </span>
												{s.install}
											</span>
											<button type='button' className='cmd-copy' onClick={() => copy(s.install, 'cmd0')} aria-label={t.a_copy_cmd}>
												{copied === 'cmd0' ? t.copied : t.copy}
											</button>
										</div>
										<div className='cta-acts'>
											<a className='btn-c btn-44' href={s.url} target='_blank' rel='noopener'>
												{t.on_github}
											</a>
											{s.homepage && (
												<a className='btn-g btn-44 btn-outline' href={s.homepage} target='_blank' rel='noopener'>
													{t.visit}
												</a>
											)}
										</div>
									</div>
								</article>
							</div>
						))}
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
