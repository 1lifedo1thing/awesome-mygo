import { type LangCode, SITE_REPO, SUBMIT_FILES, type SubmitCat, descMax, editUrl, entryProblem, fill, isBadUrl, isEntryComplete, issueUrl, jsonEntry, needsAuthor, needsRepo, repoOf } from '@awesome-mygo/catalog';
import { useEffect, useRef, useState } from 'react';
import { useLang, useT } from './lang';
import { useSite } from './site';
import { loadTurnstile } from './turnstile';

// The submit form's state and actions, shared by the original look's modal and the retro look's dialog; each renders its own markup.

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

export type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; url: string; number: number } | { kind: 'error'; message: string };

// The Turnstile widget. A token is good for one submission, so changing `round` renders a fresh widget.
export function Captcha({ siteKey, lang, round, onToken, onFail, theme = 'dark' }: { siteKey: string; lang: LangCode; round: number; onToken: (token: string) => void; onFail: () => void; theme?: 'dark' | 'light' }) {
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
					theme,
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
	}, [siteKey, lang, round, theme]);
	return <div ref={box} className='captcha' />;
}

export function useSubmit() {
	const { form } = useSite();
	const t = useT();
	const lang = useLang();
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

	return { bot, lang, token, setToken, round, status, setStatus, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send };
}
