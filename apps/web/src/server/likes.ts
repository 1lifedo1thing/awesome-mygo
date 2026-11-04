// Likes are stored in D1 (the DB binding), one row per entry and visitor. A visitor is a SHA-256 of a secret salt and their IP, so the table holds no address and the same IP always maps to the same voter.

export interface D1Like {
	prepare(query: string): { bind(...values: unknown[]): D1Stmt } & D1Stmt;
	batch(statements: D1Stmt[]): Promise<unknown[]>;
}
interface D1Stmt {
	all<T>(): Promise<{ results: T[] }>;
	first<T>(): Promise<T | null>;
	run(): Promise<unknown>;
}

export async function voterId(salt: string, ip: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function likeCounts(db: D1Like): Promise<Record<string, number>> {
	const { results } = await db.prepare('SELECT item, COUNT(*) AS n FROM likes GROUP BY item').all<{ item: string; n: number }>();
	return Object.fromEntries(results.map((r) => [r.item, r.n]));
}

export async function likedBy(db: D1Like, voter: string): Promise<string[]> {
	const { results } = await db.prepare('SELECT item FROM likes WHERE voter = ?').bind(voter).all<{ item: string }>();
	return results.map((r) => r.item);
}

// Likes or unlikes an entry for a visitor and returns its new count. Repeating either is harmless.
export async function setLike(db: D1Like, item: string, voter: string, liked: boolean, now: number): Promise<number> {
	const write = liked ? db.prepare('INSERT OR IGNORE INTO likes (item, voter, created_at) VALUES (?, ?, ?)').bind(item, voter, now) : db.prepare('DELETE FROM likes WHERE item = ? AND voter = ?').bind(item, voter);
	const count = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE item = ?').bind(item);
	const [, rows] = (await db.batch([write, count])) as [unknown, { results: { n: number }[] }];
	return rows.results[0]?.n ?? 0;
}
