import { type App, appBySlug, pick } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { useDialog } from '../lib/dialog';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { AppActions, AppFacts, MoreBy, neighbours } from './AppDetail';
import { AppLink, CloseIcon, KindTag, MonoTile, WinBar, appView } from './bits';

export function AppDrawer() {
	const { app: slug } = useSite();
	const app = slug ? appBySlug(slug) : undefined;
	return app ? <Drawer app={app} /> : null;
}

// Stays mounted while prev/next/"more by" switch apps, so focus and scroll lock are not reset on every switch.
function Drawer({ app }: { app: App }) {
	const { closeApp } = useSite();
	const t = useT();
	const lang = useLang();
	const ref = useDialog<HTMLElement>();

	const v = appView(app);
	const kindLabel = app.kind === 'native' ? 'Native UI' : t.web_fe;
	const [prev, next] = neighbours(v);

	return (
		<div className='drawer-wrap'>
			<button type='button' className='scrim fade' onClick={closeApp} aria-label={t.close_detail} tabIndex={-1} />
			<aside ref={ref} role='dialog' aria-modal='true' aria-labelledby='dt' className='drawer'>
				<div className='drawer-bar'>
					<WinBar label={v.host} size='lg' className='drawer-winbar' />
					<button type='button' className='btn-g icon-btn icon-40' onClick={closeApp} aria-label={t.close}>
						<CloseIcon />
					</button>
				</div>
				{app.image ? (
					<div className='drawer-shot'>
						<img key={app.slug} src={app.image} alt={`${app.name} ${t.app_shot}`} width={1200} height={750} decoding='async' />
					</div>
				) : (
					<div className='dots drawer-hero'>
						<span aria-hidden='true' className='drawer-num'>
							{v.num}
						</span>
						<MonoTile view={v} size={112} />
					</div>
				)}
				<div className='drawer-body'>
					<div className='stack-8'>
						<KindTag app={app} label={kindLabel} />
						<h2 id='dt' className='drawer-title'>
							{app.name}
						</h2>
						<p className='drawer-desc'>{pick(app.about, lang)}</p>
						<Link to='/apps/$slug' params={{ slug: app.slug }} className='inline-link'>
							{t.full_page}
						</Link>
					</div>
					<AppFacts view={v} kindLabel={kindLabel} />
					<AppActions app={app} />
					<MoreBy app={app} drawer />
				</div>
				<div className='drawer-foot'>
					<AppLink slug={prev.slug} className='btn-g pager'>
						← {prev.name}
					</AppLink>
					<AppLink slug={next.slug} className='btn-g pager'>
						{next.name} →
					</AppLink>
				</div>
			</aside>
		</div>
	);
}
