import { describe, expect, it } from 'vitest';
import { ARCHIVED_FACTOR, NEUTRAL, SCORE_SIGNALS, SCORE_WEIGHTS, type Score, type ScoreSignal, type ScoreSignals, activityShare, releaseShare, scoreKey, scoreOf, scoreTarget } from './score';

// The formula is a pure function of the signals and the day they were taken, so every case passes its own asOf.
const AS_OF = '2026-11-02';
const daysBefore = (n: number) => new Date(Date.parse(`${AS_OF}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

// An open-source app, measured in full.
const OPEN: ScoreSignals = { repo: 'egoist/kero', stars: 1419, weeks: 12, activeWeeks: 12, license: 'MIT', osi: true, released: daysBefore(2), likes: 0 };
// An official plugin, in a folder of egoist/mygo.
const PLUGIN: ScoreSignals = { repo: 'egoist/mygo', path: 'plugins/sqlite', weeks: 6, activeWeeks: 4, license: 'MIT', osi: true, released: daysBefore(1), likes: 0 };

const part = (score: Score, signal: ScoreSignal) => score.parts.find((p) => p.signal === signal)!;
const points = (s: ScoreSignals, signal: ScoreSignal) => part(scoreOf(s, AS_OF), signal).points;
// Every score this file computes, to check the total against its parts.
const seen: Score[] = [];
const score = (s: ScoreSignals, asOf = AS_OF) => {
	const sc = scoreOf(s, asOf);
	seen.push(sc);
	return sc;
};

describe('scoreOf', () => {
	it('weighs the signals to 100 in all', () => {
		expect(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
		expect(score(OPEN).parts.map((p) => [p.signal, p.max])).toEqual(SCORE_SIGNALS.map((s) => [s, SCORE_WEIGHTS[s]]));
	});

	it('counts stars on a log scale, in full from 1,000', () => {
		const stars = (n: number) => part(score({ ...OPEN, stars: n }), 'stars').points / SCORE_WEIGHTS.stars;
		expect(stars(0)).toBe(0);
		expect(stars(1)).toBeCloseTo(0.1, 2);
		expect(stars(20)).toBeCloseTo(0.44, 2);
		expect(stars(100)).toBeCloseTo(0.67, 2);
		// 999 stars is just under the anchor, which rounding to a tenth of a point no longer shows; 900 still does.
		expect(stars(999)).toBeLessThanOrEqual(1);
		expect(stars(900)).toBeLessThan(1);
		expect(stars(1000)).toBe(1);
		expect(stars(100_000)).toBe(1);
	});

	it('counts likes on a log scale, in full from 50', () => {
		const likes = (n: number) => part(score({ ...OPEN, likes: n }), 'likes').points;
		expect(likes(0)).toBe(0);
		expect(likes(1)).toBe(2.6);
		expect(likes(2)).toBe(4.2);
		expect(likes(10)).toBe(9.1);
		expect(likes(49)).toBeLessThan(15);
		expect(likes(50)).toBe(15);
		expect(likes(500)).toBe(15);
	});

	it('never lowers the score when a signal grows', () => {
		for (const [field, values] of [
			['stars', [0, 1, 2, 5, 10, 20, 31, 50, 100, 300, 999, 1000, 5000]],
			['likes', [0, 1, 2, 3, 5, 10, 20, 49, 50, 100]],
			['activeWeeks', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
		] as const) {
			const totals = values.map((v) => score({ ...OPEN, stars: 3, likes: 0, activeWeeks: 0, [field]: v }).total);
			for (let i = 1; i < totals.length; i++) expect(totals[i], `${field} ${values[i]}`).toBeGreaterThanOrEqual(totals[i - 1]);
		}
	});

	it('counts openness and license as one scale', () => {
		expect(points(OPEN, 'openness')).toBe(20);
		expect(points({ ...OPEN, license: 'BUSL-1.1', osi: false }, 'openness')).toBe(12);
		expect(points({ ...OPEN, license: 'NOASSERTION', osi: false }, 'openness')).toBe(12);
		expect(points({ ...OPEN, license: null, osi: undefined }, 'openness')).toBe(6);
		expect(points({ likes: 0 }, 'openness')).toBe(0);
		expect(part(score({ likes: 0 }), 'openness').basis).toBe('measured');
	});

	it('counts a release within 90 days in full, within a year for half', () => {
		expect(releaseShare(daysBefore(89), AS_OF)).toBe(1);
		expect(releaseShare(daysBefore(90), AS_OF)).toBe(1);
		expect(releaseShare(daysBefore(91), AS_OF)).toBe(0.5);
		expect(releaseShare(daysBefore(365), AS_OF)).toBe(0.5);
		expect(releaseShare(daysBefore(366), AS_OF)).toBe(0);
		// A release after the day the signals were taken (the workflow reads releases later in the week) is fresh.
		expect(releaseShare(daysBefore(-3), AS_OF)).toBe(1);
		expect(releaseShare(daysBefore(-7), AS_OF)).toBe(1);
		// Later than that week cannot have been read in it: a tag dated in the future earns nothing.
		expect(releaseShare(daysBefore(-8), AS_OF)).toBe(0);
		expect(releaseShare('2099-01-01', AS_OF)).toBe(0);
		expect(releaseShare(undefined, AS_OF)).toBe(0);
		expect(points({ ...OPEN, released: daysBefore(91) }, 'release')).toBe(5);
		expect(points({ ...OPEN, released: undefined }, 'release')).toBe(0);
		expect(part(score({ ...OPEN, released: undefined }), 'release').basis).toBe('measured');
	});

	it('counts a closed-source app\'s unmeasurable signals at neutral, and its likes as they are', () => {
		const pulse = score({ likes: 2 });
		expect(pulse.parts.map((p) => [p.signal, p.points, p.basis])).toEqual([
			['stars', 15, 'neutral'],
			['activity', 12.5, 'neutral'],
			['openness', 0, 'measured'],
			['likes', 4.2, 'measured'],
			['release', 5, 'neutral'],
		]);
		expect(pulse.total).toBe(37);
		expect(pulse.measured).toBeCloseTo(0.35, 10);
		expect(score({ likes: 0 }).total).toBe(33);
		// Signals recorded for a closed-source entry by mistake count for nothing.
		expect(score({ likes: 2, stars: 5000, weeks: 12, activeWeeks: 12, released: AS_OF }).total).toBe(37);
	});

	it('counts an official plugin\'s stars at neutral, as its repository\'s are not its own', () => {
		const sqlite = score(PLUGIN);
		expect(part(sqlite, 'stars')).toEqual({ signal: 'stars', points: 15, max: 30, basis: 'neutral' });
		expect(part(sqlite, 'activity').basis).toBe('measured');
		expect(sqlite.measured).toBeCloseTo(0.7, 10);
		// Stars recorded for it by mistake are not counted either.
		expect(score({ ...PLUGIN, stars: 4592 }).total).toBe(sqlite.total);
		expect(score(OPEN).measured).toBe(1);
	});

	it('counts an unmeasured activity at neutral', () => {
		const s = score({ ...OPEN, weeks: undefined, activeWeeks: undefined });
		expect(part(s, 'activity')).toEqual({ signal: 'activity', points: 25 * NEUTRAL, max: 25, basis: 'neutral' });
	});

	it('halves an archived repository\'s score', () => {
		const live = score(OPEN);
		const archived = score({ ...OPEN, archived: true });
		expect(archived.archived).toBe(true);
		expect(live.archived).toBe(false);
		expect(archived.parts).toEqual(live.parts);
		expect(archived.total).toBe(Math.round(ARCHIVED_FACTOR * live.parts.reduce((n, p) => n + p.points, 0)));
		expect(archived.total).toBeLessThan(live.total);
	});

	it('gives the same score for the same signals, whenever it is computed', () => {
		expect(scoreOf(OPEN, AS_OF)).toEqual(scoreOf(OPEN, AS_OF));
		expect(scoreOf({ likes: 2 }, AS_OF)).toEqual(scoreOf({ likes: 2 }, '2027-01-04'));
	});

	it('makes the total of every score its parts\' points, rounded', () => {
		for (const stars of [0, 7, 31, 640]) for (const likes of [0, 1, 3, 17]) for (const archived of [undefined, true]) for (const base of [OPEN, PLUGIN, { likes: 0 }]) score({ ...base, stars, likes, archived });
		for (const s of seen) {
			expect(s.total).toBe(Math.round((s.archived ? ARCHIVED_FACTOR : 1) * s.parts.reduce((n, p) => n + p.points, 0)));
			expect(Number.isInteger(s.total)).toBe(true);
			expect(s.total).toBeGreaterThanOrEqual(0);
			expect(s.total).toBeLessThanOrEqual(100);
			for (const p of s.parts) expect(Math.round(p.points * 10) / 10).toBe(p.points);
		}
	});
});

describe('activityShare', () => {
	it('counts active weeks over the weeks a project is judged on', () => {
		expect(activityShare(0, 0)).toBe(0.5);
		expect(activityShare(2, 2)).toBe(0.75);
		expect(activityShare(3, 3)).toBe(0.875);
		expect(activityShare(6, 6)).toBe(1);
		expect(activityShare(12, 8)).toBe(1);
		expect(activityShare(12, 12)).toBe(1);
		expect(activityShare(12, 4)).toBe(0.5);
		expect(activityShare(12, 0)).toBe(0);
	});

	it('has no sudden drop when a young project turns four weeks old, and never drops for a busy week', () => {
		for (let a = 0; a <= 3; a++) expect(activityShare(3, a) - activityShare(4, a), `${a} active`).toBeLessThanOrEqual(0.125);
		for (let w = 0; w < 12; w++) {
			for (let a = 0; a <= w; a++) {
				expect(activityShare(w + 1, a + 1), `${w} weeks, ${a} active`).toBeGreaterThanOrEqual(activityShare(w, a));
				expect(activityShare(w, a + 1), `${w} weeks, ${a} active`).toBeGreaterThanOrEqual(activityShare(w, a));
			}
		}
	});
});

describe('scoreTarget', () => {
	it('measures an entry\'s repo field', () => {
		expect(scoreTarget({ repo: 'egoist/kero', url: 'https://kero.sh' })).toEqual({ repo: 'egoist/kero' });
		expect(scoreTarget({ repo: 'someone/kit' })).toEqual({ repo: 'someone/kit' });
	});

	it('measures the repository an app without a repo field links to', () => {
		expect(scoreTarget({ url: 'https://github.com/egoist/2048' })).toEqual({ repo: 'egoist/2048' });
		expect(scoreTarget({ url: 'https://github.com/egoist/2048.git' })).toEqual({ repo: 'egoist/2048' });
	});

	it('measures an official plugin in its folder of egoist/mygo', () => {
		const sqlite = { url: 'https://github.com/egoist/mygo/blob/main/docs/plugins/sqlite.md', goImport: 'github.com/egoist/mygo/plugins/sqlite' };
		expect(scoreTarget(sqlite)).toEqual({ repo: 'egoist/mygo', path: 'plugins/sqlite' });
		expect(scoreTarget({ ...sqlite, goImport: 'github.com/Egoist/MyGo/plugins/sqlite' })).toEqual({ repo: 'egoist/mygo', path: 'plugins/sqlite' });
	});

	it('measures the folder a /tree/ link points at', () => {
		expect(scoreTarget({ url: 'https://github.com/someone/tools/tree/main/x' })).toEqual({ repo: 'someone/tools', path: 'x' });
		expect(scoreTarget({ url: 'https://github.com/someone/tools/tree/main/x/y/' })).toEqual({ repo: 'someone/tools', path: 'x/y' });
	});

	it('measures nothing of a closed-source entry', () => {
		expect(scoreTarget({ url: 'https://pulse.egoist.dev' })).toEqual({});
		expect(scoreTarget({})).toEqual({});
	});
});

describe('scoreKey', () => {
	it('keys an entry as its like is keyed', () => {
		expect(scoreKey('app', { slug: 'kero', repo: 'egoist/kero' })).toBe('app:kero');
		expect(scoreKey('plugin', { slug: 'sqlite' })).toBe('plugin:sqlite');
		expect(scoreKey('ui', { slug: 'kit', repo: 'someone/kit' })).toBe('ui:someone/kit');
		expect(scoreKey('state', { slug: 'store', repo: 'someone/store' })).toBe('state:someone/store');
	});
});
