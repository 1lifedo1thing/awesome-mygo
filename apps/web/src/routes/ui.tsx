import { NATIVE_UI_DOCS, UI_KEYS, UI_LIBS, type UiLibKey, likeKey, pick } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { WinBar } from '../components/bits';
import { LikeButton } from '../components/Like';
import { useLang, useT } from '../lib/lang';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/ui')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/ui', title: 'title_ui', desc: 'desc_ui', name: 'cat_ui_name' }),
	component: UiPage,
});

const TAG: Record<UiLibKey, 'tag_theme' | 'tag_retro' | 'tag_icons'> = { theme: 'tag_theme', retro: 'tag_retro', icons: 'tag_icons' };

function UiPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const [filter, setFilter] = useState<'all' | UiLibKey>('all');
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
			<div className='lib-grid'>
				{libs.map((l, k) => (
					<div key={l.repo} className={`rv d${k} flex`}>
						<article className='win lib'>
							<WinBar label={`github.com/${l.repo}`} size='md' className='lib-bar' />
							{l.image ? (
								<div className='lib-shot lib-shot-img'>
									<img src={l.image} alt={`${l.name} ${t.shot}`} width={1200} height={750} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' />
								</div>
							) : (
								<div className='dots lib-shot'>
									<span className='lib-shot-label'>{l.name}</span>
								</div>
							)}
							<div className='lib-body'>
								<div className='lib-head'>
									<div className='stack-4'>
										<h2 className='lib-name'>{l.name}</h2>
										<span className='lib-by'>
											<span lang='en'>by</span> {l.author}
										</span>
									</div>
									<span className='lib-tag'>{t[TAG[l.key]]}</span>
								</div>
								<p className='lib-desc'>{pick(l.desc, lang)}</p>
								<div className='cta-acts'>
									<a className='btn-c btn-44' href={l.url} target='_blank' rel='noopener'>
										{t.on_github}
									</a>
									{l.homepage && (
										<a className='btn-g btn-44 btn-outline' href={l.homepage} target='_blank' rel='noopener'>
											{t.visit}
										</a>
									)}
									<LikeButton item={likeKey.ui(l)} name={l.name} className='like-btn like-lg like-end' size={18} />
								</div>
							</div>
						</article>
					</div>
				))}
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
