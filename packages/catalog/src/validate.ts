import { LANGS, type Text } from './lang';

// The catalog JSON comes from contributors, so every entry is checked as it loads: a mistake fails the build and the tests with the file, the entry and the field, rather than rendering a broken card. data/schema/ describes the same shapes for editors.

export class CatalogError extends Error {}

type Raw = Record<string, unknown>;

export class Reader {
	// index is the entry's place in its file's list, or undefined for a file that holds a single entry (an app).
	constructor(
		readonly file: string,
		readonly index: number | undefined,
		readonly raw: Raw,
	) {}

	fail(field: string, why: string): never {
		const name = typeof this.raw.name === 'string' ? ` (${this.raw.name})` : typeof this.raw.title === 'string' ? ` (${this.raw.title})` : '';
		const where = this.index === undefined ? this.file : `${this.file} entry ${this.index + 1}`;
		throw new CatalogError(`${where}${name}: ${field} ${why}`);
	}

	str(field: string): string {
		const v = this.raw[field];
		if (typeof v !== 'string' || !v.trim()) this.fail(field, 'must be a non-empty string');
		return v;
	}

	optStr(field: string): string | undefined {
		return this.raw[field] === undefined ? undefined : this.str(field);
	}

	match(field: string, pattern: RegExp, what: string): string {
		const v = this.str(field);
		if (!pattern.test(v)) this.fail(field, `must be ${what}, got "${v}"`);
		return v;
	}

	url(field: string): string {
		return this.match(field, /^https:\/\/\S+$/, 'an https link');
	}

	optUrl(field: string): string | undefined {
		return this.raw[field] === undefined ? undefined : this.url(field);
	}

	oneOf<T extends string>(field: string, values: readonly T[]): T {
		const v = this.str(field);
		if (!values.includes(v as T)) this.fail(field, `must be one of ${values.join(', ')}, got "${v}"`);
		return v as T;
	}

	bool(field: string): boolean {
		const v = this.raw[field];
		if (typeof v !== 'boolean') this.fail(field, 'must be true or false');
		return v;
	}

	strings(field: string, min = 0): string[] {
		const v = this.raw[field];
		if (!Array.isArray(v) || v.length < min || v.some((x) => typeof x !== 'string' || !x.trim())) this.fail(field, min ? `must be a list of at least ${min} non-empty strings` : 'must be a list of non-empty strings');
		return v as string[];
	}

	text(field: string): Text {
		const v = this.raw[field];
		if (!v || typeof v !== 'object' || Array.isArray(v)) this.fail(field, 'must be an object of texts by language, e.g. { "en": "…" }');
		const entries = Object.entries(v as Raw);
		for (const [lang, s] of entries) {
			if (!LANGS.some((l) => l.code === lang)) this.fail(`${field}.${lang}`, `is not a site language (${LANGS.map((l) => l.code).join(', ')})`);
			if (typeof s !== 'string' || !s.trim()) this.fail(`${field}.${lang}`, 'must be a non-empty string');
		}
		if (!(v as Raw).en) this.fail(`${field}.en`, 'is required: English is the fallback for every other language');
		return v as Text;
	}

	only(fields: readonly string[]): void {
		for (const k of Object.keys(this.raw)) if (!fields.includes(k)) this.fail(k, `is not a known field (${fields.join(', ')})`);
	}
}

// Reads `key` from a data file's JSON as a list of entries, each through `read`.
export function readList<T>(file: string, json: unknown, key: string, read: (r: Reader) => T): T[] {
	const list = (json as Raw | null)?.[key];
	if (!Array.isArray(list)) throw new CatalogError(`${file}: "${key}" must be a list`);
	return list.map((raw, i) => {
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new CatalogError(`${file} entry ${i + 1}: must be an object`);
		return read(new Reader(file, i, raw as Raw));
	});
}

// Fails on two entries with the same value of `field`.
export function unique<T>(file: string, items: readonly T[], field: string, value: (t: T) => string): void {
	const seen = new Set<string>();
	for (const it of items) {
		const v = value(it);
		if (seen.has(v)) throw new CatalogError(`${file}: two entries have ${field} "${v}"`);
		seen.add(v);
	}
}
