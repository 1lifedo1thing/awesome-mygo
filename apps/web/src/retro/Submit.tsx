import { DATA_DIR, SUBMIT_CATS, fill } from '@awesome-mygo/catalog';
import type { ReactNode } from 'react';
import { useDialog } from '../lib/dialog';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Captcha, useSubmit } from '../lib/submit';
import { PixelIcon, Win, btn, btnGo, lnk, well } from './ui';

// A sunken text field sized for a form row (the shared `field` is the 22px strip control); a bad value turns its frame red.
const input = 'block h-[26px] w-full min-w-0 border border-ink bg-hi px-1.5 sunken outline-offset-0 placeholder:text-faint aria-invalid:border-red aria-invalid:bg-[#fff1ec]';
// Greyed push buttons for actions that are not ready yet.
const off = 'disabled:cursor-not-allowed disabled:bg-face disabled:text-lo';

export function RetroSubmit() {
	const { modal } = useSite();
	return modal ? <Dialog /> : null;
}

// A radio button of the period: a round sunken well with a dot when checked, its label beside it.
function Radio({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: ReactNode }) {
	return (
		<button type='button' role='radio' aria-checked={checked} onClick={onSelect} className='group flex h-[26px] cursor-pointer items-center gap-1.5 border border-transparent bg-transparent pr-2 pl-1 hover:border-dotted hover:border-ink'>
			<span aria-hidden='true' className='grid size-[13px] place-items-center rounded-full border border-ink bg-hi shadow-[inset_1px_1px_0_var(--color-lo)]'>
				<span className='size-[5px] rounded-full bg-ink opacity-0 group-aria-checked:opacity-100' />
			</span>
			<span className='group-aria-checked:bg-ink group-aria-checked:px-[3px] group-aria-checked:text-yel'>{children}</span>
		</button>
	);
}

// An error line: a red "!" tile keeps the text itself in ink, which reads better on the face colour than red text would.
function Err({ id, children }: { id?: string; children: ReactNode }) {
	return (
		<p id={id} role='alert' className='m-0 flex items-start gap-2'>
			<span aria-hidden='true' className='mt-0.5 grid size-4 shrink-0 place-items-center border border-ink bg-red leading-none text-hi'>
				!
			</span>
			<span>{children}</span>
		</p>
	);
}

