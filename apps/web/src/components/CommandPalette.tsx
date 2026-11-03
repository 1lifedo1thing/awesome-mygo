import { type SearchCat, buildSearchIndex, fill, pad2, searchCatalog } from '@awesome-mygo/catalog';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Docky, SearchIcon } from './bits';

const JUMPS = [
	{ to: '/', key: 'nav_home' },
	{ to: '/ui', key: 'cat_ui_name' },
	{ to: '/state', key: 'cat_state_name' },
	{ to: '/plugins', key: 'nav_plugins' },
	{ to: '/showcase', key: 'cat_show_name' },
	{ to: '/learn', key: 'learn_h' },
] as const;

export function CommandPalette() {
	const { palette, closePalette, openApp, openSubmit } = useSite();
	if (!palette) return null;
	return <Palette onClose={closePalette} onApp={openApp} onSubmit={() => openSubmit()} />;
}

// Mounted only while open, so the query resets every time it opens.
function Palette({ onClose, onApp, onSubmit }: { onClose: () => void; onApp: (slug: string) => void; onSubmit: () => void }) {
	const t = useT();
	const lang = useLang();
	const navigate = useNavigate();
	const [q, setQ] = useState('');
	const index = useMemo(() => buildSearchIndex(lang), [lang]);
	const results = searchCatalog(index, q);
	const hasQuery = q.trim() !== '';
	const catLabel: Record<SearchCat, string> = { ui: t.cat_ui_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article };

	const go = (to: (typeof JUMPS)[number]['to']) => {
		onClose();
		void navigate({ to });
	};

	return (
		<div className='overlay overlay-top fade'>
			<div role='dialog' aria-modal='true' aria-label={t.search} className='palette enter'>
				<div className='palette-head'>
					<SearchIcon size={20} stroke='#3FD3F5' />
					<label htmlFor='q' className='sr'>
						{t.search_label}
					</label>
					<input id='q' type='search' autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search_ph} autoComplete='off' className='palette-input' />
					<button type='button' onClick={onClose} aria-label={t.close} className='kbd-btn'>
						{t.close}
					</button>
				</div>
				<div className='palette-body'>
					{!hasQuery && (
						<>
							<span className='palette-kicker'>{t.jump}</span>
							{JUMPS.map((j, i) => (
								<button key={j.to} type='button' className='row jump' onClick={() => go(j.to)}>
									<span className='jump-num'>{pad2(i + 1)}</span>
									{t[j.key]}
								</button>
							))}
						</>
					)}
					{hasQuery && (
						<>
							<span className='palette-kicker'>{fill(t.results, { x: String(results.length) })}</span>
							{results.map((r) => (
								<button
									key={`${r.cat}:${r.name}`}
									type='button'
									className='row result'
									onClick={() => {
										const tg = r.target;
										if (tg.type === 'url') window.open(tg.url, '_blank', 'noopener');
										else if (tg.type === 'page') go(tg.path);
										else onApp(tg.slug);
									}}
								>
									<span className='result-cat'>{catLabel[r.cat]}</span>
									<span className='result-text'>
										<span className='result-name'>{r.name}</span>
										<span className='result-desc'>{r.desc}</span>
									</span>
									<span aria-hidden='true' className='c-cyan'>
										{r.target.type === 'url' ? '↗' : '→'}
									</span>
								</button>
							))}
							{results.length === 0 && (
								<div className='no-res'>
									<Docky variant='sleepy' />
									<p>{t.no_res}</p>
									<button type='button' className='btn-c btn-44' onClick={onSubmit}>
										{t.submit_it}
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
