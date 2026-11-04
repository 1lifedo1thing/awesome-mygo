import { DEFAULT_LANG, type LangCode, appBySlug, langRedirectScript, t, validateRootSearch } from '@awesome-mygo/catalog';
import { HeadContent, Link, Outlet, Scripts, createRootRoute, redirect } from '@tanstack/react-router';
import { type ReactNode, Suspense, lazy, useEffect } from 'react';
import { preconnect } from 'react-dom';
import { AppDrawer } from '../components/AppDrawer';
import { Background } from '../components/Background';
import { BackToTop, Footer, Toast } from '../components/Chrome';
import { CommandPalette } from '../components/CommandPalette';
import { Header } from '../components/Header';
import { SubmitModal } from '../components/SubmitModal';
import { retainLang, useLang, useT } from '../lib/lang';
import { useReveal, useScrolledPast } from '../lib/motion';
import { SITE_NAME, ogLocaleAlternates } from '../lib/seo';
import { SiteProvider, useSite } from '../lib/site';
import { type Theme, readTheme } from '../lib/theme';
import retroStyles from '../retro/retro.css?url';
import styles from '../styles.css?url';

// The retro look's components load only for visitors who picked it.
const RetroApp = lazy(() => import('../retro/RetroApp'));

const LANG_REDIRECT = langRedirectScript();

// Only the CJK face of the page's language is requested (the others' stylesheets alone are large). The CJK family is limited to 400, 600 and 700: every weight adds about a hundred @font-face rules to this render-blocking stylesheet, and font matching renders the styles' 500 with the 400 face and 800/900 with the 700 face. English keeps Simplified Chinese as the fallback for app names such as 留白.
const CJK: Record<LangCode, string> = {
	'zh-CN': 'Noto+Sans+SC',
	'zh-TW': 'Noto+Sans+TC',
	en: 'Noto+Sans+SC',
	ja: 'Noto+Sans+JP',
	ko: 'Noto+Sans+KR',
};

function fontsHref(lang: LangCode): string {
	const families = ['Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800', 'JetBrains+Mono:wght@400;700', `${CJK[lang]}:wght@400;600;700`];
	if (lang === 'en') families.unshift('Inter:wght@400;500;600;700;800;900');
	return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}

export const Route = createRootRoute({
	validateSearch: validateRootSearch,
	search: { middlewares: [retainLang] },
	// ?app=<slug> on any page is the quick-view drawer, which only client-side navigation opens. A request for such a URL (an old shared link or the former sitemap entry) gets a permanent redirect to the app's own page, keeping the language, so the old URLs consolidate there. import.meta.env.SSR is a build-time constant, so the client bundle drops the check and the drawer keeps working.
	beforeLoad: ({ search }): { theme: Theme } => {
		if (import.meta.env.SSR && search.app && appBySlug(search.app)) throw redirect({ to: '/apps/$slug', params: { slug: search.app }, search: { lang: search.lang === DEFAULT_LANG ? undefined : search.lang }, statusCode: 301 });
		return { theme: readTheme() };
	},
	head: ({ match }) => {
		const lang = match.search.lang ?? DEFAULT_LANG;
		const retro = match.context.theme === 'retro';
		return {
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'theme-color', content: retro ? '#00a6d4' : '#0B0D10' },
			{ name: 'color-scheme', content: retro ? 'light' : 'dark' },
			// A path no route matches (or a notFound() a route throws) is handled here, the only route with a notFoundComponent; no page head runs then, so the 404 gets its title and noindex from the root. Matched pages set their own through pageHead.
			...(match._notFound ? [{ title: `${t(match.search.lang ?? DEFAULT_LANG).nf_h} · ${SITE_NAME}` }, { name: 'robots', content: 'noindex' }] : []),
		],
		links: [
			{ rel: 'icon', href: '/favicon.ico', sizes: 'any' },
			{ rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icon-32.png' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' },
			// Each look loads only its own stylesheet: the original with its Google Fonts, the desktop look with the reader's system fonts.
			...(retro
				? [{ rel: 'stylesheet', href: retroStyles }]
				: [{ rel: 'stylesheet', href: fontsHref(lang) }, { rel: 'stylesheet', href: styles }]),
		],
		};
	},
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	const { theme } = Route.useRouteContext();
	return (
		<RootDocument theme={theme}>
			<SiteProvider>
				{theme === 'retro' ? (
					<Suspense>
						<RetroApp />
					</Suspense>
				) : (
					<Shell />
				)}
			</SiteProvider>
		</RootDocument>
	);
}

function RootDocument({ theme, children }: { theme: Theme; children: ReactNode }) {
	const lang = useLang();
	// Through react-dom rather than head links: React emits these right after the charset and viewport, ahead of the stylesheets it hoists, whereas plain <link> elements land after them. The retro look serves its fonts itself.
	if (theme !== 'retro') {
		preconnect('https://fonts.googleapis.com');
		preconnect('https://fonts.gstatic.com', { crossOrigin: 'anonymous' });
	}

	return (
		<html lang={lang} data-theme={theme}>
			<head>
				{/* A bare URL is Simplified Chinese. A first visit with a saved choice or another browser language goes to its ?lang= page before anything renders, so the server serves that language and React never switches it mid-hydration. */}
				<script dangerouslySetInnerHTML={{ __html: LANG_REDIRECT }} />
				<HeadContent />
				{ogLocaleAlternates(lang).map((locale) => (
					<meta key={locale} property='og:locale:alternate' content={locale} />
				))}
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