function Dialog() {
	const { closeSubmit, form, setFormField, copy, copied } = useSite();
	const t = useT();
	const ref = useDialog<HTMLDivElement>();
	const { bot, lang, round, setToken, status, setStatus, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send } = useSubmit();

	const copyBtn = (
		<button type='button' className={`${btn} ${off}`} onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
			{copied === 'line' ? t.copied : t.copy_entry}
		</button>
	);

	return (
		<div className='fixed inset-0 z-[60] overflow-y-auto bg-[repeating-conic-gradient(rgb(16_35_58/.55)_0_25%,transparent_0_50%)] bg-[length:2px_2px] px-3 pt-3 pb-6 desk:pt-[6vh]'>
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='dlg-submit-t' className='mx-auto w-full max-w-[640px]'>
				<Win id='dlg-submit' title={t.m_title} onClose={closeSubmit} closeLabel={t.close}>
					<div className={`${well} grid gap-4 px-4 pt-4 pb-5 desk:px-5`}>
						<div className='grid grid-cols-[36px_1fr] items-center gap-3 border-b border-dotted border-lo pb-3 desk:grid-cols-[48px_1fr]'>
							<PixelIcon name='inbox' scale={3} className='size-9 desk:size-12' />
							<p className='m-0'>{bot.enabled ? t.m_desc_bot : t.m_desc}</p>
						</div>

						<div>
							<span className='mb-1 block text-muted'>{t.a_cats}</span>
							<div role='radiogroup' aria-label={t.a_cats} className='flex flex-wrap gap-x-2 gap-y-1'>
								{SUBMIT_CATS.map((c) => (
									<Radio key={c} checked={form.cat === c} onSelect={() => setFormField('cat', c)}>
										{catLabel[c]}
									</Radio>
								))}
							</div>
						</div>

						{isShow && (
							<div>
								<span className='mb-1 block text-muted'>{t.a_kind}</span>
								<div role='radiogroup' aria-label={t.a_kind} className='flex flex-wrap gap-x-2 gap-y-1'>
									{(['native', 'web'] as const).map((m) => (
										<Radio key={m} checked={form.mode === m} onSelect={() => setFormField('mode', m)}>
											{m === 'native' ? t.surf_native : t.web_fe}
										</Radio>
									))}
								</div>
							</div>
						)}

						<div className='grid gap-4 desk:grid-cols-2'>
							<div>
								<label htmlFor='f-name' className='mb-1 block text-muted'>
									{t.m_name}
								</label>
								<input id='f-name' type='text' value={form.name} onChange={(e) => setFormField('name', e.target.value)} placeholder={t.m_name_ph} className={input} />
							</div>
							<div>
								<label htmlFor='f-url' className='mb-1 block text-muted'>
									{t.m_link}
								</label>
								<input id='f-url' type='url' value={form.url} onChange={(e) => setFormField('url', e.target.value)} placeholder='https://github.com/…' className={input} aria-invalid={urlBad} aria-describedby={urlBad ? 'f-url-err' : undefined} />
							</div>
						</div>

						{withAuthor && (
							<div>
								<label htmlFor='f-author' className='mb-1 block text-muted'>
									{t.m_author}
								</label>
								<input id='f-author' type='text' value={form.author} onChange={(e) => setFormField('author', e.target.value)} placeholder={t.m_author_ph} className={input} autoComplete='username' />
							</div>
						)}

						{urlBad && <Err id='f-url-err'>{t.m_bad}</Err>}
						{repoMissing && <Err>{t.m_repo}</Err>}

						<div>
							<label htmlFor='f-desc' className='mb-1 flex justify-between gap-3 text-muted'>
								<span>{t.m_desc_l}</span>
								<span className='font-mono'>
									{form.desc.length}/{max}
								</span>
							</label>
							<textarea id='f-desc' rows={isShow ? 3 : 2} maxLength={max} value={form.desc} onChange={(e) => setFormField('desc', e.target.value.slice(0, max))} placeholder={t.m_desc_ph} className='block w-full min-w-0 resize-y border border-ink bg-hi px-1.5 py-1 sunken outline-offset-0 placeholder:text-faint' />
						</div>

						<div className='min-w-0'>
							<span className='mb-1 block text-muted'>
								{t.m_preview} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
							</span>
							<pre lang='en' className='m-0 max-h-[200px] overflow-auto border border-ink bg-ink px-3 py-2.5 font-mono break-all whitespace-pre-wrap text-paper'>
								{entry}
							</pre>
						</div>

						{bot.enabled ? (
							status.kind === 'done' ? (
								<div role='status' className='flex flex-wrap items-center justify-between gap-3 border border-ink bg-note px-3 py-2.5'>
									<span>{t.sub_done}</span>
									<a className={btnGo} href={status.url} target='_blank' rel='noopener'>
										{fill(t.sub_view, { n: status.number })}
									</a>
								</div>
							) : (
								<>
									<div className='min-h-[65px]'>
										<Captcha siteKey={bot.siteKey} lang={lang} round={round} onToken={setToken} onFail={() => setStatus({ kind: 'error', message: t.sub_failed })} theme='light' />
									</div>
									{status.kind === 'error' && <Err>{status.message}</Err>}
									<div className='flex flex-wrap justify-end gap-2.5 pt-1'>
										{copyBtn}
										<button type='button' className={`${btnGo} ${off}`} onClick={send} disabled={!canSend}>
											{status.kind === 'sending' ? t.sub_sending : t.sub_send}
										</button>
									</div>
									<p className='m-0 border-t border-dotted border-lo pt-3'>
										{t.sub_gh}{' '}
										<a className={`${lnk} whitespace-nowrap`} href={edit} target='_blank' rel='noopener'>
											{fill(t.go_edit, { x: file })}
										</a>
										{' · '}
										<a className={`${lnk} whitespace-nowrap`} href={issue} target='_blank' rel='noopener'>
											{t.go_pr}
										</a>
									</p>
								</>
							)
						) : (
							<div className='flex flex-wrap justify-end gap-2.5 pt-1'>
								{copyBtn}
								<a className={btn} href={edit} target='_blank' rel='noopener'>
									{fill(t.go_edit, { x: file })}
								</a>
								<a className={btnGo} href={issue} target='_blank' rel='noopener'>
									{t.go_pr}
								</a>
							</div>
						)}
					</div>
				</Win>
			</div>
		</div>
	);
}
