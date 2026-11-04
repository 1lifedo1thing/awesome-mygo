import { APPS, type AppKind, MYGO_SHOWCASE, pad2, pick } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { KindTag, MonoTile, WinBar, appView } from '../components/bits';
import { useLang, useT } from '../lib/lang';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/showcase')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/showcase', title: 'cat_show_name', desc: 'cat_show_desc', app: match.search.app }),
	component: ShowcasePage,
});

type Sort = 'default' | 'az' | 'author';

function ShowcasePage() {
	const t = useT();
	const lang = useLang();
	const { openApp } = useSite();
	const [kind, setKind] = useState<'all' | AppKind>('all');
	const [sort, setSort] = useState<Sort>('default');

	const nNative = APPS.filter((a) => a.kind === 'native').length;
	const chips = [
		{ key: 'all', label: `${t.all} · ${APPS.length}` },
		{ key: 'native', label: `Native UI · ${nNative}` },
		{ key: 'web', label: `${t.web_fe} · ${APPS.length - nNative}` },
	] as const;

	const list = APPS.filter((a) => kind === 'all' || a.kind === kind);
	if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
	if (sort === 'author') list.sort((a, b) => a.author.localeCompare(b.author));

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
						<option value='az'>{t.sort_az}</option>
						<option value='author'>{t.sort_author}</option>
					</select>
				</div>
			</div>
			<div className='show-grid'>
				{list.map((a, k) => {
					const v = appView(a);
					return (
						<div key={a.slug} className={`rv d${k % 6} flex`}>
							<button type='button' className='win card show-card' onClick={() => openApp(a.slug)} aria-haspopup='dialog'>
								<WinBar label={v.host} size='md' className='card-bar'>
									<span className='mono-11 c-muted'>{v.num}</span>
								</WinBar>
								<span className='show-body'>
									<span className='show-id'>
										<MonoTile view={v} size={44} />
										<span className='show-id-text'>
											<span className='show-name'>{a.name}</span>
											<span className='show-meta'>
												<span className='show-by' title={a.author}>by {a.author}</span>
												<KindTag app={a} label={a.kind === 'native' ? 'Native UI' : t.web_fe} />
											</span>
										</span>
									</span>
									<span className='show-desc'>{pick(a.desc, lang)}</span>
								</span>
							</button>
						</div>
					);
				})}
			</div>
		</section>
	);
}
