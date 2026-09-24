/**
 * The workshop's gate.
 *
 * The premise of the workshop is that somebody who is not the owner submits a
 * decoration and it goes on sale. Nobody will be reviewing it with the eye
 * that caught the last five rounds of defects, so every lesson those rounds
 * taught has to be a rule that runs. This file is that gate: static reads
 * over the shipped catalogue and the one stylesheet every decoration rule
 * lives in, each rule carrying the incident that earned it.
 *
 * It is not the whole review. What only a browser can see — a box over a
 * price, a mood erasing a row, a figure below the contrast floor, a mover
 * that will not still under `prefers-reduced-motion` — is `pnpm test:layout`,
 * and `layout/PROBE-RULES.md` is its ledger. This file holds the half that
 * can be read from source, which is also the half a submission could be
 * checked against before anything is painted at all.
 *
 * **Its teeth must point outward.** The critic's second pass (2026-09-18)
 * wrote eight hostile submissions against the first version and every one
 * passed: a row whose only rule was `animation: none`, an asset reached
 * through a custom property, `image-set()`, `URL(` in capitals, the
 * `background` shorthand's `/ size` component, a travel declared in `from`,
 * and a `@keyframes` block indented inside a media query. Each of those is
 * closed below, and the closing is the point: a rule that only catches the
 * mistakes the owner already made is a rule that protects nobody.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    SHIPPED_ATTACHMENTS,
    attachmentsForTheme,
    type ShippedAttachment,
} from '../domain/attachments';
import { DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID, decodeTheme } from '../domain/theme';
import { leastVeil, over, readsAt, brightestDrop, type Rgb } from '../../layout/rainDrop';
import { SERVED_SHEETS } from '../../scripts/sheet-roles.mjs';

const UI_DIR = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Where each row's COLOURS come from, and therefore whether a mood can move
 * them. `palette`: every colour is a `--s-*` token, so the row repaints
 * itself when the palette changes, a mood included. `art`: the row ships
 * drawn art — an asset, or literals a mood cannot reach.
 *
 * **The gate's table, not the catalogue's** (moved 2026-09-18). It lived on
 * `ShippedAttachment` for one commit, on the argument that a submission
 * would carry it on the wire. It cost 204 bytes of served weight, no runtime
 * code read it, and it pushed the built output past
 * `served-weight-has-a-ceiling` — a guard that had to be run to notice,
 * which the commit that added it did not run. The declaration is still held
 * to the stylesheet here, which is the whole of what it was buying; the day
 * a submission loader exists, it moves back with a reader beside it.
 *
 * It is a CLAIM cross-checked against the sheet, never an assertion a
 * pipeline may trust — the same distinction §5 draws about `authPubkey`.
 */
const FOLLOWS: Readonly<Record<string, 'palette' | 'art'>> = {
    'att-pinstripe': 'palette',
    'att-awning': 'palette',
    'att-hum': 'palette',
    'att-rainfall': 'art',
    'att-horizon': 'palette',
    'att-aurora': 'palette',
    'att-beetle': 'art',
    'att-sunburst': 'palette',
    'att-bunting': 'art',
    'att-confetti': 'art',
};

/**
 * Drawn art inside a look that also ships a mood: the pair cannot agree,
 * because the palette moves and the art does not. A hand-list rather than a
 * refusal, and **the reason is the data**: the next art row cannot reach
 * green by adding a string, it has to write down why the mismatch is
 * acceptable — or delete a sentence somebody else wrote.
 *
 * Keyed on `cls`, not on `label`: the catalogue's own rule is that renaming
 * a row is free, and a list keyed on the name fails with a message about the
 * wrong thing.
 */
const ART_UNDER_A_MOOD: Readonly<Record<string, string>> = {
    'att-beetle':
        "Rural's own inks under Sun-faded, which is a gentle wash rather than a night: the mismatch is small and the owner has not asked for it.",
    'att-bunting':
        'Same look, same wash, same judgement — and its three inks are the craft-fair palette itself, which a tint would muddy.',
    'att-confetti':
        "Paper, not palette, since v5 (2026-09-22): the owner's reference is a torn scrap with a folded corner, and no CSS gradient draws one small and sparse — a conic wedge runs to its tile's edge, so a small scrap needs a small tile and a small tile repeats every few pixels. Tried at three tile sizes and photographed before this was written. The mismatch under Sun-faded is the stall fading while the paper does not, which is what new paper on an old stall looks like; and the legibility that a mood WOULD have moved is already fixed, because every scrap colour clears 3:1 against both palettes' inks (paper 5.07, pale gold 3.70, sage 3.28) — which is also why the reference's saturated rust and green are not in the tiles.",
};

