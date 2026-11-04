import { type App, APPS, appBySlug, fill, pick } from '@awesome-mygo/catalog';
import { useDialog } from '../lib/dialog';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { CloseIcon, KindTag, MonoTile, WinBar, appView } from './bits';

export function AppDrawer() {
	const { app: slug } = useSite();
	const app = slug ? appBySlug(slug) : undefined;
	return app ? <Drawer app={app} /> : null;
}

// Stays mounted while prev/next/"more by" switch apps, so focus and scroll lock are not reset on every switch.
function Drawer({ app }: { app: App }) {
	const { closeApp, openApp, copy, copied } = useSite();
	const t = useT();
	const lang = useLang();
	const ref = useDialog<HTMLElement>();

	const v = appView(app);
	const kindLabel = app.kind === 'native' ? 'Native UI' : t.web_fe;
	const others = APPS.filter((o) => o.author === app.author && o !== app).slice(0, 6);
	const n = APPS.length;
	const prev = APPS[(v.index - 1 + n) % n];
	const next = APPS[(v.index + 1) % n];

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
						<img key={app.slug} src={app.image} alt={`${app.name} ${t.shot}`} width={1200} height={750} decoding='async' />
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
					</div>
					<dl className='facts'>
						<dt>{t.f_author}</dt>
						<dd>{app.author}</dd>
						<dt>{t.f_ui}</dt>
						<dd>{kindLabel}</dd>
						<dt>{t.f_site}</dt>
						<dd className='mono-13 break'>{v.host}</dd>
						<dt>{t.f_no}</dt>
						<dd className='mono-13'>
							#{v.num} / {n}
						</dd>
					</dl>
					<div className='drawer-acts'>
						<a className='btn-c btn-open' href={app.url} target='_blank' rel='noopener'>
							{fill(t.open_x, { x: app.name })}
						</a>
						<button type='button' className='btn-g btn-copy-link' onClick={() => copy(app.url, 'det')}>
							{copied === 'det' ? t.copied : t.copy_link}
						</button>
					</div>
					{others.length > 0 && (
						<div className='stack-10'>
							<span className='kicker-muted'>{fill(t.more_by, { x: app.author })}</span>
							<div className='others'>
								{others.map((o) => (
									<button key={o.slug} type='button' className='row other' onClick={() => openApp(o.slug)}>
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
									</button>
								))}
							</div>
						</div>
					)}
				</div>
				<div className='drawer-foot'>
					<button type='button' className='btn-g pager' onClick={() => openApp(prev.slug)}>
						← {prev.name}
					</button>
					<button type='button' className='btn-g pager' onClick={() => openApp(next.slug)}>
						{next.name} →
					</button>
				</div>
			</aside>
		</div>
	);
}
