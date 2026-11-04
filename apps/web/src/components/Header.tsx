import { DEFAULT_LANG, LANGS, type RootSearch, langDef } from '@awesome-mygo/catalog';
import { Link, useLocation } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useLang, useSetLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { switchTheme } from '../lib/theme';
import { Logo, SearchIcon } from './bits';

export const NAV = [
	{ to: '/', key: 'nav_home' },
	{ to: '/ui', key: 'nav_ui' },
	{ to: '/state', key: 'nav_state' },
	{ to: '/plugins', key: 'nav_plugins' },
	{ to: '/showcase', key: 'nav_showcase' },
	{ to: '/learn', key: 'nav_learn' },
] as const;

export function Header({ scrolled }: { scrolled: boolean }) {
	const t = useT();
	const lang = useLang();
	const setLang = useSetLang();
	const { openPalette, openSubmit } = useSite();
	const [menu, setMenu] = useState(false);
	const [langMenu, setLangMenu] = useState(false);
	const langRef = useRef<HTMLDivElement>(null);
	const pathname = useLocation({ select: (l) => l.pathname });

	// Any navigation closes the mobile menu and the language menu.
	useEffect(() => {
		setMenu(false);
		setLangMenu(false);
	}, [pathname]);

	useEffect(() => {
		if (!langMenu) return;
		const outside = (e: PointerEvent) => {
			if (!langRef.current?.contains(e.target as Node)) setLangMenu(false);
		};
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setLangMenu(false);
		};
		document.addEventListener('pointerdown', outside);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', outside);
			document.removeEventListener('keydown', esc);
		};
	}, [langMenu]);

	return (
		<header className='hdr' data-scrolled={scrolled}>
			<div className='hdr-in'>
				<Link to='/' aria-label={t.a_home} className='brand'>
					<Logo />
					<span className='brand-name'>
						MyGo <span className='c-cyan'>Dock</span>
					</span>
				</Link>
				<nav id='sitenav' className='navwrap' data-open={menu} aria-label={t.a_cats}>
					{NAV.map((n) => (
						<Link key={n.to} to={n.to} className='navb' activeOptions={{ exact: true, includeSearch: false }} onClick={() => setMenu(false)}>
							{t[n.key]}
						</Link>
					))}
				</nav>
				<div className='acts'>
					<button type='button' className='btn-g sbtn' onClick={openPalette} aria-label={t.search_label}>
						<SearchIcon />
						<span className='lbl'>{t.search_btn}</span>
					</button>
					<div className='lang' ref={langRef}>
						<button type='button' className='btn-g lang-btn' onClick={() => setLangMenu((v) => !v)} aria-haspopup='menu' aria-expanded={langMenu} aria-label={t.lang}>
							<svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
								<circle cx='12' cy='12' r='9' />
								<path d='M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z' />
							</svg>
							<span>{langDef(lang).short}</span>
						</button>
						{/* Always rendered, and hidden while closed, so every page links to its other language versions for crawlers. Active means the exact URL: by default a link is active when its search is a subset of the current one, which made 简体中文 (no lang) active on every page. A plain click switches in place and saves the choice; a click with a modifier key or a middle click opens the link. */}
						<div role='menu' aria-label={t.lang} className='lang-menu enter' hidden={!langMenu}>
							{LANGS.map((L) => (
								<Link
									key={L.code}
									to='.'
									search={(prev: RootSearch): RootSearch => ({ ...prev, lang: L.code === DEFAULT_LANG ? undefined : L.code })}
									activeOptions={{ exact: true }}
									role='menuitemradio'
									aria-checked={L.code === lang}
									className='row lang-item'
									lang={L.code}
									hrefLang={L.code}
									onClick={(e) => {
										if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
										e.preventDefault();
										setLangMenu(false);
										setLang(L.code);
									}}
								>
									<span>{L.native}</span>
									<span className='lang-code'>{L.code}</span>
								</Link>
							))}
						</div>
					</div>
					{/* Shares the search button's look, including hiding its label on narrow screens, without the search button's minimum width. */}
					<button type='button' className='btn-g sbtn' style={{ minWidth: 0 }} onClick={() => switchTheme('retro')} aria-label={`${t.a_theme}: ${t.theme_retro}`}>
						<svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='square'>
							<rect x='3' y='4' width='18' height='13' />
							<path d='M8 21h8M12 17v4M7 8h4' />
						</svg>
						<span className='lbl'>{t.theme_retro}</span>
					</button>
					<button type='button' className='btn-c submit-btn' onClick={() => openSubmit()}>
						{t.submit_short}
					</button>
					<button type='button' className='burger btn-g' onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-controls='sitenav' aria-label={t.menu}>
						<svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
							<path d='M4 7h16M4 12h16M4 17h16' />
						</svg>
					</button>
				</div>
			</div>
		</header>
	);
}