type Rule = { selector: string; body: string };

/** Every innermost rule in the sheet: a body holds no braces, so this reads
 *  rules inside media blocks too. */
const RULES: readonly Rule[] = [...CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1]!.trim().replace(/\s+/g, ' '),
    body: m[2]!,
}));

/** The `att-` classes a selector names, as whole tokens — `.att-beetle` must
 *  not match `.att-beetle-bug`, which is how the beetle's own mover escaped
 *  both sweeps in the first version. */
const classesIn = (selector: string): string[] => [
    ...new Set([...selector.matchAll(/\.(att-[a-z0-9-]+)/g)].map((m) => m[1]!)),
];

/** A row's class, or a class the row owns the prefix of (`att-beetle-bug`
 *  belongs to `att-beetle`): a submission's child classes are its own. */
const ownedBy = (cls: string, found: string): boolean =>
    found === cls || found.startsWith(`${cls}-`);

/** The rules that dress this row ALONE — never a composite, whose colours
 *  belong to two rows at once. */
const ownRules = (cls: string): Rule[] =>
    RULES.filter((r) => {
        const seen = classesIn(r.selector);
        return seen.length > 0 && seen.every((found) => ownedBy(cls, found));
    });

/** Every rule this row's class takes part in, composites included. An asset
 *  declared only in `.att-a.att-b` is still an asset both rows ship. */
const anyRules = (cls: string): Rule[] =>
    RULES.filter((r) => classesIn(r.selector).some((found) => ownedBy(cls, found)));

const paintable: readonly (ShippedAttachment & { cls: string })[] = SHIPPED_ATTACHMENTS.filter(
    (row): row is ShippedAttachment & { cls: string } => row.cls !== undefined,
);

/** Top-level commas only: a gradient carries plenty of its own. */
const parts = (value: string): string[] => {
    const out: string[] = [];
    let depth = 0;
    let cur = '';
    for (const ch of value) {
        if (ch === '(') depth += 1;
        if (ch === ')') depth -= 1;
        if (ch === ',' && depth === 0) {
            out.push(cur.trim());
            cur = '';
            continue;
        }
        cur += ch;
    }
    out.push(cur.trim());
    return out;
};

const decl = (body: string, prop: string): string | undefined =>
    new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(body)?.[1]?.trim();

/** `@keyframes` bodies, matched with a brace counter rather than a `\n}` —
 *  an indented closer (a block nested in a media query) left the name out of
 *  the map entirely, and every rule that used it skipped in silence. */
const keyframes = (): Map<string, string> => {
    const out = new Map<string, string>();
    const head = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = head.exec(CSS)) !== null) {
        let depth = 1;
        let i = head.lastIndex;
        while (i < CSS.length && depth > 0) {
            if (CSS[i] === '{') depth += 1;
            if (CSS[i] === '}') depth -= 1;
            i += 1;
        }
        out.set(m[1]!, CSS.slice(head.lastIndex, i - 1));
    }
    return out;
};

/** The `background-size` a rule states, from the longhand or out of the
 *  `background` shorthand's `/ size` component — `.att-bunting` and
 *  `.att-beetle-bug` both use the shorthand, so a longhand-only reader is
 *  blind on exactly the drawn-art rows. */
const sizesOf = (body: string): string[] | undefined => {
    const long = decl(body, 'background-size');
    if (long !== undefined) {
        return parts(long);
    }
    const short = decl(body, 'background');
    if (short === undefined) {
        return undefined;
    }
    const layers = parts(short);
    if (!layers.some((layer) => layer.includes('/'))) {
        return undefined;
    }
    return layers.map((layer) => {
        const slash = layer.lastIndexOf('/');
        if (slash < 0) {
            return 'auto';
        }
        // `… repeat-x left top / 288px 52px` — the size runs to the end of
        // the layer, minus any trailing keyword.
        return layer
            .slice(slash + 1)
            .trim()
            .split(/\s+/)
            .filter((word) => /^[\d.]+(px|%)$|^auto$|^cover$|^contain$/.test(word))
            .join(' ');
    });
};

/** A paint property: what makes a rule paint rather than merely exist. */
/** Every custom property this sheet declares, at any depth. */
/**
 * Whether a custom property this sheet declares is stated in pixels.
 *
 * Read off the declaration rather than resolved: this gate has no cascade, and
 * what the travel rule needs to know is only that the shared token is a length
 * and not a percentage. A token declared in more than one place has to say px
 * in every one of them, or the rule would pass on whichever it found first.
 */
