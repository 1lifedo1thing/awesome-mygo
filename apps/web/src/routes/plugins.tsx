import { CLI_CMDS, COMMUNITY_PLUGINS, PLUGINS, PLUGINS_DOC, type PluginSurface, fill, likeKey, pick } from '@awesome-mygo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WinBar } from '../components/bits';
import { LikeButton } from '../components/Like';
import { useLikes } from '../lib/likes';
import { validatePluginsSearch } from '../lib/page-search';
import { useLang, useT } from '../lib/lang';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

// The letter tile's colour cycles by position, as the showcase's tiles do.
const TONES = ['tone-0', 'tone-1', 'tone-2'] as const;

// `import "github.com/egoist/mygo/plugins/fetch"`, split before its last two segments.
function goLine(path: string): { head: string; tail: string } {
	const parts = path.split('/');
	const cut = Math.max(parts.length - 2, 1);
	return { head: `import "${parts.slice(0, cut).join('/')}/`, tail: `${parts.slice(cut).join('/')}"` };
}

export const Route = createFileRoute('/plugins')({
	// ?surface= and ?sort= keep the filter and the order in the address, so a link reproduces the view.
	validateSearch: validatePluginsSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/plugins', title: 'title_plugins', desc: 'desc_plugins', name: 'nav_plugins' }),
	component: PluginsPage,
});

function PluginsPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit, copy, copied } = useSite();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: '/plugins' });
	const setSearch = (next: typeof search) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const surface = search.surface ?? 'all';
	const setSurface = (s: 'all' | 'web' | 'native') => setSearch({ surface: s === 'all' ? undefined : s });
	const surfLabel: Record<PluginSurface, string> = { web: t.surf_web, native: t.surf_native, both: t.surf_both };
	// A plugin for both kinds of window shows under either filter.
	const fits = (s: PluginSurface) => surface === 'all' || s === surface || s === 'both';
	const { status: likes, counts } = useLikes();
	// With likes off there is no most-liked order to show, whatever the link says.
	const byLikes = search.sort === 'likes' && likes !== 'off';
	const setByLikes = (on: boolean) => setSearch({ sort: on ? 'likes' : undefined });
	const shown = PLUGINS.filter((p) => fits(p.surface));
	// Most liked first; ties keep the docs' order.
	if (byLikes) shown.sort((a, b) => (counts[likeKey.plugin(b)] ?? 0) - (counts[likeKey.plugin(a)] ?? 0));
	const chips = [
		{ key: 'all' as const, label: `${t.all} · ${PLUGINS.length}` },
		{ key: 'web' as const, label: `${t.surf_web} · ${PLUGINS.filter((p) => p.surface !== 'native').length}` },
		{ key: 'native' as const, label: `${t.surf_native} · ${PLUGINS.filter((p) => p.surface !== 'web').length}` },
	];
	return (
		<section className='page enter gap-40'>
			<div className='stack-14'>
				<span className='kicker' lang='en'>~/PLUGINS · {PLUGINS.length} OFFICIAL</span>
				<h1 className='page-h1'>{t.nav_plugins}</h1>
				<p className='page-p mw-720'>{t.plug_p}</p>
			</div>
			<div className='filterbar'>
				<div className='chips' role='group' aria-label={t.a_filter}>
					{chips.map((c) => (
						<button key={c.key} type='button' className='chip' onClick={() => setSurface(c.key)} aria-pressed={surface === c.key}>
							{c.label}
						</button>
					))}
				</div>
				{likes !== 'off' && (
					<div className='sort'>
						<label htmlFor='sort' className='sort-label'>
							{t.sort}
						</label>
						<select id='sort' value={byLikes ? 'likes' : 'default'} onChange={(e) => setByLikes(e.target.value === 'likes')} className='sort-select'>
							<option value='default'>{t.sort_def}</option>
							<option value='likes'>{t.sort_likes}</option>
						</select>
					</div>
				)}
			</div>
			<div className='plug-grid'>
				{shown.map((p, k) => {
					// What the docs say to do first: import the Go package, and add the frontend package when there is one. `tail` is the part that tells the lines apart (the package's last two segments), which stays whole while `head` gives way to an ellipsis on a narrow card.
					const setup = [...(p.goImport ? [{ key: `plug:${p.slug}:go` as const, ...goLine(p.goImport) }] : []), ...(p.npm ? [{ key: `plug:${p.slug}:npm` as const, head: 'bun add ', tail: p.npm }] : [])];
					return (
						<div key={p.slug} className={`rv d${k % 6} flex`}>
							<article className='win card plug-card'>
								<WinBar label={`plugins/${p.slug}`} size='md' className='card-bar'>
									<a className='plug-bar-docs' href={p.url} target='_blank' rel='noopener'>
										{t.docs_link}
									</a>
								</WinBar>
								<div className='plug-body'>
									<div className='show-id'>
										<span className={`mono-tile mono-44 ${TONES[k % 3]}`} aria-hidden='true'>
											{p.mark}
										</span>
										<div className='show-id-text'>
											<h2 className='show-name'>
												<a className='plug-link' href={p.url} target='_blank' rel='noopener'>
													{p.name}
												</a>
											</h2>
											<span className={`surf surf-${p.surface}`}>{surfLabel[p.surface]}</span>
										</div>
										<LikeButton item={likeKey.plugin(p)} name={p.name} className='like-btn like-end' />
									</div>
									<p className='show-desc'>{pick(p.desc, lang)}</p>
									{setup.length > 0 && (
										<div className='plug-setup'>
											{setup.map((line) => (
												<div key={line.key} className='cmd-row plug-cmd'>
													<code className='plug-cmd-text' lang='en'>
														<span className='plug-cmd-head'>{line.head}</span>
														<span className='plug-cmd-tail'>{line.tail}</span>
													</code>
													<button type='button' className='cmd-copy' onClick={() => copy(line.head + line.tail, line.key)} aria-label={`${t.copy}: ${line.head}${line.tail}`}>
														{copied === line.key ? t.copied : t.copy}
													</button>
												</div>
											))}
										</div>
									)}
									<span className='plug-tags'>
										{p.tags.map((tg) => (
											<span key={tg} className='plug-tag' lang='en'>
												{tg}
											</span>
										))}
									</span>
								</div>
							</article>
						</div>
					);
				})}
			</div>
			<div className='rv cli'>
				<WinBar label='mygo-cli' size='md' className='panel-bar' />
				<div className='cli-body'>
					<div className='stack-8'>
						<h2 className='cli-h'>{t.tool_h}</h2>
						<p className='cli-p'>{t.tool_p}</p>
					</div>
					<div className='stack-8'>
						{CLI_CMDS.map((cmd, i) => {
							const key = i === 0 ? 'cmd0' : 'cmd1';
							return (
								<div key={cmd} className='cmd-row'>
									<span className='cmd-text'>
										<span className='c-cyan'>❯ </span>
										{cmd}
									</span>
									<button type='button' className='cmd-copy' onClick={() => copy(cmd, key)} aria-label={t.a_copy_cmd}>
										{copied === key ? t.copied : t.copy}
									</button>
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<div className='rv cta-dashed'>
				<div className='stack-6'>
					<h2 className='cta-h'>{COMMUNITY_PLUGINS.length > 0 ? fill(t.comm_h, { n: COMMUNITY_PLUGINS.length }) : t.comm_none}</h2>
					<p className='cta-p cta-p-15'>{t.comm_p}</p>
				</div>
				<div className='cta-acts'>
					<a className='btn-g btn-44 btn-outline' href={PLUGINS_DOC} target='_blank' rel='noopener'>
						{t.guide}
					</a>
					<button type='button' className='btn-c btn-44' onClick={() => openSubmit('plugin')}>
						{t.sub_plugin}
					</button>
				</div>
			</div>
		</section>
	);
}
