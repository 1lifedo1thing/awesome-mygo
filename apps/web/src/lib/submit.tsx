import { type DraftField, type LangCode, SITE_REPO, SUBMIT_FILES, type SubmitCat, descMax, editUrl, entryProblem, fill, guessFromLink, isBadUrl, isEntryComplete, issueUrl, jsonEntry, missingFields, needsAuthor, needsRepo, repoOf, withScheme } from '@awesome-mygo/catalog';
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

// The Turnstile widget. A token is good for one submission, so changing `round` renders a fresh widget. It stays out of sight unless Cloudflare needs the visitor to click, so most visitors never see it.
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
					appearance: 'interaction-only',
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
	const { form, setFormField } = useSite();
	const t = useT();
	const lang = useLang();
	const bot = useBot();
	const [token, setToken] = useState('');
	const [round, setRound] = useState(0);
	const [status, setStatus] = useState<Status>({ kind: 'idle' });
	// The link is judged once the visitor leaves the field, not while they are still typing it.
	const [urlTouched, setUrlTouched] = useState(false);

	// A result or an error belongs to what was submitted; editing the form clears it.
	useEffect(() => setStatus({ kind: 'idle' }), [form.cat, form.mode, form.name, form.author, form.url, form.desc, form.category]);

	const catLabel: Record<SubmitCat, string> = { ui: t.cat_ui_name, state: t.cat_state_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article };
	const isShow = form.cat === 'showcase';
	const max = descMax(form.cat);
	const urlBad = urlTouched && isBadUrl(form.url);
	const ok = isEntryComplete(form.cat, form) && form.desc.length <= max;
	const ph = { name: t.m_name, desc: t.md_desc };
	const withAuthor = needsAuthor(form.cat);
	const file = SUBMIT_FILES[form.cat].file;
	const draft = isShow ? form : { ...form, category: undefined };
	const entry = jsonEntry(form.cat, draft, form.mode, ph);
	// Every category ends up as an entry in its JSON file here: either an issue prefilled with the entry, or GitHub's editor on that file for a pull request.
	const issue = issueUrl(SITE_REPO, form.cat, catLabel[form.cat], draft, entry, ph);
	const edit = editUrl(SITE_REPO, form.cat);
	const repoMissing = urlTouched && needsRepo(form.cat) && form.url.length > 0 && !isBadUrl(form.url) && !repoOf(form.url);
	const canSend = bot.enabled && !entryProblem(form.cat, form) && token !== '' && status.kind !== 'sending';

	// Leaving the link field: add the missing https://, and from a GitHub repository link fill in the name and author the visitor has not typed.
	const onUrlBlur = () => {
		setUrlTouched(true);
		const url = withScheme(form.url);
		if (url !== form.url) setFormField('url', url);
		const guess = guessFromLink(url);
		if (!guess) return;
		if (!form.name.trim()) setFormField('name', guess.name);
		if (withAuthor && !form.author.trim()) setFormField('author', guess.author);
	};

	// Why the submit button is not ready yet, in words.
	const fieldLabel: Record<DraftField, string> = { url: t.m_link, name: t.m_name, author: t.m_author, desc: t.m_desc_l };
	const missing = missingFields(form.cat, form);
	const hint = status.kind === 'sending' || status.kind === 'done' ? '' : missing.length > 0 ? fill(t.sub_need, { x: new Intl.ListFormat(lang, { type: 'conjunction' }).format(missing.map((f) => fieldLabel[f])) }) : bot.enabled && !token ? t.sub_wait : '';

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
				body: JSON.stringify({ cat: form.cat, mode: form.mode, name: form.name, author: withAuthor ? form.author : '', url: form.url, desc: form.desc, category: isShow ? form.category : undefined, token }),
			});
			const body = (await res.json().catch(() => ({}))) as { url?: string; number?: number; error?: string; message?: string };
			setStatus(res.ok && body.url && body.number ? { kind: 'done', url: body.url, number: body.number } : { kind: 'error', message: errorText(body) });
		} catch {
			setStatus({ kind: 'error', message: t.sub_failed });
		}
		setToken('');
		setRound((n) => n + 1);
	};

	return { bot, lang, token, setToken, round, status, setStatus, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send, onUrlBlur, hint };
}
