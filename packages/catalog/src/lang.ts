export interface LangDef {
	code: LangCode;
	native: string;
	short: string;
	// Western scripts animate the hero headline word by word; CJK scripts character by character.
	words: boolean;
}

export const LANGS = [
	{ code: 'zh-CN', native: '简体中文', short: '简', words: false },
	{ code: 'zh-TW', native: '繁體中文', short: '繁', words: false },
	{ code: 'en', native: 'English', short: 'EN', words: true },
	{ code: 'ja', native: '日本語', short: '日', words: false },
	{ code: 'ko', native: '한국어', short: '한', words: true },
] as const satisfies readonly { code: string; native: string; short: string; words: boolean }[];

export type LangCode = (typeof LANGS)[number]['code'];

// One value per entry of LANGS, in the same order.
export type Localized = readonly [string, string, string, string, string];

// Simplified Chinese lives at the bare URL; every other language is addressed with `?lang=<code>`.
export const DEFAULT_LANG = 'zh-CN' satisfies LangCode;

export const LANG_STORAGE_KEY = 'awesome-mygo-lang';

export function isLangCode(value: unknown): value is LangCode {
	return typeof value === 'string' && LANGS.some((l) => l.code === value);
}

export function langIndex(code: LangCode): number {
	return LANGS.findIndex((l) => l.code === code);
}

export function langDef(code: LangCode): LangDef {
	return LANGS[langIndex(code)];
}

export function pick(values: Localized, code: LangCode): string {
	return values[langIndex(code)];
}

// The language a first-time visit on a bare URL should switch to: a previously saved choice wins, then the browser language, then the default.
export function negotiateLang(saved: string | null, browser: string | null | undefined): LangCode {
	if (isLangCode(saved)) return saved;
	const nl = (browser ?? '').toLowerCase();
	if (nl.startsWith('zh')) return nl.includes('tw') || nl.includes('hk') || nl.includes('hant') ? 'zh-TW' : 'zh-CN';
	if (nl.startsWith('ja')) return 'ja';
	if (nl.startsWith('ko')) return 'ko';
	if (nl.startsWith('en')) return 'en';
	return DEFAULT_LANG;
}

export function fill(template: string, values: { x?: string; n?: number | string }): string {
	let out = template;
	if (values.x !== undefined) out = out.replace('{x}', values.x);
	if (values.n !== undefined) out = out.replace('{n}', String(values.n));
	return out;
}

// The same choice as negotiateLang, as an inline <head> script: it runs before React hydrates, so a first visit on a bare URL is sent to its ?lang= page by the server instead of switching language mid-hydration (which made React report hydration mismatches and flashed the Chinese page first). Kept in sync with negotiateLang by the tests.
export function langRedirectScript(): string {
	const codes = JSON.stringify(LANGS.map((l) => l.code));
	return `(function(){var C=${codes},D=${JSON.stringify(DEFAULT_LANG)},u=new URL(location.href),q=u.searchParams.get('lang');if(q&&q!==D&&C.indexOf(q)>=0)return;var s=null;try{s=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)})}catch(e){}var w;if(s&&C.indexOf(s)>=0)w=s;else{var n=(navigator.language||'').toLowerCase();w=n.indexOf('zh')===0?(n.indexOf('tw')>=0||n.indexOf('hk')>=0||n.indexOf('hant')>=0?'zh-TW':'zh-CN'):n.indexOf('ja')===0?'ja':n.indexOf('ko')===0?'ko':n.indexOf('en')===0?'en':D}if(w===D)return;u.searchParams.set('lang',w);location.replace(u.toString())})()`;
}
