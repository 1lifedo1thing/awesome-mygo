import { BINDINGS_DOC, STATE_SOLUTIONS, fill, pad2, pick } from '@awesome-mygo/catalog';
import { useState } from 'react';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { DesktopIcons } from '../DesktopIcons';
import { PixelIcon, StatusBar, Win, btn, btnGo, btnSm, field, well } from '../ui';

type BlockId = 'bind' | 'chan' | 'evt';

// The state page: a header window, the listed solutions in a tall window on the right, MyGo's built-in primitives as a property sheet with a code pane, and a dialog asking for more solutions. Below the desktop breakpoint the windows stack in that order.
export function State() {
	const t = useT();
	const listed = STATE_SOLUTIONS.length > 0;
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:grid-cols-12 desk:grid-rows-[auto_auto_1fr] desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Win level={1} title={t.cat_state_name} className='desk:col-span-6 desk:col-start-1 desk:row-start-1'>
				<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
					<span className={`${field} font-mono`} lang='en'>
						~/state
					</span>
					<span className='flex-1' />
					<span className='flex items-center gap-1.5'>
						<span aria-hidden='true' className={`size-2 border border-ink bg-yel ${listed ? '' : 'animate-blink'}`} />
						{listed ? fill(t.cat_state_count, { n: STATE_SOLUTIONS.length }) : t.cat_state_badge}
					</span>
				</div>
				<div className={`${well} px-5 pt-4 pb-[18px]`}>
					<p className='m-0 max-w-[40em] leading-[22px]'>{t.state_p}</p>
				</div>
				<StatusBar>
					<span>{t.cat_state_desc}</span>
				</StatusBar>
			</Win>
			{listed && <Solutions />}
			<Primitives />
			<Ask listed={listed} />
		</div>
	);
}

// Every listed solution in one window, a section each: preview, name, description, the install line with a copy button, and its links.
function Solutions() {
	const t = useT();
	const lang = useLang();
	const { copy, copied } = useSite();
	return (
		<Win title={t.state_listed_h} className='desk:col-span-6 desk:col-start-7 desk:row-span-3 desk:row-start-1 desk:mt-16 desk:-ml-3'>
			<div className={`${well} divide-y divide-dotted divide-lo px-3.5`}>
				{STATE_SOLUTIONS.map((s, k) => (
					<article key={s.repo} className='py-3.5'>
						<p className='m-0 mb-2.5 flex items-center gap-2'>
							<span className={`${field} min-w-0 flex-1`}>
								<span aria-hidden='true' className='text-faint'>
									⌂
								</span>
								<span lang='en' className='truncate font-mono'>
									github.com/{s.repo}
								</span>
							</span>
						</p>
						{s.image && (
							<a href={s.url} target='_blank' rel='noopener' className='mb-3.5 block bg-ink p-[3px]'>
								<img src={s.image} alt={`${s.name} ${t.preview_img}`} width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' className='block aspect-[1200/630] w-full' />
							</a>
						)}
						<div className='flex flex-wrap items-baseline gap-x-2.5'>
							<h3 className='m-0 text-2xl leading-8 font-normal'>{s.name}</h3>
							<span className='text-muted'>
								<span lang='en'>by</span> {s.author}
							</span>
						</div>
						<p className='m-0 mt-1 mb-2'>{pick(s.desc, lang)}</p>
						<div className='mb-3 flex flex-wrap gap-1.5'>
							{s.tags.map((tag) => (
								<code key={tag} lang='en' className='border border-lo bg-face px-1.5 font-mono'>
									{tag}
								</code>
							))}
						</div>
						<div className='mb-3.5 flex items-center justify-between gap-2 border border-ink bg-ink py-[3px] pr-[3px] pl-2.5 font-mono text-paper'>
							<code lang='en' className='min-w-0 break-all'>
								<span className='text-sky'>❯ </span>
								<span className='text-yel'>{s.install}</span>
							</code>
							<button type='button' className={`${btnSm} text-ink`} onClick={() => copy(s.install, 'cmd0')} aria-label={t.a_copy_cmd}>
								{copied === 'cmd0' ? t.copied : t.copy}
							</button>
						</div>
						<div className='flex flex-wrap gap-2'>
							<a className={btn} href={s.url} target='_blank' rel='noopener'>
								{t.on_github}
							</a>
							{s.homepage && (
								<a className={btn} href={s.homepage} target='_blank' rel='noopener'>
									{t.visit}
								</a>
							)}
						</div>
					</article>
				))}
			</div>
			<StatusBar>
				<span>{fill(t.cat_state_count, { n: STATE_SOLUTIONS.length })}</span>
			</StatusBar>
		</Win>
	);
}

