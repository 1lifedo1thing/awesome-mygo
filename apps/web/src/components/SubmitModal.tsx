import { DATA_DIR, type LangCode, SITE_REPO, SUBMIT_CATS, SUBMIT_FILES, type SubmitCat, descMax, editUrl, entryProblem, fill, isBadUrl, isEntryComplete, issueUrl, jsonEntry, needsAuthor, needsRepo, repoOf } from '@awesome-mygo/catalog';
import { useEffect, useRef, useState } from 'react';
import { useDialog } from '../lib/dialog';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { loadTurnstile } from '../lib/turnstile';
import { CloseIcon } from './bits';

// Whether the site's bot can submit for visitors without a GitHub account (see routes/api/submit.ts). Asked once per page load; until it answers, or when it is off, the form offers the GitHub links only.
type Bot = { enabled: false } | { enabled: true; siteKey: string };
let botQuery: Promise<Bot> | undefined;

function queryBot(): Promise<Bot> {
	botQuery ??= fetch('/api/submit')
		.then((res) => (res.ok ? (res.json() as Promise<Bot>) : { enabled: false as const }))
		.catch(() => {
			botQuery = undefined;
			return { enabled: false as const };
		});
	return botQuery;
}

function useBot(): Bot {
	const [bot, setBot] = useState<Bot>({ enabled: false });
	useEffect(() => {
		let live = true;
		queryBot().then((b) => live && setBot(b));
		return () => {
			live = false;
		};
	}, []);
	return bot;
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; url: string; number: number } | { kind: 'error'; message: string };

// The Turnstile widget. A token is good for one submission, so changing `round` renders a fresh widget.
function Captcha({ siteKey, lang, round, onToken, onFail }: { siteKey: string; lang: LangCode; round: number; onToken: (token: string) => void; onFail: () => void }) {
	const box = useRef<HTMLDivElement>(null);
	const handlers = useRef({ onToken, onFail });
	handlers.current = { onToken, onFail };
	useEffect(() => {
		let live = true;
		let remove: (() => void) | undefined;
		loadTurnstile().then(
			(ts) => {
				if (!live || !box.current) return;
				const id = ts.render(box.current, {
					sitekey: siteKey,
					theme: 'dark',
					size: 'flexible',
					language: lang.toLowerCase(),
					callback: (token) => handlers.current.onToken(token),
					'expired-callback': () => handlers.current.onToken(''),
					'error-callback': () => handlers.current.onToken(''),
				});
				remove = () => ts.remove(id);
			},
			() => live && handlers.current.onFail(),
		);
		return () => {
			live = false;
			remove?.();
		};
	}, [siteKey, lang, round]);
	return <div ref={box} className='captcha' />;
}

export function SubmitModal() {
	const { modal } = useSite();
	return modal ? <Modal /> : null;
}

function Modal() {
	const { closeSubmit, form, setFormField, copy, copied } = useSite();
	const t = useT();
	const lang = useLang();
	const ref = useDialog<HTMLDivElement>();
	const bot = useBot();
	const [token, setToken] = useState('');
	const [round, setRound] = useState(0);
	const [status, setStatus] = useState<Status>({ kind: 'idle' });

	// A result or an error belongs to what was submitted; editing the form clears it.
	useEffect(() => setStatus({ kind: 'idle' }), [form.cat, form.mode, form.name, form.author, form.url, form.desc]);

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
	const repoMissing = needsRepo(form.cat) && form.url.length > 0 && !urlBad && !repoOf(form.url);
	const canSend = bot.enabled && !entryProblem(form.cat, form) && token !== '' && status.kind !== 'sending';

	const errorText = (body: { error?: string; message?: string }): string => {
		switch (body.error) {
			case 'limited':
				return t.sub_limited;
			case 'busy':
				return t.sub_busy;
			case 'captcha':
				return t.sub_captcha;
			case 'invalid':
				return body.message ? fill(t.sub_err, { x: body.message }) : t.sub_failed;
			default:
				return t.sub_failed;
		}
	};

	const send = async () => {
		setStatus({ kind: 'sending' });
		try {
			const res = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ cat: form.cat, mode: form.mode, name: form.name, author: withAuthor ? form.author : '', url: form.url, desc: form.desc, token }),
			});
			const body = (await res.json().catch(() => ({}))) as { url?: string; number?: number; error?: string; message?: string };
			setStatus(res.ok && body.url && body.number ? { kind: 'done', url: body.url, number: body.number } : { kind: 'error', message: errorText(body) });
		} catch {
			setStatus({ kind: 'error', message: t.sub_failed });
		}
		setToken('');
		setRound((n) => n + 1);
	};

	return (
		<div className='overlay overlay-center fade'>
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='dlg' className='modal enter'>
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
				{isShow && (
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
				{repoMissing && (
					<p role='alert' className='field-err'>
						{t.m_repo}
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
							<Captcha siteKey={bot.siteKey} lang={lang} round={round} onToken={setToken} onFail={() => setStatus({ kind: 'error', message: t.sub_failed })} />
							{status.kind === 'error' && (
								<p role='alert' className='field-err'>
									{status.message}
								</p>
							)}
							<div className='modal-acts'>
								<button type='button' className='btn-g btn-copy-line' onClick={() => ok && copy(entry, 'line')} disabled={!ok}>
									{copied === 'line' ? t.copied : t.copy_entry}
								</button>
								<button type='button' className='btn-c btn-pr' onClick={send} disabled={!canSend}>
									{status.kind === 'sending' ? t.sub_sending : t.sub_send}
								</button>
							</div>
							<p className='modal-alt'>
								{t.sub_gh}{' '}
								<a href={edit} target='_blank' rel='noopener'>
									{fill(t.go_edit, { x: file })}
								</a>
								{' · '}
								<a href={issue} target='_blank' rel='noopener'>
									{t.go_pr}
								</a>
							</p>
						</>
					)
				) : (
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
				)}
			</div>
		</div>
	);
}
