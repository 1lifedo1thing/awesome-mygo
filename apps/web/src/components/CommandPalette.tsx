import { type SearchCat, type SearchItem, buildSearchIndex, fill, pad2, searchCatalog } from '@awesome-mygo/catalog';
import { useNavigate } from '@tanstack/react-router';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from '../lib/dialog';
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
	const { palette, openPalette, closePalette, openApp, openSubmit } = useSite();

	// ⌘K / Ctrl+K opens search from anywhere.
	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				openPalette();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [openPalette]);

	if (!palette) return null;
	return <Palette onClose={closePalette} onApp={openApp} onSubmit={() => openSubmit()} />;
}

// Mounted only while open, so the query resets every time it opens.
function Palette({ onClose, onApp, onSubmit }: { onClose: () => void; onApp: (slug: string) => void; onSubmit: () => void }) {
	const t = useT();
	const lang = useLang();
	const navigate = useNavigate();
	const ref = useDialog<HTMLDivElement>();
	const listRef = useRef<HTMLDivElement>(null);
	const [q, setQ] = useState('');
	const [active, setActive] = useState(0);
	const index = useMemo(() => buildSearchIndex(lang), [lang]);
	const results = searchCatalog(index, q);
	const hasQuery = q.trim() !== '';
	const catLabel: Record<SearchCat, string> = { ui: t.cat_ui_name, state: t.cat_state_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article };

	const go = (to: (typeof JUMPS)[number]['to']) => {
		onClose();
		void navigate({ to });
	};
	const open = (r: SearchItem) => {
		const tg = r.target;
		if (tg.type === 'url') window.open(tg.url, '_blank', 'noopener');
		else if (tg.type === 'page') go(tg.path);
		else onApp(tg.slug);
	};

	const count = hasQuery ? results.length : JUMPS.length;
	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (count === 0) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + count) % count;
			setActive(next);
			listRef.current?.querySelector(`[data-i="${next}"]`)?.scrollIntoView({ block: 'nearest' });
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (hasQuery) open(results[Math.min(active, count - 1)]);
			else go(JUMPS[Math.min(active, count - 1)].to);
		}
	};

	return (
		<div className='overlay overlay-top fade'>
			<div ref={ref} role='dialog' aria-modal='true' aria-label={t.search} className='palette enter'>
				<div className='palette-head'>
					<SearchIcon size={20} stroke='#3FD3F5' />
					<label htmlFor='q' className='sr'>
						{t.search_label}
					</label>
					<input
						id='q'
						type='search'
						autoFocus
						value={q}
						onChange={(e) => {
							setQ(e.target.value);
							setActive(0);
						}}
						onKeyDown={onKeyDown}
						placeholder={t.search_ph}
						autoComplete='off'
						className='palette-input'
						role='combobox'
						aria-expanded='true'
						aria-controls='palette-list'
						aria-activedescendant={count > 0 ? `pi-${active}` : undefined}
					/>
					<button type='button' onClick={onClose} aria-label={t.close} className='kbd-btn'>
						{t.close}
					</button>
				</div>
				<div id='palette-list' role='listbox' aria-label={t.search} className='palette-body' ref={listRef}>
					{!hasQuery && (
						<>
							<span className='palette-kicker'>{t.jump}</span>
							{JUMPS.map((j, i) => (
								<button key={j.to} id={`pi-${i}`} data-i={i} role='option' aria-selected={i === active} type='button' className='row jump' onClick={() => go(j.to)} onPointerMove={() => setActive(i)}>
									<span className='jump-num'>{pad2(i + 1)}</span>
									{t[j.key]}
								</button>
							))}
						</>
					)}
					{hasQuery && (
						<>
							<span className='palette-kicker'>{fill(t.results, { x: String(results.length) })}</span>
							{results.map((r, i) => (
								<button key={`${r.cat}:${r.name}`} id={`pi-${i}`} data-i={i} role='option' aria-selected={i === active} type='button' className='row result' onClick={() => open(r)} onPointerMove={() => setActive(i)}>
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
				<div className='palette-foot' aria-hidden='true'>
					{t.kbd_hint}
				</div>
			</div>
		</div>
	);
}
