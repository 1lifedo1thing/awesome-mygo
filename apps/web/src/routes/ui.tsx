import { NATIVE_UI_DOCS, UI_KEYS, UI_LIBS, type UiLibKey, likeKey, pick } from '@awesome-mygo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WinBar } from '../components/bits';
import { LikeButton } from '../components/Like';
import { useLang, useT } from '../lib/lang';
import { validateUiSearch } from '../lib/page-search';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/ui')({
	// ?tag= keeps the filter in the address, so a link reproduces the view.
	validateSearch: validateUiSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/ui', title: 'title_ui', desc: 'desc_ui', name: 'cat_ui_name' }),
	component: UiPage,
});

const TAG: Record<UiLibKey, 'tag_theme' | 'tag_retro' | 'tag_icons'> = { theme: 'tag_theme', retro: 'tag_retro', icons: 'tag_icons' };

function UiPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const { tag } = Route.useSearch();
	const navigate = useNavigate({ from: '/ui' });
	const filter = tag ?? 'all';
	const setFilter = (k: 'all' | UiLibKey) => void navigate({ search: (prev) => ({ ...prev, tag: k === 'all' ? undefined : k }), replace: true, resetScroll: false });
	const chips = [{ key: 'all' as const, label: `${t.all} · ${UI_LIBS.length}` }, ...UI_KEYS.map((k) => ({ key: k, label: `${t[TAG[k]]} · ${UI_LIBS.filter((l) => l.key === k).length}` }))];
	const libs = UI_LIBS.filter((l) => filter === 'all' || l.key === filter);

	return (
		<section className='page enter gap-36'>
			<div className='stack-14'>
				<span className='kicker' lang='en'>~/UI · {UI_LIBS.length} LIBRARIES</span>
				<h1 className='page-h1'>{t.cat_ui_name}</h1>
				<p className='page-p mw-700'>{t.ui_p}</p>
				<a className='inline-link' href={NATIVE_UI_DOCS} target='_blank' rel='noopener'>
					{t.ui_builtin}
				</a>
			</div>
			<div className='chips' role='group' aria-label={t.a_filter}>
				{chips.map((c) => (
					<button key={c.key} type='button' className='chip' onClick={() => setFilter(c.key)} aria-pressed={filter === c.key}>
						{c.label}
					</button>
				))}
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
											<span className='show-meta'>
												<span className='show-by' title={l.author}>
													<span lang='en'>by</span> {l.author}
												</span>
												<span className='kind-tag tag-cyan'>{t[TAG[l.key]]}</span>
											</span>
										</div>
										<LikeButton item={likeKey.ui(l)} name={l.name} className='like-btn like-end' />
									</div>
									<p className='show-desc'>{pick(l.desc, lang)}</p>
								</div>
							</article>
						</div>
					);
				})}
			</div>
			<div className='rv cta-dashed'>
				<p className='cta-p'>{t.ui_cta}</p>
				<button type='button' className='btn-c btn-44' onClick={() => openSubmit('ui')}>
					{t.sub_ui}
				</button>
			</div>
		</section>
	);
}
