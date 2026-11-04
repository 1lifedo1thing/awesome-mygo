import { APPS, type AppKind, MYGO_SHOWCASE, likeKey, pad2, pick } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppLink, KindTag, MonoTile, WinBar, appView } from '../components/bits';
import { LikeButton } from '../components/Like';
import { useLang, useT } from '../lib/lang';
import { useLikes } from '../lib/likes';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/showcase')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/showcase', title: 'title_showcase', desc: 'desc_showcase', name: 'cat_show_name' }),
	component: ShowcasePage,
});

type Sort = 'default' | 'likes' | 'az' | 'author';

function ShowcasePage() {
	const t = useT();
	const lang = useLang();
	const [kind, setKind] = useState<'all' | AppKind>('all');
	const { status: likes, counts } = useLikes();
	const [sort, setSort] = useState<Sort>('default');

	const nNative = APPS.filter((a) => a.kind === 'native').length;
	const chips = [
		{ key: 'all', label: `${t.all} · ${APPS.length}` },
		{ key: 'native', label: `${t.surf_native} · ${nNative}` },
		{ key: 'web', label: `${t.web_fe} · ${APPS.length - nNative}` },
	] as const;

	const list = APPS.filter((a) => kind === 'all' || a.kind === kind);
	if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
	if (sort === 'author') list.sort((a, b) => a.author.localeCompare(b.author));
	// Most liked first; ties keep the listing order.
	if (sort === 'likes') list.sort((a, b) => (counts[likeKey.app(b)] ?? 0) - (counts[likeKey.app(a)] ?? 0));

	return (
		<section className='page enter gap-32'>
			<div className='show-head'>
				<div className='stack-14'>
					<span className='kicker'>~/SHOWCASE</span>
					<h1 className='page-h1'>{t.cat_show_name}</h1>
					<p className='page-p mw-640'>
						{t.show_p}{' '}
						<a href={MYGO_SHOWCASE} target='_blank' rel='noopener'>
							mygo.egoist.dev/showcase
						</a>
					</p>
				</div>
				<span className='show-count'>{pad2(list.length)}</span>
			</div>
			<div className='filterbar'>
				<div className='chips' role='group' aria-label={t.a_kind}>
					{chips.map((c) => (
						<button key={c.key} type='button' className='chip' onClick={() => setKind(c.key)} aria-pressed={kind === c.key}>
							{c.label}
						</button>
					))}
				</div>
				<div className='sort'>
					<label htmlFor='sort' className='sort-label'>
						{t.sort}
					</label>
					<select id='sort' value={sort} onChange={(e) => setSort(e.target.value as Sort)} className='sort-select'>
						<option value='default'>{t.sort_def}</option>
						{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
						<option value='az'>{t.sort_az}</option>
						<option value='author'>{t.sort_author}</option>
					</select>
				</div>
			</div>
			<div className='show-grid'>
				{list.map((a, k) => {
					const v = appView(a);
					return (
						<div key={a.slug} className={`rv d${k % 6} flex show-cell`}>
							<AppLink slug={a.slug} className='win card show-card' dialog>
								<WinBar label={v.host} size='md' className='card-bar'>
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
		</section>
	);
}
