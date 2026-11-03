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
