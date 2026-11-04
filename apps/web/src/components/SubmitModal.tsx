import { SHOWCASE_SOURCE, SITE_REPO, SUBMIT_CATS, type SubmitCat, descMax, isBadUrl, isEntryComplete, issueUrl, listEntry, showcaseEntry } from '@awesome-mygo/catalog';
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
	const ok = isEntryComplete(form) && form.desc.length <= max;
	const ph = { name: t.m_name, desc: t.md_desc };
	const entry = isShow ? showcaseEntry(form, form.mode, ph) : listEntry(form, ph);
	// Apps go to MyGo's own showcase.ts as a pull request; everything else opens an issue here, prefilled with the entry.
	const target = isShow ? SHOWCASE_SOURCE : issueUrl(SITE_REPO, catLabel[form.cat], form, ph);

	return (
		<div className='overlay overlay-center fade'>
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='dlg' className='modal enter'>
				<div className='modal-head'>
					<div className='stack-6'>
						<h2 id='dlg' className='modal-title'>
							{t.m_title}
						</h2>
						<p className='modal-sub'>{isShow ? t.m_desc_show : t.m_desc}</p>
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
						{t.m_preview} · {isShow ? 'website/src/showcase.ts' : `Issue › ${catLabel[form.cat]}`}
					</span>
					<div className='md-preview'>
						{!isShow && <span className='c-cyan'>+ </span>}
						{entry}
					</div>
				</div>
				<div className='modal-acts'>
					<button type='button' className='btn-g btn-copy-line' onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
						{copied === 'line' ? t.copied : t.copy_entry}
					</button>
					<a className='btn-c btn-pr' href={target} target='_blank' rel='noopener'>
						{isShow ? t.go_pr_show : t.go_pr}
					</a>
				</div>
			</div>
		</div>
	);
}
