import { DATA_DIR, GROUP_CATEGORY, SUBMIT_CATS, fill } from '@awesome-mygo/catalog';
import type { ReactNode } from 'react';
import { useDialog } from '../lib/dialog';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Captcha, useSubmit } from '../lib/submit';
import { PixelIcon, Win, btn, btnGo, lnk, well } from './ui';

// A text field sized for a form row (the shared `field` is the 24px toolbar control); a bad value turns its frame red.
const input = 'block h-[30px] w-full min-w-0 rounded-md border border-line bg-hi px-2 outline-offset-0 placeholder:text-faint aria-invalid:border-red aria-invalid:bg-[#fff1ec]';
// Greyed push buttons for actions that are not ready yet.
const off = 'disabled:cursor-not-allowed disabled:bg-face disabled:text-lo';

// The showcase groups a submission can pick, without Other. Optional: a second press clears the pick.
const GROUPS = Object.keys(GROUP_CATEGORY) as (keyof typeof GROUP_CATEGORY)[];

export function RetroSubmit() {
	const { modal } = useSite();
	return modal ? <Dialog /> : null;
}

// A radio button: a round well with a dot when checked, its label beside it.
function Radio({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: ReactNode }) {
	return (
		<button type='button' role='radio' aria-checked={checked} onClick={onSelect} className='group flex h-[26px] cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent pr-2 pl-1 hover:bg-ink/5'>
			<span aria-hidden='true' className='grid size-[14px] place-items-center rounded-full border border-lo bg-hi group-aria-checked:border-pur group-aria-checked:bg-pur'>
				<span className='size-[6px] rounded-full bg-paper opacity-0 group-aria-checked:opacity-100' />
			</span>
			<span className='group-aria-checked:font-medium'>{children}</span>
		</button>
	);
}

