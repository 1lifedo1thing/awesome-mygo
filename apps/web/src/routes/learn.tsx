import { ARTICLES, DOCS, RESOURCES, fill, hostOf, pad2, pick } from '@awesome-mygo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { useLang, useT } from '../lib/lang';
import { tilt } from '../lib/motion';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/learn')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/learn', title: 'title_learn', desc: 'desc_learn', name: 'learn_h' }),
	component: LearnPage,
});

function LearnPage() {
	const t = useT();
	const lang = useLang();
	return (
		<section className='page enter gap-10'>
			<div className='flex flex-col gap-3.5'>
				<span className='kicker'>~/LEARN</span>
				<h1 className='page-h1'>{t.learn_h}</h1>
			</div>
			{ARTICLES.map((ar) => (
				<a key={ar.url} className='tile bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] bg-size-[22px_22px] rv relative flex flex-col gap-4 overflow-hidden rounded-[20px] border border-line-2 bg-panel p-9 hover:border-cyan max-sm:p-6' href={ar.url} target='_blank' rel='noopener' {...tilt}>
					<span className='glare' aria-hidden='true' />
					<span className='font-mono text-[12px] text-cyan'>{fill(t.article_k, { x: ar.site })}</span>
					<span lang='en' className='max-w-[760px] font-display text-[length:clamp(30px,4vw,48px)] leading-[1.05] font-extrabold tracking-[-0.03em] wrap-break-word'>
						{ar.title}
					</span>
					<span className='arrow text-[15px] font-semibold text-cyan'>{t.read_full}</span>
				</a>
			))}
			<div className='flex flex-col gap-4'>
				<h2 className='m-0 text-[26px] font-black'>{t.res_h}</h2>
				<div className='grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3'>
					{RESOURCES.map((r) => (
						<a key={r.key} className='flex flex-col gap-1 rounded-[14px] border border-line-2 bg-panel px-[18px] py-4 text-fg no-underline transition-[border-color] duration-150 ease-[ease] hover:border-cyan' href={r.url} target='_blank' rel='noopener'>
							<span className='text-[16px] font-bold'>{t[r.key]}</span>
							<span className='truncate font-mono text-[12px] text-fg-3'>{hostOf(r.url)}</span>
						</a>
					))}
				</div>
			</div>
			<div className='flex flex-col gap-4'>
				<h2 className='m-0 text-[26px] font-black'>{t.guides_h}</h2>
				<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] gap-x-8 border-t border-line-2 bg-bg/50'>
					{DOCS.map((d, i) => (
						<a key={d.url} className={`row rv d${i % 6} flex items-baseline gap-5 border-b border-line px-2 py-[18px] text-fg no-underline max-sm:gap-4`} href={d.url} target='_blank' rel='noopener'>
							<span className='font-mono text-[13px] text-cyan'>{pad2(i + 1)}</span>
							<span className='flex min-w-0 flex-auto flex-col gap-1 wrap-break-word'>
								<span lang='en' className='text-[16px] font-bold'>
									{d.title}
								</span>
								<span className='text-[13px] text-fg-3'>{pick(d.desc, lang)}</span>
							</span>
							<span aria-hidden='true' className='text-fg-3'>
								↗
							</span>
						</a>
					))}
				</div>
			</div>
		</section>
	);
}
