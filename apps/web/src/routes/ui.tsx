import { HAS_SCORES, NATIVE_UI_DOCS, type Surface, UI_KEYS, UI_LIBS, type UiLibKey, likeKey, pick } from '@awesome-mygo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WinBar } from '../components/bits';
import { LikeButton } from '../components/Like';
import { ScoreButton } from '../components/Score';
import { useLang, useT } from '../lib/lang';
import { validateUiSearch } from '../lib/page-search';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';
import { useLikes } from '../lib/likes';
import { UI_DEFAULT_SORT, type UiSort, shownUiSort, sortUiLibs } from '../lib/ui';

export const Route = createFileRoute('/ui')({
	// ?tag=, ?surface= and ?sort= keep the filters and the order in the address, so a link reproduces the view.
	validateSearch: validateUiSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/ui', title: 'title_ui', desc: 'desc_ui', name: 'cat_ui_name' }),
	component: UiPage,
});

const TAG: Record<UiLibKey, 'tag_theme' | 'tag_retro' | 'tag_icons'> = { theme: 'tag_theme', retro: 'tag_retro', icons: 'tag_icons' };

function UiPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const { tag, surface, sort: sortParam } = Route.useSearch();
	const navigate = useNavigate({ from: '/ui' });
	const setFilter = (next: { tag?: UiLibKey; surface?: 'web' | 'native'; sort?: UiSort }) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const { status: likes, counts } = useLikes();
	const sort = shownUiSort(sortParam, likes);
	const surfLabel: Record<Surface, string> = { web: t.surf_web, native: t.surf_native, both: t.surf_both };
	// A library for both kinds of window shows under either. The tags count the libraries of the chosen window, so a chip never leads to an empty list; the one picked stays, and an empty list says so.
	const ofSurface = UI_LIBS.filter((l) => !surface || l.surface === surface || l.surface === 'both');
	const nNative = UI_LIBS.filter((l) => l.surface !== 'web').length;
	const nWeb = UI_LIBS.filter((l) => l.surface !== 'native').length;
	const chips = [{ key: undefined, n: ofSurface.length, label: t.all }, ...UI_KEYS.map((k) => ({ key: k, n: ofSurface.filter((l) => l.key === k).length, label: t[TAG[k]] }))].filter((c) => c.key === undefined || c.n > 0 || c.key === tag);
	const libs = sortUiLibs(ofSurface.filter((l) => !tag || l.key === tag), sort, counts);

	return (
		<section className='page enter gap-9'>
			<div className='stack-14'>
				<span className='kicker' lang='en'>~/UI · {UI_LIBS.length} LIBRARIES</span>
				<h1 className='page-h1'>{t.cat_ui_name}</h1>
				<p className='page-p mw-700'>{t.ui_p}</p>
				<a className='inline-link' href={NATIVE_UI_DOCS} target='_blank' rel='noopener'>
					{t.ui_builtin}
				</a>
			</div>
			<div className='filterbar'>
				<div className='chips' role='group' aria-label={t.a_filter}>
					{chips.map((c) => (
						<button key={c.key ?? 'all'} type='button' className='chip' onClick={() => setFilter({ tag: c.key })} aria-pressed={tag === c.key}>
							{`${c.label} · ${c.n}`}
						</button>
					))}
				</div>
				<div className='sort'>
					<label htmlFor='surface' className='sort-label'>
						{t.f_ui}
					</label>
					<select id='surface' value={surface ?? 'all'} onChange={(e) => setFilter({ surface: e.target.value === 'all' ? undefined : (e.target.value as 'web' | 'native') })} className='sort-select'>
						<option value='all'>{`${t.all} · ${UI_LIBS.length}`}</option>
						<option value='native'>{`${t.surf_native} · ${nNative}`}</option>
						<option value='web'>{`${t.surf_web} · ${nWeb}`}</option>
					</select>
				</div>
				<div className='sort'>
					<label htmlFor='sort' className='sort-label'>
						{t.sort}
					</label>
					<select id='sort' value={sort} onChange={(e) => setFilter({ sort: e.target.value === UI_DEFAULT_SORT ? undefined : (e.target.value as UiSort) })} className='sort-select'>
						{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
						<option value='newest'>{t.sort_new}</option>
						<option value='natural'>{t.sort_natural}</option>
						{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
					</select>
				</div>
			</div>
			<div className='show-grid'>
				{libs.map((l, k) => {
					// The card opens the library's website when it has one; the bar then links its repository.
					const site = l.homepage ?? l.url;
					return (
						<div key={l.repo} className={`rv d${k % 6} flex`}>
							<article className='win card plug-card'>
								<WinBar label={`github.com/${l.repo}`} size='md' className='card-bar'>
									{l.homepage && (
										<a className='plug-bar-docs' href={l.url} target='_blank' rel='noopener'>
											{t.on_github}
										</a>
									)}
								</WinBar>
								<a className='card-shot' href={site} target='_blank' rel='noopener' tabIndex={-1} aria-hidden='true'>
									{l.image ? <img src={l.image} alt='' width={1200} height={750} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' /> : <span className='card-shot-label'>{l.name}</span>}
								</a>
								<div className='plug-body'>
									<div className='show-id'>
										<div className='show-id-text'>
											<h2 className='show-name'>
												<a className='plug-link' href={site} target='_blank' rel='noopener'>
													{l.name}
												</a>
											</h2>
											<span className='show-meta show-meta-wrap'>
												<span className='show-by' title={l.author}>
													<span lang='en'>by</span> {l.author}
												</span>
												<span className='kind-tag tag-cyan'>{t[TAG[l.key]]}</span>
												<span className={`kind-tag kind-${l.surface}`}>{surfLabel[l.surface]}</span>
											</span>
										</div>
										<span className='like-end card-acts'>
											<ScoreButton item={likeKey.ui(l)} name={l.name} />
											<LikeButton item={likeKey.ui(l)} name={l.name} className='like-btn' />
										</span>
									</div>
									<p className='show-desc'>{pick(l.desc, lang)}</p>
								</div>
							</article>
						</div>
					);
				})}
			</div>
			{libs.length === 0 && (
				<div className='show-empty'>
					<p>{t.ui_none}</p>
					<button type='button' className='btn-g btn-44 btn-outline' onClick={() => setFilter({ tag: undefined, surface: undefined })}>
						{t.f_clear}
					</button>
				</div>
			)}
			<div className='rv cta-dashed'>
				<p className='cta-p'>{t.ui_cta}</p>
				<button type='button' className='btn-c btn-44' onClick={() => openSubmit('ui')}>
					{t.sub_ui}
				</button>
			</div>
		</section>
	);
}
