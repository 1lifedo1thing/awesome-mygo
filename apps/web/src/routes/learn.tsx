import { ARTICLES, DOCS, RESOURCES, fill, hostOf, pad2, pick } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useLang, useT } from '../lib/lang';
import { tilt } from '../lib/motion';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/learn')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/learn', title: 'learn_h', desc: 'hero_p' }),
	component: LearnPage,
});

function LearnPage() {
	const t = useT();
	const lang = useLang();
	return (
		<section className='page enter gap-40'>
			<div className='stack-14'>
				<span className='kicker'>~/LEARN</span>
				<h1 className='page-h1'>{t.learn_h}</h1>
			</div>
			{ARTICLES.map((ar) => (
				<a key={ar.url} className='tile dots rv article' href={ar.url} target='_blank' rel='noopener' {...tilt}>
					<span className='glare' aria-hidden='true' />
					<span className='mono-12 c-cyan'>{fill(t.article_k, { x: ar.site })}</span>
					<span lang='en' className='article-title'>
						{ar.title}
					</span>
					<span className='arrow article-more'>{t.read_full}</span>
				</a>
			))}
			<div className='stack-16'>
				<h2 className='guides-h'>{t.res_h}</h2>
				<div className='res-grid'>
					{RESOURCES.map((r) => (
						<a key={r.key} className='res' href={r.url} target='_blank' rel='noopener'>
							<span className='res-name'>{t[r.key]}</span>
							<span className='res-host'>{hostOf(r.url)}</span>
						</a>
					))}
				</div>
			</div>
			<div className='stack-16'>
				<h2 className='guides-h'>{t.guides_h}</h2>
				<div className='docs'>
					{DOCS.map((d, i) => (
						<a key={d.url} className={`row rv d${i % 6} doc`} href={d.url} target='_blank' rel='noopener'>
							<span className='doc-num'>{pad2(i + 1)}</span>
							<span className='doc-text'>
								<span lang='en' className='doc-name'>
									{d.title}
								</span>
								<span className='doc-desc'>{pick(d.desc, lang)}</span>
							</span>
							<span aria-hidden='true' className='c-muted'>
								↗
							</span>
						</a>
					))}
				</div>
			</div>
		</section>
	);
}