// An error line: a red "!" tile keeps the text itself in ink, which reads better on the face colour than red text would.
function Err({ id, children }: { id?: string; children: ReactNode }) {
	return (
		<p id={id} role='alert' className='m-0 flex items-start gap-2'>
			<span aria-hidden='true' className='mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-red text-xs leading-none font-bold text-hi'>
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
	const { bot, lang, round, setToken, status, setStatus, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send, onUrlBlur, hint, viaJson, jsonError, onJsonChange, example, repoBad, onRepoBlur, urlLabel } = useSubmit();

	const copyBtn = (
		<button type='button' className={`${btn} ${off}`} onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
			{copied === 'line' ? t.copied : t.copy_entry}
		</button>
	);

	return (
		<div className='fixed inset-0 z-[60] overflow-y-auto bg-ink/35 backdrop-blur-[2px] px-3 pt-3 pb-6 desk:pt-[6vh]'>
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='dlg-submit-t' className='mx-auto w-full max-w-[640px]'>
				<Win id='dlg-submit' title={t.m_title} onClose={closeSubmit}>
					<div className={`${well} grid gap-4 px-4 pt-4 pb-5 desk:px-5`}>
						<div className='grid grid-cols-[36px_1fr] items-center gap-3 border-b border-line pb-3 desk:grid-cols-[48px_1fr]'>
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

						<div>
							<span className='mb-1 block text-muted'>{t.m_via}</span>
							<div role='radiogroup' aria-label={t.m_via} className='flex flex-wrap gap-x-2 gap-y-1'>
								{(['form', 'json'] as const).map((v) => (
									<Radio key={v} checked={form.via === v} onSelect={() => setFormField('via', v)}>
										{v === 'form' ? t.m_via_form : t.m_via_json}
									</Radio>
								))}
							</div>
						</div>

						{viaJson && (
							<div className='grid gap-2'>
								<label htmlFor='f-json' className='block text-muted'>
									{t.m_json} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
								</label>
								<textarea
									id='f-json'
									rows={12}
									spellCheck={false}
									lang='en'
									value={form.json}
									onChange={(e) => onJsonChange(e.target.value)}
									placeholder={example}
									className='block w-full min-w-0 resize-y rounded-md border border-line bg-hi px-2 py-1 font-mono outline-offset-0 placeholder:text-faint aria-invalid:border-red aria-invalid:bg-[#fff1ec]'
									aria-invalid={Boolean(jsonError)}
									aria-describedby={jsonError ? 'f-json-err' : 'f-json-tip'}
								/>
								{jsonError ? (
									<Err id='f-json-err'>{jsonError}</Err>
								) : (
									<p id='f-json-tip' className='m-0 text-muted'>
										{t.m_json_tip}
									</p>
								)}
							</div>
						)}

						{!viaJson && isShow && (
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
						{!viaJson && isShow && (
							<div>
								<span className='mb-1 block text-muted'>{t.m_group}</span>
								<div role='radiogroup' aria-label={t.m_group} className='flex flex-wrap gap-x-2 gap-y-1'>
									{GROUPS.map((g) => (
										<Radio key={g} checked={form.category === GROUP_CATEGORY[g]} onSelect={() => setFormField('category', form.category === GROUP_CATEGORY[g] ? undefined : GROUP_CATEGORY[g])}>
											{t[`grp_${g}`]}
										</Radio>
									))}
								</div>
							</div>
						)}

						{!viaJson && (
							<>
								<div className='grid gap-4 desk:grid-cols-2'>
									<div>
										<label htmlFor='f-name' className='mb-1 block text-muted'>
											{t.m_name}
										</label>
										<input id='f-name' type='text' value={form.name} onChange={(e) => setFormField('name', e.target.value)} placeholder={t.m_name_ph} className={input} />
									</div>
									<div>
										<label htmlFor='f-url' className='mb-1 block text-muted'>
											{urlLabel}
										</label>
										<input id='f-url' type='url' value={form.url} onChange={(e) => setFormField('url', e.target.value)} onBlur={onUrlBlur} placeholder={isShow ? 'https://…' : 'https://github.com/…'} className={input} aria-invalid={urlBad} aria-describedby={urlBad ? 'f-url-err' : undefined} />
									</div>
								</div>

								{(withAuthor || isShow) && (
									<div className='grid gap-4 desk:grid-cols-2'>
										{withAuthor && (
											<div>
												<label htmlFor='f-author' className='mb-1 block text-muted'>
													{t.m_author}
												</label>
												<input id='f-author' type='text' value={form.author} onChange={(e) => setFormField('author', e.target.value)} placeholder={t.m_author_ph} className={input} autoComplete='username' />
											</div>
										)}
										{isShow && (
											<div>
												<label htmlFor='f-repo' className='mb-1 block text-muted'>
													{t.m_gh} <span className='text-faint'>({t.m_opt})</span>
												</label>
												<input id='f-repo' type='url' value={form.repo ?? ''} onChange={(e) => setFormField('repo', e.target.value)} onBlur={onRepoBlur} placeholder='https://github.com/owner/name' className={input} aria-invalid={repoBad} aria-describedby={repoBad ? 'f-repo-err' : undefined} />
											</div>
										)}
									</div>
								)}
								{isShow && <p className='m-0 text-muted'>{t.m_home_tip}</p>}

								{urlBad && <Err id='f-url-err'>{t.m_bad}</Err>}
								{repoBad && <Err id='f-repo-err'>{t.m_repo_bad}</Err>}
								{repoMissing && <Err>{t.m_repo}</Err>}

								<div>
									<label htmlFor='f-desc' className='mb-1 flex justify-between gap-3 text-muted'>
										<span>{t.m_desc_l}</span>
										<span className='font-mono'>
											{form.desc.length}/{max}
										</span>
									</label>
									<textarea id='f-desc' rows={isShow ? 3 : 2} maxLength={max} value={form.desc} onChange={(e) => setFormField('desc', e.target.value.slice(0, max))} placeholder={t.m_desc_ph} className='block w-full min-w-0 resize-y rounded-md border border-line bg-hi px-2 py-1 outline-offset-0 placeholder:text-faint' />
								</div>

								<details className='min-w-0'>
									<summary className='mb-1 w-fit cursor-pointer text-muted'>
										{t.m_preview} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
									</summary>
									<pre lang='en' className='m-0 max-h-[200px] overflow-auto rounded-lg bg-ink px-3 py-2.5 font-mono break-all whitespace-pre-wrap text-paper'>
										{entry}
									</pre>
								</details>
							</>
						)}

						{bot.enabled ? (
							status.kind === 'done' ? (
								<div role='status' className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ecd98a] bg-note px-3 py-2.5'>
									<span>{t.sub_done}</span>
									<a className={btnGo} href={status.url} target='_blank' rel='noopener'>
										{fill(t.sub_view, { n: status.number })}
									</a>
								</div>
							) : (
								<>
									<Captcha siteKey={bot.siteKey} lang={lang} round={round} onToken={setToken} onFail={() => setStatus({ kind: 'error', message: t.sub_failed })} theme='light' />
									{status.kind === 'error' && <Err>{status.message}</Err>}
									{hint && <p className='m-0 text-right text-muted' aria-live='polite'>{hint}</p>}
									<div className='flex flex-wrap justify-end gap-2.5 pt-1'>
										{copyBtn}
										<button type='button' className={`${btnGo} ${off}`} onClick={send} disabled={!canSend}>
											{status.kind === 'sending' ? t.sub_sending : t.sub_send}
										</button>
									</div>
									<p className='m-0 border-t border-line pt-3'>
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
