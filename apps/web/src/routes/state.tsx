import { BINDINGS_DOC, pad2 } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Docky, WinBar } from '../components/bits';
import { useT } from '../lib/lang';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/state')({
	head: ({ match }) => pageHead(match.search.lang, 'cat_state_name', 'state_p'),
	component: StatePage,
});

type BlockId = 'bind' | 'chan' | 'evt';

function StatePage() {
	const t = useT();
	const { openSubmit } = useSite();
	const [block, setBlock] = useState<BlockId>('bind');
	const blocks = [
		{ id: 'bind', kicker: 'mygo.Bind', name: t.blk_bind_n, desc: t.blk_bind_d, code: 'import { Greeter } from "./mygo" // generated\n\nawait Greeter.greet("Ada")' },
		{ id: 'chan', kicker: 'channels', name: t.blk_chan_n, desc: t.blk_chan_d, code: `// ${t.see}\n// docs/bindings.md › channels` },
		{ id: 'evt', kicker: 'typed events', name: t.blk_evt_n, desc: t.blk_evt_d, code: `// ${t.see}\n// docs/bindings.md › typed events` },
	] as const;
	const current = blocks.find((b) => b.id === block) ?? blocks[0];

	return (
		<section className='page enter gap-40'>
			<div className='stack-14'>
				<span className='kicker kicker-amber'>
					<span className='pulse amber-dot' />
					~/STATE · {t.cat_state_badge}
				</span>
				<h1 className='page-h1'>{t.cat_state_name}</h1>
				<p className='page-p mw-740'>{t.state_p}</p>
			</div>
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
					<a href={BINDINGS_DOC} target='_blank' rel='noopener' className='panel-link'>
						Calling Go from the frontend ↗
					</a>
				</div>
			</div>
			<div className='dots rv empty-state'>
				<Docky variant='laptop' />
				<h2 className='empty-h'>{t.state_empty_h}</h2>
				<p className='empty-p'>{t.state_empty_p}</p>
				<button type='button' className='btn-amber' onClick={() => openSubmit('state')}>
					{t.sub_state}
				</button>
			</div>
		</section>
	);
}