// The built-in primitives as a property sheet: numbered tabs down the left, the selected one's snippet in a code pane on the right.
function Primitives() {
	const t = useT();
	const [block, setBlock] = useState<BlockId>('bind');
	const blocks = [
		{ id: 'bind', kicker: 'mygo.Bind', name: t.blk_bind_n, desc: t.blk_bind_d, code: 'import { Greeter } from "./mygo" // generated\n\nawait Greeter.greet("Ada")' },
		{ id: 'chan', kicker: 'channels', name: t.blk_chan_n, desc: t.blk_chan_d, code: `// ${t.see}\n// docs/bindings.md › channels` },
		{ id: 'evt', kicker: 'typed events', name: t.blk_evt_n, desc: t.blk_evt_d, code: `// ${t.see}\n// docs/bindings.md › typed events` },
	] as const;
	const current = blocks.find((b) => b.id === block) ?? blocks[0];
	return (
		<Win title={t.a_builtin} idle className='desk:col-span-6 desk:col-start-1 desk:row-start-2 desk:mt-8 desk:ml-8'>
			<div className={`${well} grid gap-3 p-3 desk:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`}>
				<div role='tablist' aria-label={t.a_builtin} aria-orientation='vertical' className='grid content-start gap-1'>
					{blocks.map((b, i) => (
						<button key={b.id} type='button' role='tab' id={`blk-${b.id}`} aria-controls='blk-panel' aria-selected={b.id === block} onClick={() => setBlock(b.id)} className='group grid cursor-pointer grid-cols-[22px_1fr] gap-x-2 border border-transparent bg-transparent px-2 py-1.5 text-left hover:border-dotted hover:border-ink aria-selected:border-ink aria-selected:bg-ink aria-selected:text-paper'>
							<span className='font-mono text-lo group-aria-selected:text-yel'>{pad2(i + 1)}</span>
							<span>
								<span className='block'>
									{b.name}{' '}
									<span lang='en' className='font-mono text-faint group-aria-selected:text-sky'>
										{b.kicker}
									</span>
								</span>
								<span className='block text-muted group-aria-selected:text-[#c9c2ae]'>{b.desc}</span>
							</span>
						</button>
					))}
				</div>
				<div role='tabpanel' id='blk-panel' aria-labelledby={`blk-${current.id}`} className='flex flex-col border border-ink bg-ink text-paper'>
					<div className='flex h-[22px] items-center gap-2 border-b border-[#2c4058] px-2 text-slate'>
						<PixelIcon name='page' scale={1} />
						<span lang='en' className='font-mono'>
							app.ts
						</span>
					</div>
					<pre lang='en' className='m-0 min-h-[96px] flex-1 overflow-x-auto px-3 py-2.5 font-mono whitespace-pre-wrap'>
						{current.code}
					</pre>
					<a href={BINDINGS_DOC} target='_blank' rel='noopener' lang='en' className='border-t border-[#2c4058] px-3 py-1.5 text-yel hover:bg-yel hover:text-ink'>
						Calling Go from the frontend ↗
					</a>
				</div>
			</div>
		</Win>
	);
}

// The closing dialog: with solutions listed it asks for another one, otherwise it invites the first.
function Ask({ listed }: { listed: boolean }) {
	const t = useT();
	const { openSubmit } = useSite();
	return (
		<section aria-labelledby='state-ask' className='mx-1 grid grid-cols-[40px_1fr] gap-x-4 gap-y-2.5 border border-ink bg-face p-3.5 outline-1 outline-offset-[3px] outline-ink shadow-[inset_1px_1px_0_var(--color-hi),inset_-1px_-1px_0_var(--color-lo),0_0_0_3px_var(--color-face),9px_9px_0_3px_rgba(16,35,58,.5)] desk:col-span-5 desk:col-start-2 desk:row-start-3 desk:m-0 desk:mt-12 desk:ml-4 desk:px-[18px] desk:pt-4 desk:pb-3.5'>
			<PixelIcon name='inbox' scale={2} className='mt-1' />
			<div>
				<h2 id='state-ask' className='m-0 mb-1 text-2xl leading-8 font-normal text-balance [&:lang(ko)]:break-keep'>
					{listed ? t.state_more_h : t.state_empty_h}
				</h2>
				<p className='m-0'>{t.state_empty_p}</p>
			</div>
			<div className='col-span-full flex flex-wrap justify-end gap-2.5 pt-1'>
				<button type='button' className={btnGo} onClick={() => openSubmit('state')}>
					{t.sub_state}
				</button>
			</div>
		</section>
	);
}
