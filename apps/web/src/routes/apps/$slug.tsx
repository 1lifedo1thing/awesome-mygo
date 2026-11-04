import { appBySlug, pick } from '@awesome-mygo/catalog';
import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { AppActions, AppFacts, MoreBy, neighbours } from '../../components/AppDetail';
import { AppLink, KindTag, MonoTile, WinBar, appView } from '../../components/bits';
import { useLang, useT } from '../../lib/lang';
import { appHead } from '../../lib/seo';

// An app's own page: what the showcase cards link to and what search engines index. The drawer stays as the quick view on the listing pages.
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
	const [prev, next] = neighbours(v);

	return (
		<article className='page enter gap-32'>
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
			<header className='app-head'>
				<MonoTile view={v} size={56} />
				<div className='stack-8'>
					<KindTag app={app} label={kindLabel} />
					<h1 className='page-h1 app-h1'>{app.name}</h1>
					<p className='page-p'>{pick(app.desc, lang)}</p>
				</div>
			</header>
			<div className='app-grid'>
				<div className='app-main'>
					{app.image ? (
						<div className='app-shot'>
							<WinBar label={v.host} size='md' className='card-bar' />
							<div className='drawer-shot'>
								<img src={app.image} alt={`${app.name} ${t.app_shot}`} width={1200} height={750} fetchPriority='high' decoding='async' />
							</div>
						</div>
					) : (
						<div className='app-shot dots drawer-hero'>
							<span aria-hidden='true' className='drawer-num'>
								{v.num}
							</span>
							<MonoTile view={v} size={112} />
						</div>
					)}
					<p className='drawer-desc'>{pick(app.about, lang)}</p>
				</div>
				<div className='app-side'>
					<AppFacts view={v} kindLabel={kindLabel} />
					<AppActions app={app} />
					<MoreBy app={app} drawer={false} />
				</div>
			</div>
			<nav aria-label={t.a_pager} className='app-pager'>
				<AppLink slug={prev.slug} quick={false} className='btn-g pager'>
					← {prev.name}
				</AppLink>
				<AppLink slug={next.slug} quick={false} className='btn-g pager'>
					{next.name} →
				</AppLink>
			</nav>
		</article>
	);
}
