import { DEFAULT_LANG, type LangCode, langRedirectScript } from '@awesome-mygo/catalog';
import { HeadContent, Link, Outlet, Scripts, createRootRoute, retainSearchParams } from '@tanstack/react-router';
import { type ReactNode, useEffect } from 'react';
import { AppDrawer } from '../components/AppDrawer';
import { Background } from '../components/Background';
import { BackToTop, Footer, Toast } from '../components/Chrome';
import { CommandPalette } from '../components/CommandPalette';
import { Header } from '../components/Header';
import { SubmitModal } from '../components/SubmitModal';
import { type RootSearch, useLang, useT, validateRootSearch } from '../lib/lang';
import { useReveal, useScrolledPast } from '../lib/motion';
import { SiteProvider, useSite } from '../lib/site';
import styles from '../styles.css?url';

// Only the CJK face of the page's language is requested (the others' stylesheets alone are large), and only the weights the styles use. English keeps Simplified Chinese as the fallback for app names such as 留白.
const LANG_REDIRECT = langRedirectScript();

const CJK: Record<LangCode, string> = {
	'zh-CN': 'Noto+Sans+SC',
	'zh-TW': 'Noto+Sans+TC',
	en: 'Noto+Sans+SC',
	ja: 'Noto+Sans+JP',
	ko: 'Noto+Sans+KR',
};

function fontsHref(lang: LangCode): string {
	const families = ['Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800', 'JetBrains+Mono:wght@400;700', `${CJK[lang]}:wght@400;500;600;700;900`];
	if (lang === 'en') families.unshift('Inter:wght@400;500;600;700;800;900');
	return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}

export const Route = createRootRoute({
	validateSearch: validateRootSearch,
	search: { middlewares: [retainSearchParams<RootSearch>(['lang'])] },
	head: ({ match }) => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'theme-color', content: '#0B0D10' },
			{ name: 'color-scheme', content: 'dark' },
		],
		links: [
			{ rel: 'icon', href: '/favicon.ico', sizes: 'any' },
			{ rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icon-32.png' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' },
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
			{ rel: 'stylesheet', href: fontsHref(match.search.lang ?? DEFAULT_LANG) },
			{ rel: 'stylesheet', href: styles },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	return (
		<RootDocument>
			<SiteProvider>
				<Shell />
			</SiteProvider>
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	const lang = useLang();

	return (
		<html lang={lang}>
			<head>
				{/* A bare URL is Simplified Chinese. A first visit with a saved choice or another browser language goes to its ?lang= page before anything renders, so the server serves that language and React never switches it mid-hydration. */}
				<script dangerouslySetInnerHTML={{ __html: LANG_REDIRECT }} />
				<HeadContent />
				<noscript>
					<style>{'.rv{opacity:1;transform:none}'}</style>
				</noscript>
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function Shell() {
	const scrolled = useScrolledPast(600);
	const site = useSite();
	useReveal();

	// Escape closes the topmost overlay.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (site.palette) site.closePalette();
			else if (site.modal) site.closeSubmit();
			else if (site.app) site.closeApp();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [site]);

	return (
		<div className='site'>
			<Background />
			<Header scrolled={scrolled} />
			<main className='main'>
				<Outlet />
			</main>
			<Footer />
			<BackToTop show={scrolled} />
			<AppDrawer />
			<CommandPalette />
			<SubmitModal />
			<Toast />
		</div>
	);
}

function NotFound() {
	const t = useT();
	return (
		<section className='page enter nf'>
			<span className='kicker'>~/404</span>
			<h1 className='page-h1'>{t.nf_h}</h1>
			<p className='page-p'>{t.nf_p}</p>
			<Link to='/' className='btn-c btn-44 nf-home'>
				{t.a_home}
			</Link>
		</section>
	);
}
