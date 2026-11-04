import { type App, APPS, type LangCode, appGroup, appSource, authorProfile, fill, hostOf, likeKey, pick } from '@awesome-mygo/catalog';
import { Link } from '@tanstack/react-router';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { AppLink, type AppView, MonoTile, appView } from './bits';
import { LikeButton } from './Like';

// The parts of an app's own page in the original look.

// The day the app joined the showcase, in the page's language. Formatted in UTC so the server's render and the visitor's browser agree on the day.
function addedOn(added: string, lang: LangCode): string {
	return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(added));
}

export function AppFacts({ view, kindLabel }: { view: AppView; kindLabel: string }) {
	const t = useT();
	const lang = useLang();
	const { app } = view;
	const src = appSource(app);
	const profile = authorProfile(app.author);
	const group = appGroup(app);
	return (
		<dl className='facts'>
			<dt>{t.f_author}</dt>
			<dd>
				{profile ? (
					<a href={profile} target='_blank' rel='noopener'>
						{app.author}
					</a>
				) : (
					app.author
				)}
			</dd>
			<dt>{t.f_ui}</dt>
			<dd>{kindLabel}</dd>
			<dt>{t.f_cat}</dt>
			<dd>
				<Link to='/showcase' search={{ cat: group }}>
					{t[`grp_${group}`]}
				</Link>
			</dd>
			<dt>{t.f_site}</dt>
			<dd className='mono-13 break'>
				<a href={app.url} target='_blank' rel='noopener'>
					{view.host}
				</a>
			</dd>
			{src && (
				<>
					<dt>{t.f_src}</dt>
					<dd className='mono-13 break'>
						<a href={src} target='_blank' rel='noopener'>
							{hostOf(src)}
						</a>
					</dd>
				</>
			)}
			{app.added && (
				<>
					<dt>{t.f_added}</dt>
					<dd>
						<time dateTime={app.added}>{addedOn(app.added, lang)}</time>
					</dd>
				</>
			)}
		</dl>
	);
}

export function AppActions({ app }: { app: App }) {
	const t = useT();
	const { copy, copied } = useSite();
	return (
		<div className='app-acts'>
			<a className='btn-c btn-open' href={app.url} target='_blank' rel='noopener'>
				{fill(t.open_x, { x: app.name })}
			</a>
			<button type='button' className='btn-g btn-copy-link' onClick={() => copy(app.url, 'det')}>
				{copied === 'det' ? t.copied : t.copy_link}
			</button>
			<LikeButton item={likeKey.app(app)} name={app.name} className='like-btn like-lg' size={18} />
		</div>
	);
}

// Other apps by the same author, under a heading: a grid of links to their pages, across the page below its body.
export function MoreBy({ app }: { app: App }) {
	const t = useT();
	const lang = useLang();
	const others = APPS.filter((o) => o.author === app.author && o !== app).slice(0, 6);
	if (others.length === 0) return null;
	const label = fill(t.more_by, { x: app.author });
	return (
		<section className='app-more'>
			<h2 className='app-sec-h'>{label}</h2>
			<div className='others'>
				{others.map((o) => (
					<AppLink key={o.slug} slug={o.slug} quick={false} className='row other'>
						{o.icon ? (
							<img className='other-tile app-icon' src={o.icon} alt='' width={32} height={32} loading='lazy' decoding='async' />
						) : (
							<span aria-hidden='true' className='other-tile'>
								{o.name.charAt(0).toUpperCase()}
							</span>
						)}
						<span className='other-text'>
							<span className='other-name'>{o.name}</span>
							<span className='other-desc'>{pick(o.desc, lang)}</span>
						</span>
						<span aria-hidden='true' className='c-muted'>
							→
						</span>
					</AppLink>
				))}
			</div>
		</section>
	);
}

// The previous and next app in catalog order, wrapping around.
export function neighbours(view: AppView): [App, App] {
	const n = APPS.length;
	return [APPS[(view.index - 1 + n) % n], APPS[(view.index + 1) % n]];
}

// The previous and next app as two cards: which way each goes, then the app's tile and name.
export function AppPager({ view }: { view: AppView }) {
	const t = useT();
	const [prev, next] = neighbours(view);
	const card = (app: App, dir: 'prev' | 'next') => (
		<AppLink slug={app.slug} quick={false} className={`app-pg app-pg-${dir}`}>
			<span className='app-pg-dir'>{dir === 'prev' ? `← ${t.pg_prev}` : `${t.pg_next} →`}</span>
			<span className='app-pg-app'>
				<MonoTile view={appView(app)} size={44} />
				<span className='app-pg-name'>{app.name}</span>
			</span>
		</AppLink>
	);
	return (
		<nav aria-label={t.a_pager} className='app-pager'>
			{card(prev, 'prev')}
			{card(next, 'next')}
		</nav>
	);
}
