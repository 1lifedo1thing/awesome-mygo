import { APPS, type AppKind, HAS_SCORES, likeKey, pad2, pick } from '@awesome-mygo/catalog';
import { DEFAULT_SORT, groupChips, shownSort, sortApps, validateShowcaseSearch } from '../lib/showcase';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppLink, KindTag, MonoTile, WinBar, appView } from '../components/bits';
import { LikeButton } from '../components/Like';
import { ScoreChip } from '../components/Score';
import { useLang, useT } from '../lib/lang';
import { useLikes } from '../lib/likes';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/showcase')({
	// ?cat= and ?ui= keep the filters in the address, so a filtered list can be shared; an unknown value is dropped by the canonical-URL redirect.
	validateSearch: validateShowcaseSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/showcase', title: 'title_showcase', desc: 'desc_showcase', name: 'cat_show_name' }),
	component: ShowcasePage,
});

function ShowcasePage() {
	const t = useT();
	const lang = useLang();
	const { cat: group, ui: kind, sort: sortParam } = Route.useSearch();
	const navigate = useNavigate({ from: '/showcase' });
	const setFilter = (next: { cat?: typeof group; ui?: AppKind; sort?: typeof sortParam }) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const { status: likes, counts } = useLikes();
	const sort = shownSort(sortParam, likes);

	const nNative = APPS.filter((a) => a.kind === 'native').length;
	// The groups count the apps of the chosen interface, so a chip never leads to an empty list.
	const ofKind = APPS.filter((a) => !kind || a.kind === kind);
	const chips = groupChips(ofKind, group);
	const list = sortApps(
		ofKind.filter((a) => !group || chips.some((c) => c.key === group && c.apps.includes(a))),
		sort,
		counts,
	);

	return (
		<section className='page enter gap-32'>
			<div className='show-head'>
				<div className='stack-14'>
					<span className='kicker'>~/SHOWCASE</span>
					<h1 className='page-h1'>{t.cat_show_name}</h1>
				</div>
				<span className='show-count'>{pad2(list.length)}</span>
			</div>
			<div className='filterbar'>
				<div className='chips' role='group' aria-label={t.a_cats}>
					<button type='button' className='chip' onClick={() => setFilter({ cat: undefined })} aria-pressed={!group}>
						{`${t.all} · ${ofKind.length}`}
					</button>
					{chips.map((c) => (
						<button key={c.key} type='button' className='chip' onClick={() => setFilter({ cat: c.key })} aria-pressed={group === c.key}>
							{`${t[`grp_${c.key}`]} · ${c.apps.length}`}
						</button>
					))}
				</div>
				<div className='filter-selects'>
					<div className='sort'>
						<label htmlFor='ui' className='sort-label'>
							{t.f_ui}
						</label>
						<select id='ui' value={kind ?? 'all'} onChange={(e) => setFilter({ ui: e.target.value === 'all' ? undefined : (e.target.value as AppKind) })} className='sort-select'>
							<option value='all'>{`${t.all} · ${APPS.length}`}</option>
							<option value='native'>{`${t.surf_native} · ${nNative}`}</option>
							<option value='web'>{`${t.web_fe} · ${APPS.length - nNative}`}</option>
						</select>
					</div>
					<div className='sort'>
						<label htmlFor='sort' className='sort-label'>
							{t.sort}
						</label>
						<select id='sort' value={sort} onChange={(e) => setFilter({ sort: e.target.value === DEFAULT_SORT ? undefined : (e.target.value as typeof sortParam) })} className='sort-select'>
							<option value='natural'>{t.sort_natural}</option>
							<option value='newest'>{t.sort_new}</option>
							{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
							{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
						</select>
					</div>
				</div>
			</div>
			<div className='show-grid'>
				{list.map((a, k) => {
					const v = appView(a);
					return (
						<div key={a.slug} className={`rv d${k % 6} flex show-cell`}>
							<AppLink slug={a.slug} className='win card show-card' dialog>
								<WinBar label={v.host} size='md' className='card-bar'>
									{/* In the title bar rather than beside the author, which the like button already leaves little room for. */}
									<ScoreChip item={likeKey.app(a)} name={a.name} />
									<span className='mono-11 c-muted'>{v.num}</span>
								</WinBar>
								<div className='show-body'>
									<div className='show-id'>
										<MonoTile view={v} size={44} />
										<div className='show-id-text'>
											<h2 className='show-name'>{a.name}</h2>
											<span className='show-meta'>
												<span className='show-by' title={a.author}>
													<span lang='en'>by</span> {a.author}
												</span>
												<KindTag app={a} label={a.kind === 'native' ? t.surf_native : t.web_fe} />
											</span>
										</div>
									</div>
									<span className='show-desc'>{pick(a.desc, lang)}</span>
								</div>
							</AppLink>
							<LikeButton item={likeKey.app(a)} name={a.name} className='like-btn like-on-card' />
						</div>
					);
				})}
			</div>
			{list.length === 0 && (
				<div className='show-empty'>
					<p>{t.f_none}</p>
					<button type='button' className='btn-g btn-44 btn-outline' onClick={() => setFilter({ cat: undefined, ui: undefined })}>
						{t.f_clear}
					</button>
				</div>
			)}
		</section>
	);
}
