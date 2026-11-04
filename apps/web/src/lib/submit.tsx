import { type DraftField, type LangCode, SITE_REPO, type SubmitCat, buildEntry, descMax, editUrl, entryCats, entryPath, entryProblem, fill, guessFromLink, isBadRepo, isBadShot, isBadUrl, isEntryComplete, issueUrl, jsonEntry, missingFields, needsAuthor, needsRepo, parseEntryJson, pastedEntryProblem, pastedName, repoOf, withScheme } from '@awesome-mygo/catalog';
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
	const [repoTouched, setRepoTouched] = useState(false);
	const [shotTouched, setShotTouched] = useState(false);

	// A result or an error belongs to what was submitted; editing the form clears it.
	useEffect(() => setStatus({ kind: 'idle' }), [form.cat, form.mode, form.name, form.author, form.url, form.repo, form.screenshot, form.desc, form.category, form.via, form.json]);

	const catLabel: Record<SubmitCat, string> = { ui: t.cat_ui_name, state: t.cat_state_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article };
	const isShow = form.cat === 'showcase';
	const max = descMax(form.cat);
	const urlBad = urlTouched && isBadUrl(form.url);
	const repoBad = isShow && repoTouched && isBadRepo(form.repo ?? '');
	const shotBad = isShow && shotTouched && isBadShot(form.screenshot ?? '');
	// What the main link is: a showcase app's homepage, the repository of a UI library or state solution, or just a link.
	const urlLabel = isShow ? t.m_home : needsRepo(form.cat) ? t.m_gh : t.m_link;
	// A pasted entry: what it is, and what keeps it from being submitted as an entry of the picked category.
	const viaJson = form.via === 'json';
	const pasted = viaJson && form.json.trim() ? parseEntryJson(form.json) : undefined;
	const pastedEntry = pasted && 'entry' in pasted ? pasted.entry : undefined;
	const jsonError = !pasted ? undefined : 'error' in pasted ? (pasted.error === 'json' ? t.m_json_bad : t.m_json_obj) : pastedEntryProblem(form.cat, pasted.entry);
	const ok = viaJson ? Boolean(pastedEntry) && !jsonError : isEntryComplete(form.cat, form) && form.desc.length <= max;
	const ph = { name: t.m_name, desc: t.md_desc };
	const withAuthor = needsAuthor(form.cat);
	// The fields only an app has are dropped for the other categories, also when they were filled in before the category changed.
	const draft = isShow ? form : { ...form, category: undefined, repo: undefined, screenshot: undefined };
	// The entry as it will be filed: the pasted one, or the one the form builds. An app's file is named after its slug.
	const entryObj = pastedEntry ?? buildEntry(form.cat, draft, form.mode, ph);
	const file = entryPath(form.cat, entryObj);
	// The shape of the category's entry, shown in the empty JSON field.
	const example = jsonEntry(form.cat, { name: '', author: '', url: '', desc: '' }, form.mode, ph);
	const entry = pastedEntry ? JSON.stringify(pastedEntry, null, 2) : jsonEntry(form.cat, draft, form.mode, ph);
	// Every category ends up as an entry in a JSON file here: either an issue prefilled with the entry, or GitHub's editor (a new file for an app, the category's file otherwise) for a pull request.
	const issue = issueUrl(SITE_REPO, form.cat, catLabel[form.cat], pastedEntry ? { ...draft, name: pastedName(pastedEntry) } : draft, entry, ph);
	const edit = editUrl(SITE_REPO, form.cat, entryObj);
	const repoMissing = urlTouched && needsRepo(form.cat) && form.url.length > 0 && !isBadUrl(form.url) && !repoOf(form.url);
	const canSend = bot.enabled && (viaJson ? ok : !entryProblem(form.cat, draft)) && token !== '' && status.kind !== 'sending';

	// Pasting an entry that only one category's file takes picks that category.
	const onJsonChange = (text: string) => {
		setFormField('json', text);
		const p = text.trim() ? parseEntryJson(text) : undefined;
		if (!p || !('entry' in p)) return;
		const cats = entryCats(p.entry);
		if (cats.length === 1 && cats[0] !== form.cat) setFormField('cat', cats[0]);
	};

	// Leaving a link field: add the missing https://, and from a GitHub repository link fill in the name and author the visitor has not typed.
	const fillFrom = (url: string) => {
		const guess = guessFromLink(url);
		if (!guess) return;
		if (!form.name.trim()) setFormField('name', guess.name);
		if (withAuthor && !form.author.trim()) setFormField('author', guess.author);
	};
	const onUrlBlur = () => {
		setUrlTouched(true);
		const url = withScheme(form.url);
		if (url !== form.url) setFormField('url', url);
		fillFrom(url);
	};
	const onRepoBlur = () => {
		setRepoTouched(true);
		const repo = withScheme(form.repo ?? '');
		if (repo !== form.repo) setFormField('repo', repo);
		fillFrom(repo);
	};
	const onShotBlur = () => {
		setShotTouched(true);
		const shot = withScheme(form.screenshot ?? '');
		if (shot !== form.screenshot) setFormField('screenshot', shot);
	};

	// Why the submit button is not ready yet, in words.
	const fieldLabel: Record<DraftField, string> = { url: urlLabel, name: t.m_name, author: t.m_author, desc: t.m_desc_l };
	const missing = viaJson ? [] : missingFields(form.cat, form);
	const need = viaJson ? (pasted ? '' : fill(t.sub_need, { x: t.m_json })) : missing.length > 0 ? fill(t.sub_need, { x: new Intl.ListFormat(lang, { type: 'conjunction' }).format(missing.map((f) => fieldLabel[f])) }) : '';
	const hint = status.kind === 'sending' || status.kind === 'done' ? '' : need || (viaJson && jsonError ? t.m_json_fix : bot.enabled && !token ? t.sub_wait : '');

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
				body: JSON.stringify(pastedEntry ? { cat: form.cat, entry: pastedEntry, token } : { cat: form.cat, mode: form.mode, name: form.name, author: withAuthor ? form.author : '', url: form.url, repo: isShow ? form.repo : undefined, screenshot: isShow && form.screenshot?.trim() ? form.screenshot.trim() : undefined, desc: form.desc, category: isShow ? form.category : undefined, token }),
			});
			const body = (await res.json().catch(() => ({}))) as { url?: string; number?: number; error?: string; message?: string };
			setStatus(res.ok && body.url && body.number ? { kind: 'done', url: body.url, number: body.number } : { kind: 'error', message: errorText(body) });
		} catch {
			setStatus({ kind: 'error', message: t.sub_failed });
		}
		setToken('');
		setRound((n) => n + 1);
	};

	return { bot, lang, token, setToken, round, status, setStatus, catLabel, isShow, max, urlBad, ok, withAuthor, file, entry, issue, edit, repoMissing, canSend, send, onUrlBlur, hint, viaJson, jsonError, onJsonChange, example, repoBad, onRepoBlur, shotBad, onShotBlur, urlLabel };
}
