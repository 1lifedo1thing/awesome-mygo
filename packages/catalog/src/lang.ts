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

// One value per entry of LANGS, in the same order. Used for the UI copy in strings.ts.
export type Localized = readonly [string, string, string, string, string];

// Text of a catalog entry, keyed by language. English is required; a missing language falls back to it.
export type Text = { en: string } & Partial<Record<LangCode, string>>;

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

export function pick(text: Text, code: LangCode): string {
	return text[code] || text.en;
}

// User agents that never get the browser-language redirect: search and AI crawlers, link-preview fetchers and audit tools. A crawler is shown exactly the language the URL declares, so the zh-CN bare URLs (also the hreflang x-default) are not seen as redirects to their ?lang= twins. Several Google fetchers (Google-InspectionTool, GoogleOther) have no "bot" in the UA, hence the explicit names.
export const CRAWLER_UA = /bot|crawl|spider|slurp|google|bing|baidu|yandex|duckduck|sogou|petal|yeti|naver|bytespider|applebot|facebookexternalhit|twitterbot|slackbot|discordbot|linkedinbot|telegrambot|whatsapp|preview|lighthouse/i;

// How a page was reached, for the bare-URL language choice. referrer is document.referrer ('' for a typed or bookmarked visit); origin is the site's own origin.
export interface LangVisit {
	userAgent?: string;
	referrer?: string;
	origin?: string;
}

// The language a visit on a bare URL should switch to (the default language means stay). A crawler always stays. A previously saved choice wins next. A visitor arriving from another site (a search result, a shared link) keeps the language the URL declares, so a search engine's hreflang choice holds; a typed, bookmarked or same-site visit follows the browser language, then the default.
export function negotiateLang(saved: string | null, browser: string | null | undefined, visit: LangVisit = {}): LangCode {
	if (CRAWLER_UA.test(visit.userAgent ?? '')) return DEFAULT_LANG;
	if (isLangCode(saved)) return saved;
	const ref = visit.referrer ?? '';
	if (ref && !ref.startsWith(`${visit.origin ?? ''}/`)) return DEFAULT_LANG;
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

// The same choice as negotiateLang, as an inline <head> script: it runs before React hydrates, so a first visit on a bare URL is sent to its ?lang= page by the server instead of switching language mid-hydration (which made React report hydration mismatches and flashed the Chinese page first). Any explicit valid ?lang=, the default language included, is final. Kept in sync with negotiateLang by the tests.
export function langRedirectScript(): string {
	const codes = JSON.stringify(LANGS.map((l) => l.code));
	return `(function(){var C=${codes},D=${JSON.stringify(DEFAULT_LANG)},u=new URL(location.href),q=u.searchParams.get('lang');if(q&&C.indexOf(q)>=0)return;if(${CRAWLER_UA}.test(navigator.userAgent||''))return;var s=null;try{s=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)})}catch(e){}var w;if(s&&C.indexOf(s)>=0)w=s;else{var r=document.referrer||'';if(r&&r.indexOf(location.origin+'/')!==0)return;var n=(navigator.language||'').toLowerCase();w=n.indexOf('zh')===0?(n.indexOf('tw')>=0||n.indexOf('hk')>=0||n.indexOf('hant')>=0?'zh-TW':'zh-CN'):n.indexOf('ja')===0?'ja':n.indexOf('ko')===0?'ko':n.indexOf('en')===0?'en':D}if(w===D)return;u.searchParams.set('lang',w);location.replace(u.toString())})()`;
}
