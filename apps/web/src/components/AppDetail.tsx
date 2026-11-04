import { type App, APPS, fill, pick } from '@awesome-mygo/catalog';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { AppLink, type AppView } from './bits';

// The parts of an app's details shared by the quick-view drawer and the app's own page.

export function AppFacts({ view, kindLabel }: { view: AppView; kindLabel: string }) {
	const t = useT();
	return (
		<dl className='facts'>
			<dt>{t.f_author}</dt>
			<dd>{view.app.author}</dd>
			<dt>{t.f_ui}</dt>
			<dd>{kindLabel}</dd>
			<dt>{t.f_site}</dt>
			<dd className='mono-13 break'>{view.host}</dd>
			<dt>{t.f_no}</dt>
			<dd className='mono-13'>
				#{view.num} / {APPS.length}
			</dd>
		</dl>
	);
}

export function AppActions({ app }: { app: App }) {
	const t = useT();
	const { copy, copied } = useSite();
	return (
		<div className='drawer-acts'>
			<a className='btn-c btn-open' href={app.url} target='_blank' rel='noopener'>
				{fill(t.open_x, { x: app.name })}
			</a>
			<button type='button' className='btn-g btn-copy-link' onClick={() => copy(app.url, 'det')}>
				{copied === 'det' ? t.copied : t.copy_link}
			</button>
		</div>
	);
}

// Other apps by the same author. In the drawer a plain click switches the drawer to the app; on the app's page the rows are plain links to the other apps' pages, under a heading.
export function MoreBy({ app, drawer }: { app: App; drawer: boolean }) {
	const t = useT();
	const lang = useLang();
	const others = APPS.filter((o) => o.author === app.author && o !== app).slice(0, 6);
	if (others.length === 0) return null;
	const label = fill(t.more_by, { x: app.author });
	return (
		<div className='stack-10'>
			{drawer ? <span className='kicker-muted'>{label}</span> : <h2 className='kicker-muted app-sub-h'>{label}</h2>}
			<div className='others'>
				{others.map((o) => (
					<AppLink key={o.slug} slug={o.slug} quick={drawer} className='row other'>
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
		</div>
	);
}

// The previous and next app in catalog order, wrapping around.
export function neighbours(view: AppView): [App, App] {
	const n = APPS.length;
	return [APPS[(view.index - 1 + n) % n], APPS[(view.index + 1) % n]];
}
