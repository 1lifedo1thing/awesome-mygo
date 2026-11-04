import { APPS, INSTALL_CMDS, INSTALL_TABS, type InstallTab, MYGO_SITE, PLUGINS, STATE_SOLUTIONS, UI_LIBS, appBySlug, fill, langDef, pad2, pick } from '@awesome-mygo/catalog';
import { Link, createFileRoute } from '@tanstack/react-router';
import { type CSSProperties, type PointerEvent, useRef, useState } from 'react';
import { KindTag, MonoTile, WinBar, appView } from '../components/bits';
import { useLang, useT } from '../lib/lang';
import { prefersReducedMotion, tilt, useCountUp } from '../lib/motion';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/', title: null, desc: 'hero_p', app: match.search.app }),
	component: HomePage,
});

// Placement of the four floating app windows around the code window in the hero.
const HERO_APPS = [
	{ slug: 'kero', left: 10, top: 130, w: 230, z: -180, ry: 14, pos: 'far', bob: 'bobd1', wi: 'wi3' },
	{ slug: 'pulse', left: 190, top: 50, w: 250, z: -60, ry: 8, pos: 'near', bob: 'bobd2', wi: 'wi2' },
	{ slug: 'mixmusic', left: 760, top: 50, w: 250, z: -60, ry: -8, pos: 'near', bob: 'bobd3', wi: 'wi2' },
	{ slug: 'godwit', left: 960, top: 130, w: 230, z: -180, ry: -14, pos: 'far', bob: 'bobd4', wi: 'wi3' },
] as const;

const FEATURED = ['mixmusic', 'kero', 'liubai', 'godwit'] as const;

function mustApp(slug: string) {
	const app = appBySlug(slug);
	if (!app) throw new Error(`Unknown app slug: ${slug}`);
	return app;
}

function tokens(str: string, byWord: boolean, start: number, step: number) {
	const parts = byWord ? str.split(' ').map((w, i, arr) => w + (i < arr.length - 1 ? ' ' : '')) : Array.from(str);
	return parts.map((c, i) => ({ c, d: start + i * step }));
}

