import { DATA_DIR, SITE_REPO, SUBMIT_CATS, SUBMIT_FILES, type SubmitCat, descMax, editUrl, fill, isBadUrl, isEntryComplete, issueUrl, jsonEntry, needsAuthor } from '@awesome-mygo/catalog';
import { useDialog } from '../lib/dialog';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { CloseIcon } from './bits';

export function SubmitModal() {
	const { modal } = useSite();
	return modal ? <Modal /> : null;
}

function Modal() {
	const { closeSubmit, form, setFormField, copy, copied } = useSite();
	const t = useT();
	const ref = useDialog<HTMLDivElement>();

	const catLabel: Record<SubmitCat, string> = { ui: t.cat_ui_name, state: t.cat_state_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article };
	const isShow = form.cat === 'showcase';
	const max = descMax(form.cat);
	const urlBad = isBadUrl(form.url);
	const ok = isEntryComplete(form.cat, form) && form.desc.length <= max;
	const ph = { name: t.m_name, desc: t.md_desc };
	const withAuthor = needsAuthor(form.cat);
	const file = SUBMIT_FILES[form.cat].file;
	const entry = jsonEntry(form.cat, form, form.mode, ph);
	// Every category ends up as an entry in its JSON file here: either an issue prefilled with the entry, or GitHub's editor on that file for a pull request.
	const issue = issueUrl(SITE_REPO, form.cat, catLabel[form.cat], form, entry, ph);
	const edit = editUrl(SITE_REPO, form.cat);

	return (
		<div className='overlay overlay-center fade'>
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='dlg' className='modal enter'>
				<div className='modal-head'>
					<div className='stack-6'>
						<h2 id='dlg' className='modal-title'>
							{t.m_title}
						</h2>
						<p className='modal-sub'>{t.m_desc}</p>
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
				{isShow && (
					<div className='stack-8'>
						<span className='field-label'>{t.a_kind}</span>
						<div className='cat-opts' role='radiogroup' aria-label={t.a_kind}>
							{(['native', 'web'] as const).map((m) => (
								<button key={m} type='button' role='radio' aria-checked={form.mode === m} className='cat-opt' onClick={() => setFormField('mode', m)}>
									{m === 'native' ? 'Native UI' : t.web_fe}
								</button>
							))}
						</div>
					</div>
				)}
				<div className='field-grid'>
					<div className='stack-8'>
						<label htmlFor='f-name' className='field-label'>
							{t.m_name}
						</label>
						<input id='f-name' type='text' value={form.name} onChange={(e) => setFormField('name', e.target.value)} placeholder={t.m_name_ph} className='field' />
					</div>
					<div className='stack-8'>
						<label htmlFor='f-url' className='field-label'>
							{t.m_link}
						</label>
						<input
							id='f-url'
							type='url'
							value={form.url}
							onChange={(e) => setFormField('url', e.target.value)}
							placeholder='https://github.com/…'
							className='field'
							data-bad={urlBad}
							aria-invalid={urlBad}
							aria-describedby={urlBad ? 'f-url-err' : undefined}
						/>
					</div>
				</div>
				{withAuthor && (
					<div className='stack-8'>
						<label htmlFor='f-author' className='field-label'>
							{t.m_author}
						</label>
						<input id='f-author' type='text' value={form.author} onChange={(e) => setFormField('author', e.target.value)} placeholder={t.m_author_ph} className='field' autoComplete='username' />
					</div>
				)}
				{urlBad && (
					<p id='f-url-err' role='alert' className='field-err'>
						{t.m_bad}
					</p>
				)}
				<div className='stack-8'>
					<label htmlFor='f-desc' className='field-label'>
						{t.m_desc_l}{' '}
						<span className='field-count'>
							{form.desc.length}/{max}
						</span>
					</label>
					<textarea id='f-desc' rows={isShow ? 3 : 2} maxLength={max} value={form.desc} onChange={(e) => setFormField('desc', e.target.value.slice(0, max))} placeholder={t.m_desc_ph} className='field field-area' />
				</div>
				<div className='stack-8'>
					<span className='field-label'>
						{t.m_preview} · <span lang='en'>{`${DATA_DIR}/${file}`}</span>
					</span>
					<pre className='md-preview' lang='en'>
						{entry}
					</pre>
				</div>
				<div className='modal-acts'>
					<button type='button' className='btn-g btn-copy-line' onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
						{copied === 'line' ? t.copied : t.copy_entry}
					</button>
					<a className='btn-copy-line btn-pr' href={edit} target='_blank' rel='noopener'>
						{fill(t.go_edit, { x: file })}
					</a>
					<a className='btn-c btn-pr' href={issue} target='_blank' rel='noopener'>
						{t.go_pr}
					</a>
				</div>
			</div>
		</div>
	);
}
