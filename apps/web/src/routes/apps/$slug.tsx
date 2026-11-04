import { appBySlug, appGroup, pick } from '@awesome-mygo/catalog';
import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { AppActions, AppFacts, AppPager, MoreBy } from '../../components/AppDetail';
import { KindTag, MonoTile, WinBar, appView } from '../../components/bits';
import { useLang, useT } from '../../lib/lang';
import { appHead } from '../../lib/seo';

// An app's own page: what the showcase cards and search open in the original look, and what search engines index. The retro look keeps a quick-view window over the listing pages.
export const Route = createFileRoute('/apps/$slug')({
	loader: ({ params }) => {
		if (!appBySlug(params.slug)) throw notFound();
	},
	head: ({ params, match }) => {
		const app = appBySlug(params.slug);
		return app ? appHead(app, match.search.lang) : {};
	},
	component: AppPage,
});

function AppPage() {
	const t = useT();
	const lang = useLang();
	const { slug } = Route.useParams();
	// The loader has already answered an unknown slug with the 404 page.
	const app = appBySlug(slug);
	if (!app) throw notFound();

	const v = appView(app);
	const kindLabel = app.kind === 'native' ? t.surf_native : t.web_fe;
	const group = appGroup(app);

	return (
		<article className='page enter app-page'>
			<nav aria-label={t.a_crumbs} className='crumbs'>
				<ol>
					<li>
						<Link to='/'>{t.nav_home}</Link>
					</li>
					<li>
						<Link to='/showcase'>{t.cat_show_name}</Link>
					</li>
					<li aria-current='page'>{app.name}</li>
				</ol>
			</nav>
			<header className='app-hero'>
				<div className='app-hero-icon'>
					{/* A blurred copy of the icon lights the space behind it. */}
					{/* The glow is the page's largest paint on a phone, and the icon below loads from the same URL, so it is fetched ahead of the fonts. */}
					{app.icon && <img className='app-hero-glow' src={app.icon} alt='' aria-hidden='true' width={96} height={96} decoding='async' fetchPriority='high' />}
					<MonoTile view={v} size={96} />
				</div>
				<div className='app-hero-text'>
					<p className='app-hero-meta'>
						<KindTag app={app} label={kindLabel} />
						<Link to='/showcase' search={{ cat: group }} className='app-hero-cat'>
							{t[`grp_${group}`]}
						</Link>
						<span className='app-hero-by'>
							<span lang='en'>by</span> {app.author}
						</span>
					</p>
					<h1 className='app-hero-h1'>{app.name}</h1>
					<p className='app-hero-sum'>{pick(app.desc, lang)}</p>
					<AppActions app={app} />
				</div>
			</header>
			<div className='app-body'>
				<div className='app-main'>
					{app.image && (
						<figure className='app-shot'>
							<WinBar label={v.host} size='md' className='card-bar' />
							<img src={app.image} alt={`${app.name} ${t.app_shot}`} width={1200} height={750} fetchPriority='high' decoding='async' />
						</figure>
					)}
					<section className='app-about' aria-labelledby='app-about-h'>
						<h2 id='app-about-h' className='app-sec-h'>
							{t.app_about}
						</h2>
						<p className='app-about-p'>{pick(app.about, lang)}</p>
					</section>
				</div>
				<aside className='app-side'>
					<AppFacts view={v} kindLabel={kindLabel} />
				</aside>
			</div>
			<MoreBy app={app} />
			<AppPager view={v} />
		</article>
	);
}