function HomePage() {
	const t = useT();
	const lang = useLang();
	const { openApp } = useSite();
	const nApps = APPS.length;
	return (
		<div className='enter'>
			<Hero />
			<section aria-label={t.a_marquee} className='marq-wrap'>
				<div className='marq'>
					{[...APPS, ...APPS].map((a, i) => (
						<button key={`${a.slug}-${i}`} type='button' className='marq-item' onClick={() => openApp(a.slug)} tabIndex={i >= nApps ? -1 : undefined} aria-hidden={i >= nApps || undefined}>
							{a.icon ? (
								<img className='marq-icon app-icon' src={a.icon} alt='' width={36} height={36} loading='lazy' decoding='async' />
							) : (
								<span aria-hidden='true' className={`marq-icon marq-letter tone-${APPS.indexOf(a) % 3}`}>
									{a.name.charAt(0).toUpperCase()}
								</span>
							)}
							{a.name}
						</button>
					))}
				</div>
			</section>
			<Categories />
			<section aria-labelledby='fresh' className='sec sec-feat'>
				<div className='rv sec-head'>
					<div className='stack-10'>
						<span className='kicker'>02 / FEATURED</span>
						<h2 id='fresh' className='sec-h2'>
							{t.feat_h}
						</h2>
					</div>
					<Link to='/showcase' className='btn-g btn-44 btn-outline'>
						{fill(t.feat_all, { n: nApps })} <span className='arrow'>→</span>
					</Link>
				</div>
				<div className='feat-grid'>
					{FEATURED.map((slug, k) => {
						const v = appView(mustApp(slug));
						return (
							<div key={slug} className={`rv d${k} flex`}>
								<button type='button' className='win card' onClick={() => openApp(slug)} aria-haspopup='dialog'>
									<WinBar label={v.host} size='sm' className='card-bar' />
									<span className='card-body'>
										<MonoTile view={v} size={52} />
										<span className='card-name'>{v.app.name}</span>
										<span className='card-desc'>{pick(v.app.desc, lang)}</span>
									</span>
								</button>
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}

function Hero() {
	const t = useT();
	const lang = useLang();
	const { openApp, copy, copied } = useSite();
	const [tab, setTab] = useState<InstallTab>('bun');
	const heroRef = useRef<HTMLElement>(null);
	const e = useCountUp();
	const words = langDef(lang).words;
	const step1 = words ? 110 : 55;
	const l1 = tokens(t.h1_1, words, 100, step1);
	const l2 = tokens(t.h1_2, words, 100 + l1.length * step1 + 150, words ? 130 : 70);

	const onMove = (ev: PointerEvent<HTMLElement>) => {
		const el = heroRef.current;
		if (!el || prefersReducedMotion()) return;
		const r = el.getBoundingClientRect();
		el.style.setProperty('--px', (((ev.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
		el.style.setProperty('--py', (((ev.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
	};
	const onLeave = () => {
		heroRef.current?.style.setProperty('--px', '0');
		heroRef.current?.style.setProperty('--py', '0');
	};

	const stats = [
		{ n: String(Math.round(APPS.length * e)), label: t.st_apps },
		{ n: String(Math.round(PLUGINS.length * e)), label: t.st_plugins },
		{ n: String(Math.round(UI_LIBS.length * e)), label: t.st_libs },
		{ n: 'MIT', label: t.st_mit },
	];

	return (
		<section ref={heroRef} onPointerMove={onMove} onPointerLeave={onLeave} className='hero'>
			<div className='hero-in'>
				<Link to='/showcase' className='pill wi wi1'>
					<span className='live'>
						<span className='pulse live-dot' />
						LIVE
					</span>
					{fill(t.live_badge, { n: APPS.length })}
					<span className='arrow c-fg'>→</span>
				</Link>

				<h1 aria-label={`${t.h1_1} ${t.h1_2}`} className='hero-h1' data-words={words}>
					<span aria-hidden='true' className='block'>
						{l1.map((ch, i) => (
							<span key={i} className='ch' style={{ animationDelay: `${ch.d}ms` }}>
								{ch.c}
							</span>
						))}
					</span>
					<span aria-hidden='true' className='block hero-h1-2'>
						{l2.map((ch, i) => (
							<span key={i} className='ch' style={{ animationDelay: `${ch.d}ms` }}>
								{ch.c}
							</span>
						))}
					</span>
				</h1>

				<p className='hero-p wi wi2'>{t.hero_p}</p>

				<div className='install wi wi2'>
					<div role='tablist' aria-label={t.a_install} className='install-tabs'>
						{INSTALL_TABS.map((it) => (
							<button key={it.key} type='button' role='tab' aria-selected={tab === it.key} onClick={() => setTab(it.key)} className='install-tab'>
								{it.label}
							</button>
						))}
					</div>
					<code className='install-cmd'>
						<span className='c-cyan'>❯ </span>
						{INSTALL_CMDS[tab]}
					</code>
					<button type='button' className='btn-g install-copy' onClick={() => copy(INSTALL_CMDS[tab], 'cmd')} aria-label={t.a_copy_install}>
						{copied === 'cmd' ? t.copied : t.copy}
					</button>
				</div>

				<div className='hero-ctas wi wi3'>
					<Link to='/showcase' className='btn-c btn-52'>
						{t.explore} <span className='arrow'>→</span>
					</Link>
					<a className='btn-g btn-52 btn-ghost' href={MYGO_SITE} target='_blank' rel='noopener'>
						{t.site}
					</a>
				</div>

				<div className='stats wi wi3'>
					{stats.map((st) => (
						<span key={st.label}>
							<span className='stat-n'>{st.n}</span> {st.label}
						</span>
					))}
				</div>
			</div>

			<div className='stage'>
				<div aria-hidden='true' className='stage-glow' />
				<div className='wall'>
					{HERO_APPS.map((h) => {
						const v = appView(mustApp(h.slug));
						const style = { left: h.left, top: h.top, width: h.w, transform: `translateZ(${h.z}px) rotateY(${h.ry}deg)` } satisfies CSSProperties;
						return (
							<div key={h.slug} className={`side ${h.pos}`} style={style}>
								<div className={`bob ${h.bob}`}>
									<button type='button' className={`win hero-win wi ${h.wi}`} onClick={() => openApp(h.slug)}>
										<WinBar label={v.host} size='sm' className='card-bar' />
										<span className='hero-win-body'>
											<MonoTile view={v} size={52} />
											<span className='card-name'>{v.app.name}</span>
											<span className='hero-win-desc'>{pick(v.app.desc, lang)}</span>
											<KindTag app={v.app} label={v.app.kind === 'native' ? 'Native UI' : t.web_fe} />
										</span>
									</button>
								</div>
							</div>
						);
					})}
					<div className='center-win'>
						<div className='bob rel'>
							<div className='code-win wi wi2'>
								<WinBar size='lg' className='code-bar'>
									<span className='code-title'>my-app — main.go</span>
								</WinBar>
								<HeroCode />
							</div>
						</div>
					</div>
				</div>
				<div aria-hidden='true' className='stage-fade' />
			</div>
		</section>
	);
}

function HeroCode() {
	const ln = (n: number) => <span className='c-muted'>{n}</span>;
	return (
		<div className='code'>
			{ln(1)}  mygo.<span className='c-cyan'>Bind</span>(Greeter{'{}'}){'\n'}
			{ln(2)}  mygo.App.<span className='c-cyan'>WhenReady</span>(<span className='c-amber'>func</span>() {'{'}
			{'\n'}
			{ln(3)}    mygo.<span className='c-cyan'>NewWindow</span>(mygo.WindowOptions{'{'}
			{'\n'}
			{ln(4)}      Title: <span className='c-green'>"Hello"</span>, URL: <span className='c-green'>"/"</span>,{'\n'}
			{ln(5)}    {'})'}
			{'\n'}
			{ln(6)}  {'})'}
			{'\n'}
			{ln(7)}  <span className='c-amber'>if</span> err := mygo.App.<span className='c-cyan'>Run</span>(); err != <span className='c-amber'>nil</span> {'{'}
			{'\n'}
			{ln(8)}    log.Fatal(err){'\n'}
			{ln(9)}  {'}'}
			<span className='caret c-cyan'>▋</span>
		</div>
	);
}

function Categories() {
	const t = useT();
	const nState = STATE_SOLUTIONS.length;
	const cats = [
		{ to: '/showcase', span: 'b7', name: t.cat_show_name, path: '~/showcase', n: APPS.length, numTone: 'cyan', badge: t.cat_show_badge, amber: false, pulse: false, desc: t.cat_show_desc },
		{ to: '/plugins', span: 'b5', name: t.nav_plugins, path: '~/plugins', n: PLUGINS.length, numTone: 'fg', badge: t.cat_plug_badge, amber: false, pulse: false, desc: fill(t.cat_plug_desc, { n: PLUGINS.length }) },
		{ to: '/ui', span: 'b5', name: t.cat_ui_name, path: '~/ui', n: UI_LIBS.length, numTone: 'fg', badge: fill(t.cat_ui_badge, { n: UI_LIBS.length }), amber: false, pulse: false, desc: t.cat_ui_desc },
		{ to: '/state', span: 'b7', name: t.cat_state_name, path: '~/state', n: nState, numTone: nState ? 'fg' : 'dim', badge: nState ? fill(t.cat_state_count, { n: nState }) : t.cat_state_badge, amber: true, pulse: nState === 0, desc: t.cat_state_desc },
	] as const;
	return (
		<section aria-labelledby='cats' className='sec sec-cats'>
			<div className='rv sec-head'>
				<div className='stack-10'>
					<span className='kicker'>01 / CATEGORIES</span>
					<h2 id='cats' className='sec-h2'>
						{t.cats_h}
					</h2>
				</div>
				<p className='sec-src'>{t.cats_src}</p>
			</div>
			<div className='bento'>
				{cats.map((c, k) => (
					<div key={c.to} className={`rv ${c.span} d${k} flex`}>
						<Link to={c.to} className='tile cat-tile' {...tilt}>
							<span className='glare' aria-hidden='true' />
							<span className='cat-top'>
								<span className='mono-12 c-muted'>{c.path}</span>
								<span className={`badge ${c.amber ? 'badge-amber' : ''}`}>
									<span className={`badge-dot ${c.pulse ? 'pulse' : ''}`} />
									{c.badge}
								</span>
							</span>
							<span className={`cat-n num-${c.numTone}`}>{pad2(c.n)}</span>
							<span className='cat-bottom'>
								<span className='stack-6'>
									<span className='cat-name'>{c.name}</span>
									<span className='cat-desc'>{c.desc}</span>
								</span>
								<span className='arrow cat-arrow' aria-hidden='true'>
									→
								</span>
							</span>
						</Link>
					</div>
				))}
			</div>
		</section>
	);
}
