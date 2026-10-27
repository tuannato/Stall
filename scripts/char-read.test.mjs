/**
 * 1c(c): every digit, where a mover is near (before 8g2; report-only until
 * step 7d; `char-read.mjs`, `PROBE-RULES.md`, "Before 8g2, 1c(c): every
 * digit, where a mover is near"). The pure half: a character's count
 * against its own reference, the read's would-be failures, what the page's
 * characters must add up to, the read-again on a fresh pair, and the report.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    CHAR_KEEP_CUT,
    CHAR_MASK_ALPHA,
    CHAR_REF_MIN,
    charKept,
    charKind,
    charReport,
    charsFault,
    charsMoved,
    foldShares,
    inkOf,
    mergeShares,
    readCharsAgain,
    readMoneyChars,
    shareQuantile,
} from './char-read.mjs';

/** A white image of `w` by `h`, four bytes a pixel, with `paint` setting pixels. */
const image = (w, h, paint = () => undefined) => {
    const data = new Uint8Array(w * h * 4).fill(255);
    const set = (x, y, [r, g, b]) => {
        const i = (y * w + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    };
    paint(set);
    return { width: w, height: h, bpp: 4, data };
};
const INK = 'rgb(0, 0, 0)';
/** A shown frame with a 4-by-5 glyph of ink at (10, 10), less the pixels `hide` names. */
const shownWith = (hide = () => false) =>
    image(40, 30, (set) => {
        for (let y = 10; y < 15; y += 1) for (let x = 10; x < 14; x += 1) if (!hide(x, y)) set(x, y, [0, 0, 0]);
    });
const BLANK = image(40, 30);
const ch = (over = {}) => ({ x: 9.5, y: 9.5, w: 5, h: 6, ink: INK, ref: 20, c: '5', ...over });
const target = (chars, over = {}) => ({ i: 3, sel: 'span.item-x[price]', chars, skipped: {}, ...over });
/** One money node of one character, and its shown frame with the glyph covered whole: the read-again's subjects. */
const chars = { targets: [target([ch()])], prepared: 1 };
const covered = shownWith(() => true);

describe('a character is held to its own reference (charKept, readMoneyChars)', () => {
    it('counts the pixels of its box its glyph moved at least halfway toward its ink', () => {
        assert.equal(CHAR_MASK_ALPHA, 0.5);
        assert.deepEqual(charKept(BLANK, shownWith(), ch()), { kept: 20, inside: true });
        // A pixel moved just under halfway is not the glyph's.
        const faint = image(40, 30, (set) => set(10, 10, [128, 128, 128]));
        assert.equal(charKept(BLANK, faint, ch()).kept, 0);
        const half = image(40, 30, (set) => set(10, 10, [127, 127, 127]));
        assert.equal(charKept(BLANK, half, ch()).kept, 1);
        // Exactly halfway counts (a ground of 254 and a pixel of 127 against black).
        const ground = image(40, 30, (set) => {
            for (let y = 0; y < 30; y += 1) for (let x = 0; x < 40; x += 1) set(x, y, [254, 254, 254]);
        });
        const exactly = image(40, 30, (set) => {
            for (let y = 0; y < 30; y += 1) for (let x = 0; x < 40; x += 1) set(x, y, [254, 254, 254]);
            set(10, 10, [127, 127, 127]);
        });
        assert.equal(charKept(ground, exactly, ch()).kept, 1);
    });
    it('cannot count a pixel where the ink is the ground’s own colour', () => {
        const white = ch({ ink: 'rgb(255, 255, 255)' });
        assert.equal(charKept(BLANK, shownWith(), white).kept, 0);
    });
    it('passes a character that keeps its reference and fails one covered past half of it', () => {
        assert.equal(CHAR_KEEP_CUT, 0.5);
        const whole = readMoneyChars(BLANK, shownWith(), { targets: [target([ch()])], prepared: 1 });
        assert.equal(whole.would.length, 0);
        assert.equal(whole.held, 1);
        assert.equal(whole.shares[0].share, 1);
        // Eleven of twenty covered: 9 kept, 0.45 of the reference.
        let n = 0;
        const covered = readMoneyChars(BLANK, shownWith(() => (n += 1) <= 11), { targets: [target([ch()])], prepared: 1 });
        assert.equal(covered.would.length, 1);
        assert.match(covered.would[0].why, /keeps 9 of its 20 reference pixel\(s\), 0\.45/);
        // Ten covered: exactly half, kept.
        let m = 0;
        assert.equal(readMoneyChars(BLANK, shownWith(() => (m += 1) <= 10), { targets: [target([ch()])], prepared: 1 }).would.length, 0);
    });
    it('reads each character on its own: one digit covered fails though its line holds plenty', () => {
        // Two glyphs, the second covered whole: a per-line count of 20 over two characters would pass at 10 a character.
        const two = image(40, 30, (set) => {
            for (let y = 10; y < 15; y += 1) for (let x = 10; x < 14; x += 1) set(x, y, [0, 0, 0]);
        });
        const r = readMoneyChars(BLANK, two, { targets: [target([ch(), ch({ x: 19.5, c: '0' })])], prepared: 2 });
        assert.deepEqual(
            r.would.map((w) => w.c),
            ['0'],
        );
    });
    it('holds no character whose reference is under CHAR_REF_MIN, and counts it', () => {
        assert.equal(CHAR_REF_MIN, 6);
        const r = readMoneyChars(BLANK, BLANK, { targets: [target([ch({ ref: CHAR_REF_MIN - 1, c: '.' })])], prepared: 1 });
        assert.equal(r.small, 1);
        assert.deepEqual(r.smallKinds, { other: 1 });
        assert.equal(r.would.length, 0);
        assert.equal(readMoneyChars(BLANK, BLANK, { targets: [target([ch({ ref: CHAR_REF_MIN, c: '.' })])], prepared: 1 }).would.length, 1);
    });
    it('fails closed on a character with no box and one whose box runs past the capture', () => {
        const r = readMoneyChars(BLANK, shownWith(), {
            targets: [target([ch({ w: 0, h: 0 }), ch({ x: 38, w: 6 }), ch({ y: -1 })])],
            prepared: 3,
        });
        assert.deepEqual(
            r.would.map((w) => w.why),
            ['it has no box', 'its box runs past the capture', 'its box runs past the capture'],
        );
    });
    it('reads an ink the probe hands in any of its forms', () => {
        assert.deepEqual(inkOf('rgb(1, 2, 3)'), [1, 2, 3]);
        assert.deepEqual(inkOf('rgba(1, 2, 3, 0.5)'), [1, 2, 3]);
        assert.deepEqual(inkOf('color(srgb 1 0 0.5)'), [255, 0, 128]);
        assert.throws(() => inkOf('currentcolor'), /unreadable ink/);
    });
    it('sorts a character into a digit, a letter or anything else', () => {
        assert.deepEqual(['5', '٣', 'X', 'ẫ', '$', '.', '×'].map(charKind), ['digit', 'digit', 'letter', 'letter', 'other', 'other', 'other']);
    });
});

describe('what the page’s characters must add up to (charsFault)', () => {
    const moneyTargets = [{ i: 3, sel: 'span.item-x[price]' }];
    it('says nothing where every character prepared is answered, read or left out by reason', () => {
        assert.deepEqual(charsFault({ targets: [target([ch()], { skipped: { clipped: 2 } })], prepared: 3 }, moneyTargets), []);
    });
    it('fails a page whose characters do not add up to those it prepared', () => {
        assert.match(charsFault({ targets: [target([ch()])], prepared: 2 }, moneyTargets)[0], /prepared 2 money character\(s\) and answered 1/);
    });
    it('fails a live money target the page answered no character of', () => {
        assert.match(charsFault({ targets: [], prepared: 0 }, moneyTargets)[0], /span\.item-x\[price\] has no rects/);
        assert.match(charsFault({ targets: [target([])], prepared: 0 }, moneyTargets)[0], /has no rects/);
    });
});

describe('the read-again on a fresh pair (charsMoved, readCharsAgain)', () => {
    it('believes a fresh pair only where every character stood still', () => {
        assert.equal(charsMoved(chars, chars), undefined);
        assert.match(charsMoved(chars, { targets: [target([ch({ x: 9.75 })])], prepared: 1 }), /stands at 9\.75,9\.50/);
        assert.match(charsMoved(chars, { targets: [], prepared: 0 }), /answered 0 money node/);
        assert.match(charsMoved(chars, { targets: [target([ch(), ch()])], prepared: 2 }), /answered 2 character/);
    });
    it('takes no fresh pair where the first read failed nothing', async () => {
        let asked = 0;
        const read = readMoneyChars(BLANK, shownWith(), chars);
        const settled = await readCharsAgain({ read, chars }, async () => {
            asked += 1;
            return { why: [] };
        });
        assert.equal(asked, 0);
        assert.equal(settled.read.would.length, 0);
    });
    it('keeps a would-be failure the fresh pair, believed, fails too', async () => {
        const read = readMoneyChars(BLANK, covered, chars);
        const settled = await readCharsAgain({ read, chars }, async () => ({ why: [], blank: BLANK, shown: covered, chars }));
        assert.equal(settled.read.would.length, 1);
        assert.deepEqual(settled.readAgain, []);
        assert.equal(settled.unbelieved, undefined);
    });
    it('reads a failure again and keeps it where the fresh pair reads it whole', async () => {
        const read = readMoneyChars(BLANK, covered, chars);
        const settled = await readCharsAgain({ read, chars }, async () => ({ why: [], blank: BLANK, shown: shownWith(), chars }));
        assert.equal(settled.read.would.length, 0);
        assert.equal(settled.readAgain.length, 1);
    });
    it('leaves the first read standing where the fresh pair cannot be believed', async () => {
        const read = readMoneyChars(BLANK, covered, chars);
        const moved = await readCharsAgain({ read, chars }, async () => ({ why: [], blank: BLANK, shown: shownWith(), chars: { targets: [target([ch({ y: 12 })])], prepared: 1 } }));
        assert.equal(moved.read.would.length, 1);
        assert.match(moved.unbelieved, /stands at/);
        const refused = await readCharsAgain({ read, chars }, async () => ({ why: ['the shot is 1x1 where the job is 40x30'] }));
        assert.equal(refused.read.would.length, 1);
        assert.match(refused.unbelieved, /the shot is 1x1/);
    });
});

describe('the shares and the report (foldShares, shareQuantile, charReport)', () => {
    const shares = [
        { share: 1, kind: 'digit', ref: 30, c: '5', sel: 'a' },
        { share: 0.92, kind: 'digit', ref: 16, c: '1', sel: 'b' },
        { share: 0.7, kind: 'other', ref: 24, c: '=', sel: 'c' },
    ];
    it('folds the shares by kind, with the least and where it was', () => {
        const fold = foldShares({}, shares, 'pay @mobile / theme 1');
        assert.equal(fold.digit.n, 2);
        assert.equal(fold.digit.least, 0.92);
        assert.match(fold.digit.leastAt, /pay @mobile \/ theme 1: b "1" 0\.920 of 16/);
        assert.equal(fold.digit.refLo, 16);
        const merged = mergeShares(foldShares({}, [{ share: 0.5, kind: 'digit', ref: 9, c: '1', sel: 'd' }], 'x'), fold);
        assert.equal(merged.digit.n, 3);
        assert.equal(merged.digit.least, 0.5);
        assert.equal(merged.other.n, 1);
    });
    it('reads a quantile off the bins as the bin’s upper edge', () => {
        const fold = foldShares({}, shares, 'x');
        assert.equal(shareQuantile(fold.digit, 0.001).toFixed(2), '0.95');
        assert.equal(shareQuantile(fold.digit, 0.99).toFixed(2), '1.05');
    });
    it('says the jobs, the trigger’s cost, the shares, the would-be failures, the reads again and what could not be read', () => {
        const run = {
            byVpClass: { 'mobile t-modern': { jobs: 10, triggered: 2, by1a: 1, chars: 30, held: 28, small: 2, skipped: 0, would: 1, readAgain: 0 }, 'desktop t-neo': { jobs: 5, triggered: 0, by1a: 0, chars: 0, held: 0, small: 0, skipped: 0, would: 0, readAgain: 0 } },
            triggers: ['pay @mobile / theme 1: 1 meet(s), p.note (top -172px (position relative)) meets span.pay-x-n[price] at 10,20'],
            would: ['pay @mobile / theme 1: span.pay-x-n[price] "2" at 29,213: it keeps 0 of its 284 reference pixel(s), 0.00 of them, under 0.5 — on the fresh pair too'],
            readAgain: [],
            faults: [],
            shares: { 'mobile t-modern': foldShares({}, shares, 'pay @mobile / theme 1') },
            smallKinds: { other: 2 },
            movers: 4,
            elements: 100,
            triggerMs: 12,
            readMs: 340,
            frames: 1,
            shared: 1,
        };
        const lines = charReport(run);
        assert.match(lines[0], /desktop t-neo 0 of 5 job\(s\) triggered; mobile t-modern 2 of 10 job\(s\) triggered \(1 by 1a's failures\), 30 character\(s\), 28 held/);
        assert.match(lines[1], /too small to hold \(a reference under 6 pixels\), by kind: other 2/);
        assert.match(lines[2], /4 mover\(s\) over 100 element\(s\)/);
        assert.ok(lines.some((line) => /triggered jobs: 1\n    pay @mobile/.test(line)));
        assert.ok(lines.some((line) => /would-be failures: 1 character\(s\); by node \(characters\): mobile\/pay:span\.pay-x-n\[price\] 1/.test(line)));
        assert.ok(lines.some((line) => /read again on a fresh pair and kept there: none/.test(line)));
        assert.ok(lines.some((line) => /could not be read \(it fails nothing\): none/.test(line)));
        assert.ok(lines.some((line) => /least share read, by kind: digit pay @mobile \/ theme 1: b "1" 0\.920/.test(line)));
    });
});