function statesPx(name: string): boolean {
    const decls = [
        ...CSS.matchAll(new RegExp(`${name}\\s*:\\s*([^;}]+)`, 'g')),
    ].map((m) => m[1] ?? '');
    // `\bpx\b` does not match `320px`: there is no word boundary between a
    // digit and a letter. A number followed by the unit is what a length is.
    return decls.length > 0 && decls.every((value) => /[\d.]px\b/.test(value));
}

const SHEET_DEFINES: ReadonlySet<string> = new Set(
    [...CSS.toLowerCase().matchAll(/(--[a-z0-9_-]+)\s*:/g)].map((m) => m[1]!),
);

const PAINTS = /(?:^|;)\s*(background|background-image|background-color|box-shadow|text-shadow|border|border-[a-z-]+|color|outline|mask|mask-image|-webkit-mask|clip-path|transform|opacity|filter)\s*:/;

/** Reaching an asset, in every spelling CSS admits. `url(` in any case,
 *  `image-set(`, `src(`, and a custom property this row does not define
 *  itself (an asset parked in `:root` is still an asset the row ships). */
const reachesArt = (blob: string): boolean => {
    const lower = blob.toLowerCase();
    if (/\burl\s*\(/.test(lower) || /\bimage-set\s*\(/.test(lower) || /\bsrc\s*\(/.test(lower)) {
        return true;
    }
    const reads = [...lower.matchAll(/var\(\s*(--[a-z0-9_-]+)/g)].map((m) => m[1]!);
    /*
     * A property this SHEET defines somewhere is ours: `--au-tide` is a
     * registered property the aurora animates, and `--att-sun-angle` is the
     * sunburst's own angle. What the rule is looking for is a name defined
     * somewhere this file cannot see, which could resolve to an asset —
     * that is the road a submission would take to smuggle art past a
     * `palette` claim. `--s-*` is the shipped table's namespace.
     */
    return reads.some(
        (name) => !name.startsWith('--s-') && !SHEET_DEFINES.has(name),
    );
};

describe('the-gate-a-submitted-decoration-must-pass', () => {
    it('every paintable row paints something of its own', () => {
        /*
         * A row is a class and a class is nothing without a rule. Shipping
         * the row and forgetting the paint gives a decoration that a seller
         * can buy, wear, publish a permanent record for — and see nothing
         * from.
         *
         * A rule is not enough: the critic's first hostile row declared
         * `animation: none` inside a reduced-motion block and passed a check
         * whose message said "paints nothing". So at least one rule must
         * declare a property that actually puts pixels down.
         */
        for (const row of paintable) {
            const rules = ownRules(row.cls);
            expect(rules.length, `${row.label} (${row.cls}) has no rule of its own`).toBeGreaterThan(
                0,
            );
            expect(
                rules.some((r) => PAINTS.test(r.body)),
                `${row.label} has rules but none of them paints`,
            ).toBe(true);
        }
    });

    it('says where its colours come from, and the sheet agrees', () => {
        /*
         * Round 15's lesson, and the most expensive one the workshop will
         * inherit: a MOOD paints no class — it swaps the palette and nothing
         * else — so nothing in CSS can ask whether one is worn. A row whose
         * colours are tokens follows a mood for free. A row that ships drawn
         * art cannot follow one at all, and under Modern's After hours the
         * awning's baked daylight blue read as a cut-out pasted on a
         * near-black page.
         *
         * The asset test reads every rule the row takes part in, composites
         * included: `.stall.att-rainfall.att-aurora` carries three `url()`
         * layers and belongs to both those rows. The token test reads the
         * row's OWN rules, because a composite's tokens may be the other
         * row's.
         */
        for (const row of paintable) {
            const follows = FOLLOWS[row.cls];
            expect(follows, `${row.label} (${row.cls}) is not in the gate's table`).toBeDefined();
            const own = ownRules(row.cls).map((r) => r.body).join(' ');
            const ships = reachesArt(own);
            if (ships) {
                expect(follows, `${row.label} reaches an asset, so it cannot follow a mood`).toBe(
                    'art',
                );
            }
            if (follows === 'palette') {
                expect(
                    own.includes('var(--s-'),
                    `${row.label} says it follows the palette and names no token`,
                ).toBe(true);
                expect(ships, `${row.label} says it follows the palette and reaches art`).toBe(
                    false,
                );
            }
        }
        /*
         * And a composite's assets are accounted for. `.att-a.att-b` is one
         * rule belonging to two rows, so an asset in it is neither row's
         * ALONE — the first tightening of this gate blamed the aurora for
         * the rain's tiles, which is how the composite road was found. What
         * must hold is that at least one participant declares `art`: an
         * asset in a joint rule with two `palette` rows is an asset nothing
         * in the catalogue admits to.
         */
        for (const rule of RULES) {
            const seen = classesIn(rule.selector);
            if (seen.length < 2 || !reachesArt(rule.body)) {
                continue;
            }
            expect(
                seen.some((cls) => FOLLOWS[cls] === 'art'),
                `${rule.selector} reaches art and none of ${seen.join(' + ')} says it ships any`,
            ).toBe(true);
        }
        // The table does not outlive the catalogue either.
        for (const cls of Object.keys(FOLLOWS)) {
            expect(
                paintable.some((row) => row.cls === cls),
                `${cls} is in the gate's table and not in the catalogue`,
            ).toBe(true);
        }
    });

    it('art in a look that has a mood is a hand-list, and the reason is the data', () => {
        /*
         * The product rule the declaration above exists to serve. Modern had
         * exactly that pair until the awning was redrawn in tokens.
         *
         * A hand-list rather than a refusal, because Rural ships two of them
         * TODAY and they are not a defect the owner has asked for. The
         * reason lives in the data so that the next art row cannot reach
         * green by adding a string: it has to write down why, or delete
         * somebody else's sentence. The critic named the shortest path to a
         * ratchet — the day Neo ships a mood, adding the rain here would be
         * a one-word fix — which is why the rain's own rule already says
         * what it should do instead (a second pair of tiles, not a var).
         */
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const rows = attachmentsForTheme(id);
            if (!rows.some((row) => row.slot === 'mood')) {
                continue;
            }
            for (const row of rows) {
                if (row.cls === undefined || FOLLOWS[row.cls] !== 'art') {
                    continue;
                }
                const why = ART_UNDER_A_MOOD[row.cls];
                expect(
                    why,
                    `${row.label} is drawn art in a look with a mood — write down why that is acceptable, or draw it in tokens`,
                ).toBeDefined();
                expect(
                    (why ?? '').length,
                    `${row.label}'s exemption needs a reason, not a placeholder`,
                ).toBeGreaterThan(40);
            }
        }
        // And an exemption does not outlive the row it was written for.
        for (const cls of Object.keys(ART_UNDER_A_MOOD)) {
            expect(
                FOLLOWS[cls],
                `${cls} carries an art exemption and no longer ships art`,
            ).toBe('art');
        }
    });

    it('a background that travels moves a whole tile, or names its own proof', () => {
        /*
         * Two incidents, one shape. The pinstripe jumped at every wrap
         * because its tile was never stated, and the rain jumped because its
         * drift carried a sideways component that was not a whole tile
         * width. A background whose travel is not a whole number of its own
         * tile cannot wrap: the pattern is somewhere else when the cycle
         * restarts, and the eye reads the snap.
         *
         * Per axis, because that is where both bugs lived. Both ends of the
         * keyframe are read — a travel declared in `from` over a `to` of
         * zero is the same animation backwards, and the first version saw
         * only `to`. A travel this reader cannot turn into pixels is a
         * failure, not a skip: a percentage travel is measured against the
         * positioning area, which this file cannot know.
         *
         * The one row whose travel is deliberately half a tile is the
         * pinstripe, whose stripes run at 135deg — the arithmetic there is
         * √2 and its own guard, `the-running-border-closes-its-own-loop`,
         * does it. Named here so the exception is a decision.
         */
        const PROVES_ITS_OWN = new Set(['att-pinstripe-run']);
        const frames = keyframes();
        let checked = 0;
        const movers = new Set<string>();

        for (const row of paintable) {
            for (const rule of anyRules(row.cls)) {
                const anim = decl(rule.body, 'animation') ?? decl(rule.body, 'animation-name');
                const sizes = sizesOf(rule.body);
                const declaredPos = decl(rule.body, 'background-position');
                const rulePos = declaredPos === undefined ? undefined : parts(declaredPos);
                if (anim === undefined) {
                    continue;
                }
                // Whole-token names: a keyframe called `fall` must not match
                // `att-confetti-fall`.
                const named = [...frames.keys()].filter((name) =>
                    new RegExp(`(?:^|[\\s,])${name}(?:[\\s,]|$)`).test(anim),
                );
                for (const name of named) {
                    if (PROVES_ITS_OWN.has(name)) {
                        continue;
                    }
                    const body = frames.get(name)!;
                    const at = (end: string): string[] | undefined => {
                        const found = new RegExp(
                            `${end}\\s*\\{[\\s\\S]*?background-position:\\s*([^;]+)`,
                        ).exec(body)?.[1];
                        return found === undefined ? undefined : parts(found);
                    };
                    // `from` may be implicit: an absent end is the rule's own
                    // declared position, which is stationary by definition.
                    const to = at('to');
                    const from = at('from');
                    if (to === undefined && from === undefined) {
                        continue;
                    }
                    movers.add(name);
                    const ends = (to ?? from)!;
                    expect(
                        sizes,
                        `${name} moves ${rule.selector}'s background and that rule states no tile`,
                    ).toBeDefined();
                    ends.forEach((_, i) => {
                        const tile = (sizes?.[i] ?? 'auto').split(/\s+/);
                        const a = (from?.[i] ?? rulePos?.[i] ?? '0 0').split(/\s+/);
                        const b = (to?.[i] ?? rulePos?.[i] ?? '0 0').split(/\s+/);
                        for (let axis = 0; axis < 2; axis += 1) {
                            const one = a[axis] ?? '0';
                            const two = b[axis] ?? '0';
                            // A layer that reads the same at both ends does
                            // not travel: the aurora's wash is restated in
                            // the rain's keyframes precisely so it stands
                            // still, and reading one end alone called its
                            // `6%` a travel.
                            if (one === two) {
                                continue;
                            }
                            /*
                             * A travel written as the SAME token the tile is
                             * written in proves itself, and proves itself more
                             * strongly than two numbers that happen to agree
                             * today: one declaration, so they cannot drift.
                             * This is what lets a decoration be written once
                             * and scale — `--att-rain-near` is the tile in
                             * `background-size` and the travel in the
                             * keyframe, and `--s-decor-scale` moves both.
                             *
                             * Only when the OTHER end is a true rest (`0`):
                             * `var(--a)` → `var(--b)` is two tokens and this
                             * gate still cannot tell whether they agree.
                             */
                            const token = /^var\(\s*(--[a-z0-9-]+)/i;
                            const moved = token.exec(two)?.[1];
                            if (
                                moved !== undefined &&
                                one === '0' &&
                                token.exec(tile[axis] ?? '')?.[1] === moved &&
                                // And the token must be a LENGTH. A percentage
                                // tile travelling that percentage is not a lap
                                // — `background-position` resolves a percentage
                                // against the positioning area, not the tile —
                                // so a shared `--x: 50%` would otherwise read
                                // as proof of something it does not prove.
                                statesPx(moved)
                            ) {
                                checked += 1;
                                continue;
                            }
                            const px = (v: string): number | undefined => {
                                if (v === '0') {
                                    return 0;
                                }
                                const n = /^(-?[\d.]+)px$/.exec(v)?.[1];
                                return n === undefined ? undefined : Number(n);
                            };
                            const start = px(one);
                            const stop = px(two);
                            checked += 1;
                            expect(
                                start !== undefined && stop !== undefined,
                                `${name} layer ${i + 1} travels from "${one}" to "${two}", which this gate cannot turn into pixels — state a travel in px`,
                            ).toBe(true);
                            if (start === undefined || stop === undefined) {
                                continue;
                            }
                            const s2 = /^([\d.]+)px$/.exec(tile[axis] ?? '')?.[1];
                            expect(
                                s2,
                                `${name} layer ${i + 1} travels ${Math.abs(stop - start)}px with no tile stated on that axis`,
                            ).toBeDefined();
                            const laps = Math.abs(stop - start) / Number(s2);
                            expect(
                                Math.abs(laps - Math.round(laps)) < 0.001 && Math.round(laps) >= 1,
                                `${name} layer ${i + 1} travels ${Math.abs(stop - start)}px of a ${tile[axis]} tile — ${laps.toFixed(3)} laps, so it cannot wrap`,
                            ).toBe(true);
                        }
                    });
                }
            }
        }
        // Not one global count: every row that declares itself a mover and
        // moves a background must have contributed, or the sweep passed by
        // finding nothing on exactly the rows the rule is about.
        expect(checked, 'the sweep found travelling layers to check').toBeGreaterThan(0);
        expect(
            movers.size,
            'the sweep reached more than one keyframe, so it is not one rule held up by one row',
        ).toBeGreaterThan(1);
    });

    it('a node row cannot be pressed, and PLAN says so', () => {
        /*
         * PLAN's Attachments section calls this "mechanical with a test" and
         * names `an-attachment-is-never-interactive`; the critic found that
         * the name exists only in PLAN. A decoration that takes a press is a
         * control a stranger put on a seller's shopfront, and a decoration
         * that takes a HOVER or a hit test is one the probe's geometry pass
         * goes blind on — it measures boxes precisely because a real
         * decoration carries `pointer-events: none`.
         *
         * The CSS half is what can be read here: every row that paints as a
         * NODE — a box of its own in the flow — must declare it. A `root`
         * row paints its parent's background and has no box to press.
         */
        for (const row of paintable) {
            if (row.paint !== 'node') {
                continue;
            }
            const own = ownRules(row.cls)
                .map((r) => r.body)
                .join(' ');
            expect(
                /pointer-events:\s*none/.test(own),
                `${row.label} paints a node and never says it cannot be pressed`,
            ).toBe(true);
        }
    });
});

/*
 * ---------------------------------------------------------------------------
 * Neo's rain and the veils that read on it (the owner, 2026-09-24 evening:
 * "nếu chữ vẫn đọc được thì không nền đen/trắng, nếu đọc không được thì nền
 * đen/trắng mờ ôm sát chữ và có độ trong suốt đủ đạt ngưỡng").
 * ---------------------------------------------------------------------------
 */
const NEO_CSS = readFileSync(join(UI_DIR, 'theme-neo.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const RAIN_SHEETS = ['rain-near.svg', 'rain-mid.svg', 'rain-far.svg'].map((f) => readFileSync(join(UI_DIR, 'decor', f), 'utf8'));
const rgbOf = (c: { r: number; g: number; b: number }): Rgb => [c.r, c.g, c.b];
const hexRgb = (h: string): Rgb => [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb;

/** The body of the one rule whose selector list is exactly `selector`. */
function ruleBodyOf(css: string, selector: string): string {
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectors = m[1]!.split(',').map((s) => s.replace(/\s+/g, ' ').trim());
        if (selectors.includes(selector)) {
            return m[2]!;
        }
    }
    throw new Error(`no rule for ${selector}`);
}

/** A literal ink Neo's own sheet paints a line in. */
function neoInk(selector: string): Rgb {
    const m = /(?:^|;)\s*color:\s*#([0-9a-f]{6})\s*(?:;|$)/i.exec(ruleBodyOf(NEO_CSS, selector));
    if (m === null) {
        throw new Error(`${selector} states no literal ink`);
    }
    return hexRgb(m[1]!);
}

/**
 * The lightest ground a line on the worn stall can stand on. Every layer at
 * its worst AT ONCE — the drop flattened as the probe paints it
 * (`brightestDrop`, the same derivation), the aurora at the tide the probe
 * pins (1) with its glows at their centres and its tint at either corner and
 * between, the backdrop's top band with a scanline on it — which no single
 * pixel reaches, so a step that reads over every one of these reads wherever
 * a line lands. With `underTint`, each again under the Studio boxes' own 4%
 * tint, for a rule that veils a line inside one: the lightest wash the look
 * paints under a veiled line.
 */
function rainGrounds(underTint = false): Rgb[] {
    const neo = decodeTheme(NEO_CITY_THEME_ID);
    const bg = rgbOf(neo.bg);
    const accent = rgbOf(neo.accent);
    const accent2 = rgbOf(neo.accentTwo);
    const drop = brightestDrop(RAIN_SHEETS, bg);
    if (drop === undefined) {
        throw new Error('the rain art is not readable whole');
    }
    const backdrop = neo.backdrop ?? '';
    const scan = /var\(--s-accent\) (\d+)%, transparent\)/.exec(backdrop);
    const band = /var\(--s-accent\) (\d+)%, var\(--s-bg\)\)/.exec(backdrop);
    if (scan === null || band === null) {
        throw new Error("Neo's backdrop is no longer a band and a scanline: re-derive its brightest");
    }
    const bases = [bg, over(accent, Number(scan[1]) / 100, over(accent, Number(band[1]) / 100, bg))];
    const hue = (name: string): Rgb => (name === 'accent' ? accent : accent2);
    // The composite rule's four tide-driven layers, in the order it states
    // them: the tint's two ends in front, then the two glows behind the rain.
    const composite = ruleBodyOf(CSS, '.stall.att-rainfall.att-aurora');
    const terms = [
        ...composite.matchAll(/var\(--s-(accent(?:-2)?)\) calc\((\d+)% ([+-]) (\d+)% \* var\(--au-tide/g),
    ].map((m) => ({ hue: hue(m[1]!), at1: (Number(m[2]) + (m[3] === '+' ? 1 : -1) * Number(m[4])) / 100 }));
    if (terms.length !== 4) {
        throw new Error(`the aurora composite has ${terms.length} tide-driven layers, not four`);
    }
    const [tintA, tintB, glowA, glowB] = terms as [(typeof terms)[0], (typeof terms)[0], (typeof terms)[0], (typeof terms)[0]];
    const grounds: Rgb[] = [];
    for (const base of bases) {
        grounds.push(over(drop.rgb, drop.alpha, base));
        const lit = over(drop.rgb, drop.alpha, over(glowA.hue, glowA.at1, over(glowB.hue, glowB.at1, base)));
        grounds.push(lit, over(tintA.hue, tintA.at1, lit), over(tintB.hue, tintB.at1, lit));
    }
    const box = /background:\s*rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(ruleBodyOf(NEO_CSS, '.t-neo .studio-browser'));
    if (box === null) {
        throw new Error("the Studio box's tint is no longer a colour");
    }
    const tint: Rgb = [Number(box[1]), Number(box[2]), Number(box[3])];
    return underTint ? [...grounds, ...grounds.map((g) => over(tint, Number(box[4]), g))] : grounds;
}

/**
 * Which inks each step serves: the test's statement, checked against the
 * sheet by the probe (a line veiled at a step its ink does not clear reads
 * under 3:1 at its own pixels).
 */
function veilInks(): Record<string, Rgb[]> {
    const neo = decodeTheme(NEO_CITY_THEME_ID);
    return {
        text: [rgbOf(neo.text)],
        notice: [neoInk('.t-neo .notice-text')],
        accent: [rgbOf(neo.accent), neoInk('.t-neo .collection-name')],
        muted: [rgbOf(neo.muted)],
        pill: [rgbOf(neo.muted)],
        invite: [neoInk('.t-neo .notice-invite'), neoInk('.t-neo .ghost-chip')],
        dim: [neoInk('.t-neo .sparse-empty-s')],
    };
}

/**
 * A step over the owner's 60% cap stands only with its reason written here —
 * the builder stops on it and the owner decides (the round 6 brief).
 */
const ABOVE_THE_CAP: Readonly<Record<string, string>> = {
    dim: "The vacant box's second line is Neo's dimmest ink (#5e7799, 4.41:1 on the bare night) and reads only at 80%. Stopped and put to the owner on 2026-09-24: accept it, lift the line's ink, or give the box back a ground.",
};

describe('a-rain-veil-is-the-least-that-reads', () => {
    const rainRule = [...CSS.matchAll(/\.stall\.att-rainfall\s*\{([^{}]*)\}/g)].map((m) => m[1]!).join(';');
    const steps = new Map(
        [...rainRule.matchAll(/--rain-veil-([a-z]+):\s*(\d+)%/g)].map((m) => [m[1]!, Number(m[2])] as const),
    );
    const neo = decodeTheme(NEO_CITY_THEME_ID);
    const bg = rgbOf(neo.bg);
    const tokens: Record<string, Rgb> = {
        bg,
        muted: rgbOf(neo.muted),
        accent: rgbOf(neo.accent),
        'accent-2': rgbOf(neo.accentTwo),
    };
    /*
     * Every veil the sheet lays, rule by rule: the step it names, and the
     * tint the rule keeps on top of it when the look paints one there.
     */
    const uses = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => m[1]!.includes('.att-rainfall'))
        .flatMap((m) => {
            const body = m[2]!;
            const veil = /background-color:\s*color-mix\(\s*in srgb,\s*var\(--s-bg\)\s+var\(--rain-veil-([a-z]+)\),\s*transparent\s*\)/.exec(body);
            if (veil === null) {
                return [];
            }
            const tint = /background-image:\s*linear-gradient\(\s*color-mix\(\s*in srgb,\s*var\(--s-([a-z0-9-]+)\)\s+(\d+)%,\s*transparent\s*\)/.exec(body);
            return [
                {
                    name: veil[1]!,
                    tint: tint === null ? undefined : { rgb: tokens[tint[1]!]!, alpha: Number(tint[2]) / 100 },
                    source: m[1]!.replace(/\s+/g, ' ').trim(),
                    grounds: rainGrounds(m[1]!.includes('.studio-browser')),
                },
            ];
        });
    const grounds = rainGrounds();
    const inks = veilInks();

    it('states a step for every veil the sheet lays, and lays every step it states', () => {
        expect(steps.size).toBeGreaterThan(0);
        expect(new Set(uses.map((u) => u.name))).toEqual(new Set(steps.keys()));
        expect(new Set(Object.keys(inks))).toEqual(new Set(steps.keys()));
    });

    it('each step reads over the lightest ground the worn stall can paint, and a step lighter does not', () => {
        for (const [name, pct] of steps) {
            const mine = uses.filter((u) => u.name === name);
            for (const use of mine) {
                expect(readsAt(inks[name]!, bg, use.grounds, pct, use.tint), `${name} at ${pct}% on ${use.source}`).toBe(true);
            }
            if (pct > 0) {
                expect(
                    mine.every((use) => readsAt(inks[name]!, bg, use.grounds, pct - 5, use.tint)),
                    `${name} would read at ${pct - 5}%: the veil is heavier than the floor asks`,
                ).toBe(false);
            }
            // The least, exactly: no usage needs more than stated.
            const least = Math.max(...mine.map((use) => leastVeil(inks[name]!, bg, use.grounds, use.tint) ?? 101));
            expect(least, `${name}: least ${least}`).toBe(pct);
        }
    });

    it('no step is over the owner’s 60% cap without its reason', () => {
        for (const [name, pct] of steps) {
            if (pct > 60) {
                expect(ABOVE_THE_CAP[name], `--rain-veil-${name} is ${pct}%`).toBeDefined();
            }
        }
        for (const name of Object.keys(ABOVE_THE_CAP)) {
            expect(steps.get(name) ?? 0, `${name} is listed over the cap and is not`).toBeGreaterThan(60);
        }
    });

    it('a veil is a ground the text needs: every ink on the bare rain reads under the floor', () => {
        // The other half of "no ground where the text reads": the probe
        // fails a veiled line that reads without its veil at its own pixels;
        // this holds the reason every step is above zero at all.
        for (const [name, list] of Object.entries(inks)) {
            expect(readsAt(list, bg, grounds, 0), name).toBe(false);
        }
    });
});

describe('a-decoration-lays-no-opaque-ground-under-text', () => {
    /**
     * The other half of the owner's rule (2026-09-24 evening), read from
     * source: a rule scoped to a decoration never lays the look's own ground
     * or its card surface under anything — round 5's answer to Neo's rain
     * was a solid `var(--s-bg)` band under every line on the bare ground, and
     * the owner's word for it was "quá đà". Under a decoration, a ground is a
     * veil — `color-mix(in srgb, var(--s-bg) var(--rain-veil-…), transparent)`,
     * at a step `a-rain-veil-is-the-least-that-reads` holds to the least that
     * reads — or nothing. Every served sheet, the kit's included: a creator's
     * decoration is held to it too. What a veil may not be (laid where the
     * line reads without it) is the probe's to see, at the line's own pixels.
     */
    const VEIL = /color-mix\(\s*in srgb,\s*var\(--s-bg\)\s+var\(--rain-veil-[a-z]+\),\s*transparent\s*\)/g;
    const GROUND = /var\(--s-(?:bg|surface)\)/;
    const REPO_ROOT = join(UI_DIR, '..', '..');

    /** Every declaration in a decoration-scoped rule that lays a ground from a look token other than as a veil. */
    function offences(css: string): string[] {
        const out: string[] = [];
        for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            const selector = m[1]!.replace(/\s+/g, ' ').trim();
            if (!/\.att-[a-z0-9-]/.test(selector)) {
                continue;
            }
            for (const declaration of m[2]!.split(';')) {
                const at = declaration.indexOf(':');
                if (at < 0) continue;
                const prop = declaration.slice(0, at).trim();
                const value = declaration.slice(at + 1);
                if (!/^(?:background|background-color|box-shadow|--[a-z0-9-]+)$/.test(prop)) {
                    continue;
                }
                if (GROUND.test(value.replace(VEIL, ''))) {
                    out.push(`${selector} { ${prop}: ${value.replace(/\s+/g, ' ').trim()} }`);
                }
            }
        }
        return out;
    }

    it('lays a veil or nothing, in every served sheet', () => {
        for (const sheet of SERVED_SHEETS) {
            expect(offences(readFileSync(join(REPO_ROOT, sheet.path), 'utf8')), sheet.path).toEqual([]);
        }
    });

    it('refuses round 5’s grounds and anything that is not the veil’s own shape', () => {
        for (const planted of [
            '.stall.att-rainfall .activity-sec { background-color: var(--s-bg); }',
            '.stall.att-rainfall .first-stall { background-color: var(--s-surface); }',
            '.stall.att-rainfall .mid-t { box-shadow: 0 0 0 6px var(--s-bg); }',
            '.stall.att-rainfall .notice { background: color-mix(in srgb, var(--s-accent) 4%, var(--s-bg)); }',
            '.stall.att-rainfall .mid-p { background-color: color-mix(in srgb, var(--s-bg) 90%, transparent); }',
            '@media (min-width: 680px) { .stall.att-aurora .orn { --ground: var(--s-bg); } }',
        ]) {
            expect(offences(planted), planted).toHaveLength(1);
        }
        expect(
            offences(
                '.stall.att-rainfall .mid-t { background-color: color-mix(in srgb, var(--s-bg) var(--rain-veil-text), transparent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--s-bg) var(--rain-veil-text), transparent); }',
            ),
        ).toEqual([]);
    });
});
