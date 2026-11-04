import { DATA_DIR, GROUP_CATEGORY, SUBMIT_CATS, fill } from '@awesome-mygo/catalog';
import { useDialog } from '../lib/dialog';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Captcha, useSubmit } from '../lib/submit';
import { CloseIcon } from './bits';

const GROUPS = Object.keys(GROUP_CATEGORY) as (keyof typeof GROUP_CATEGORY)[];

export function SubmitModal() {
	const { modal } = useSite();
	return modal ? <Modal /> : null;
}

function Modal() {
	const { closeSubmit, form, setFormField, copy, copied } = useSite();
	const t = useT();
	const ref = useDialog<HTMLDivElement>();
	const { bot, lang, round, setToken, status, setStatus, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send, onUrlBlur, hint, viaJson, jsonError, onJsonChange, example, repoBad, onRepoBlur, shotBad, onShotBlur, urlLabel } = useSubmit();
	const urlNote = urlBad ? 'f-url-err' : repoMissing ? 'f-url-repo' : isShow || withAuthor ? 'f-url-tip' : undefined;

	// The form scrolls; the footer with the submit button stays in view, saying what is still missing.
	return (
		<div className='overlay overlay-center fade'>
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='dlg' className='modal enter'>
				<div className='modal-scroll'>
					<div className='modal-head'>
						<div className='stack-6'>
							<h2 id='dlg' className='modal-title'>
								{t.m_title}
							</h2>
							<p className='modal-sub'>{bot.enabled ? t.m_desc_bot : t.m_desc}</p>
						</div>
						<button type='button' className='btn-g icon-btn icon-44' onClick={closeSubmit} aria-label={t.close}>
							<CloseIcon size={18} />
						</button>
					</div>
					<div className='stack-8'>
						<span className='field-label'>{t.a_cats}</span>
						<div className='cat-opts' role='radiogroup' aria-label={t.a_cats}>
							{SUBMIT_CATS.map((c) => (
								<button key={c} type='button' role='radio' aria-checked={form.cat === c} className='cat-opt' onClick={() => setFormField('cat', c)}>
									{catLabel[c]}
								</button>
							))}
						</div>
					</div>
					<div className='stack-8'>
						<span className='field-label'>{t.m_via}</span>
						<div className='cat-opts' role='radiogroup' aria-label={t.m_via}>
							{(['form', 'json'] as const).map((v) => (
								<button key={v} type='button' role='radio' aria-checked={form.via === v} className='cat-opt' onClick={() => setFormField('via', v)}>
									{v === 'form' ? t.m_via_form : t.m_via_json}
								</button>
							))}
						</div>
					</div>
					{viaJson && (
						<div className='stack-8'>
							<label htmlFor='f-json' className='field-label'>
								{t.m_json} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
							</label>
							<textarea
								id='f-json'
								rows={12}
								spellCheck={false}
								value={form.json}
								onChange={(e) => onJsonChange(e.target.value)}
								placeholder={example}
								className='field field-area field-code'
								lang='en'
								data-bad={Boolean(jsonError)}
								aria-invalid={Boolean(jsonError)}
								aria-describedby={jsonError ? 'f-json-err' : 'f-json-tip'}
							/>
							{jsonError ? (
								<p id='f-json-err' role='alert' className='field-err'>
									{jsonError}
								</p>
							) : (
								<p id='f-json-tip' className='field-tip'>
									{t.m_json_tip}
								</p>
							)}
							<div className='md-details-acts'>
								<button type='button' className='btn-g btn-copy-line' onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
									{copied === 'line' ? t.copied : t.copy_entry}
								</button>
								{bot.enabled && (
									<span className='modal-alt'>
										{t.sub_gh}{' '}
										<a href={edit} target='_blank' rel='noopener'>
											{fill(t.go_edit, { x: file })}
										</a>
										{' · '}
										<a href={issue} target='_blank' rel='noopener'>
											{t.go_pr}
										</a>
									</span>
								)}
							</div>
						</div>
					)}
					{!viaJson && isShow && (
						<div className='stack-8'>
							<span className='field-label'>{t.a_kind}</span>
							<div className='cat-opts' role='radiogroup' aria-label={t.a_kind}>
								{(['native', 'web'] as const).map((m) => (
									<button key={m} type='button' role='radio' aria-checked={form.mode === m} className='cat-opt' onClick={() => setFormField('mode', m)}>
										{m === 'native' ? t.surf_native : t.web_fe}
									</button>
								))}
							</div>
						</div>
					)}
					{!viaJson && isShow && (
						<div className='stack-8'>
							<span className='field-label'>{t.m_group}</span>
							{/* Optional: a second press clears it, and the entry then names no category. */}
							<div className='cat-opts' role='radiogroup' aria-label={t.m_group}>
								{GROUPS.map((g) => (
									<button key={g} type='button' role='radio' aria-checked={form.category === GROUP_CATEGORY[g]} className='cat-opt' onClick={() => setFormField('category', form.category === GROUP_CATEGORY[g] ? undefined : GROUP_CATEGORY[g])}>
										{t[`grp_${g}`]}
									</button>
								))}
							</div>
						</div>
					)}
					{!viaJson && (
						<>
							<div className='stack-8'>
								<label htmlFor='f-url' className='field-label'>
									{urlLabel}
								</label>
								<input
									id='f-url'
									type='url'
									inputMode='url'
									value={form.url}
									onChange={(e) => setFormField('url', e.target.value)}
									onBlur={onUrlBlur}
									placeholder={isShow ? 'https://…' : 'https://github.com/…'}
									className='field'
									data-bad={urlBad || repoMissing}
									aria-invalid={urlBad || repoMissing}
									aria-describedby={urlNote}
								/>
								{urlBad ? (
									<p id='f-url-err' role='alert' className='field-err'>
										{t.m_bad}
									</p>
								) : repoMissing ? (
									<p id='f-url-repo' role='alert' className='field-err'>
										{t.m_repo}
									</p>
								) : (
									(isShow || withAuthor) && (
										<p id='f-url-tip' className='field-tip'>
											{isShow ? t.m_home_tip : t.m_link_tip}
										</p>
									)
								)}
							</div>
							{isShow && (
								<div className='stack-8'>
									<label htmlFor='f-repo' className='field-label'>
										{t.m_gh} <span className='field-count'>{t.m_opt}</span>
									</label>
									<input
										id='f-repo'
										type='url'
										inputMode='url'
										value={form.repo ?? ''}
										onChange={(e) => setFormField('repo', e.target.value)}
										onBlur={onRepoBlur}
										placeholder='https://github.com/owner/name'
										className='field'
										data-bad={repoBad}
										aria-invalid={repoBad}
										aria-describedby={repoBad ? 'f-repo-err' : 'f-repo-tip'}
									/>
									{repoBad ? (
										<p id='f-repo-err' role='alert' className='field-err'>
											{t.m_repo_bad}
										</p>
									) : (
										<p id='f-repo-tip' className='field-tip'>
											{t.m_link_tip}
										</p>
									)}
								</div>
							)}
							{isShow && (
								<div className='stack-8'>
									<label htmlFor='f-shot' className='field-label'>
										{t.m_shot} <span className='field-count'>{t.m_opt}</span>
									</label>
									<input
										id='f-shot'
										type='url'
										inputMode='url'
										value={form.screenshot ?? ''}
										onChange={(e) => setFormField('screenshot', e.target.value)}
										onBlur={onShotBlur}
										placeholder='https://…/screenshot.png'
										className='field'
										data-bad={shotBad}
										aria-invalid={shotBad}
										aria-describedby={shotBad ? 'f-shot-err' : 'f-shot-tip'}
									/>
									{shotBad ? (
										<p id='f-shot-err' role='alert' className='field-err'>
											{t.m_shot_bad}
										</p>
									) : (
										<p id='f-shot-tip' className='field-tip'>
											{t.m_shot_tip}
										</p>
									)}
								</div>
							)}
							<div className='field-grid'>
								<div className='stack-8'>
									<label htmlFor='f-name' className='field-label'>
										{t.m_name}
									</label>
									<input id='f-name' type='text' value={form.name} onChange={(e) => setFormField('name', e.target.value)} placeholder={t.m_name_ph} className='field' />
								</div>
								{withAuthor && (
									<div className='stack-8'>
										<label htmlFor='f-author' className='field-label'>
											{t.m_author}
										</label>
										<input id='f-author' type='text' value={form.author} onChange={(e) => setFormField('author', e.target.value)} placeholder={t.m_author_ph} className='field' autoComplete='username' />
									</div>
								)}
							</div>
							<div className='stack-8'>
								<label htmlFor='f-desc' className='field-label'>
									{t.m_desc_l}{' '}
									<span className='field-count'>
										{form.desc.length}/{max}
									</span>
								</label>
								<textarea id='f-desc' rows={isShow ? 3 : 2} maxLength={max} value={form.desc} onChange={(e) => setFormField('desc', e.target.value.slice(0, max))} placeholder={t.m_desc_ph} className='field field-area' />
							</div>
							{/* The entry as it will land in the repository, for those who want to check it or take it to GitHub themselves. */}
							<details className='md-details'>
								<summary>
									{t.m_preview} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
								</summary>
								<pre className='md-preview' lang='en'>
									{entry}
								</pre>
								<div className='md-details-acts'>
									<button type='button' className='btn-g btn-copy-line' onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
										{copied === 'line' ? t.copied : t.copy_entry}
									</button>
									{bot.enabled && (
										<span className='modal-alt'>
											{t.sub_gh}{' '}
											<a href={edit} target='_blank' rel='noopener'>
												{fill(t.go_edit, { x: file })}
											</a>
											{' · '}
											<a href={issue} target='_blank' rel='noopener'>
												{t.go_pr}
											</a>
										</span>
									)}
								</div>
							</details>
						</>
					)}
					{bot.enabled && status.kind !== 'done' && <Captcha siteKey={bot.siteKey} lang={lang} round={round} onToken={setToken} onFail={() => setStatus({ kind: 'error', message: t.sub_failed })} />}
				</div>
				<div className='modal-foot'>
					{bot.enabled ? (
						status.kind === 'done' ? (
							<div role='status' className='sub-done'>
								<span>{t.sub_done}</span>
								<a className='btn-c btn-pr' href={status.url} target='_blank' rel='noopener'>
									{fill(t.sub_view, { n: status.number })}
								</a>
							</div>
						) : (
							<>
								{status.kind === 'error' ? (
									<p role='alert' className='field-err modal-hint'>
										{status.message}
									</p>
								) : (
									<p className='modal-hint' aria-live='polite'>
										{hint}
									</p>
								)}
								<button type='button' className='btn-c btn-pr' onClick={send} disabled={!canSend}>
									{status.kind === 'sending' ? t.sub_sending : t.sub_send}
								</button>
							</>
						)
					) : (
						<>
							<p className='modal-hint' aria-live='polite'>
								{hint}
							</p>
							<a className='btn-copy-line btn-pr' href={edit} target='_blank' rel='noopener'>
								{fill(t.go_edit, { x: file })}
							</a>
							<a className='btn-c btn-pr' href={issue} target='_blank' rel='noopener'>
								{t.go_pr}
							</a>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
