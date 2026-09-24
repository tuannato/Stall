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
import {
    DEFAULT_THEME_ID,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    SHIPPED_THEMES,
    decodeTheme,
    themeVars,
} from '../domain/theme';
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
 * A decoration lays no ground under text (the owner, 2026-09-24 late, over
 * round 5's solid grounds and round 6's translucent veils: "làm nền rất xấu,
 * còn ảnh hưởng đến theme và các decor bên dưới nó … giữ như ban đầu").
 * ---------------------------------------------------------------------------
 */

/**
 * The declarations a decoration's own art is made of, each with the reason it
 * is not a ground under text. Keyed `selector | property`, one selector of a
 * list at a time. Everything else a rule scoped to a decoration class declares
 * among the properties below is refused when its value, custom properties
 * resolved, paints anything at all.
 */
const DECORATION_ART: Readonly<Record<string, string>> = {
    '.stall.att-awning | background-image':
        'the canopy on the root: the stall’s own background, behind every card, and the hem’s discs are the root’s ground cutting its own stripes',
    '.stall.att-rainfall | background-image': 'the drop sheets on the root: the stall’s own background, behind every card',
    '.stall.att-aurora | background-image': 'the aurora’s glows and tint on the root: the stall’s own background',
    '.stall.att-rainfall.att-aurora | background-image': 'the rain and the aurora as one root stack: the stall’s own background',
    '.stall.att-sunburst | background-image': 'the rays on the root: the stall’s own background',
    '.stall.att-confetti | background-image': 'the scrap sheets on the root: the stall’s own background',
    '.stall.att-sunburst.att-confetti | background-image': 'the scraps and the rays as one root stack: the stall’s own background',
    '.stall.att-pinstripe .item | border': 'Pinstripe’s card border: 2px of transparent width the stripes are painted into',
    '.stall.att-pinstripe .item | background-image':
        'Pinstripe’s card border: the card’s own surface restated in its padding box, the stripes only in its 2px border',
    '.stall.att-horizon .stall-sign | background-image':
        'the Horizon is a floor drawn on the sign’s own panel (`yard` on Neo), and its haze and scrim sink its own floor lines under the name, as shipped',
    '.att-bunting | background': 'a decoration node’s own box: aria-hidden, no text in it',
    '.att-beetle | background-image': 'a decoration node’s own box: the beetle’s rail, aria-hidden, no text in it',
    '.att-beetle-bug | background': 'a decoration node’s own box: the beetle sprite, aria-hidden, no text in it',
};

/** Whether a rule reaches past a decoration class: its selector names one. */
const DECORATION_SCOPED = /\.att-[a-z0-9-]/;

/** The properties that lay a ground, a slab or a ring under a box. */
const GROUND_PROPS =
    /^(?:-webkit-)?(?:background|background-color|background-image|border|border-(?!radius$|[a-z-]*-radius$|spacing$|collapse$)[a-z-]+|outline|outline-(?!offset$)[a-z-]+|box-shadow|column-rule|column-rule-[a-z-]+)$/;

/** A border or outline style that draws, in `currentColor` when no colour is named. */
const DRAWN_STYLE = /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset|auto)\b/;

/** Words a value may hold without painting anything. */
const NO_PAINT = new Set([
    'none', 'transparent', 'initial', 'unset', 'revert', 'revert-layer', 'hidden',
    'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset',
    'no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'space', 'round', 'left', 'right', 'top',
    'bottom', 'center', 'border-box', 'padding-box', 'content-box', 'fixed', 'scroll', 'local',
    'auto', 'cover', 'contain', 'thin', 'medium', 'thick', '*', '+', '-',
]);

/** Every `@keyframes` body in `css`, by name, brace-counted. */
function keyframesIn(css: string): Map<string, string> {
    const out = new Map<string, string>();
    const head = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = head.exec(css)) !== null) {
        let depth = 1;
        let i = head.lastIndex;
        while (i < css.length && depth > 0) {
            if (css[i] === '{') depth += 1;
            if (css[i] === '}') depth -= 1;
            i += 1;
        }
        out.set(m[1]!, css.slice(head.lastIndex, i - 1));
    }
    return out;
}

type Declaration = { prop: string; value: string };

const declarationsOf = (body: string): Declaration[] =>
    body
        .split(';')
        .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()] as const)
        .filter(([prop]) => prop !== '' && !prop.includes('{'))
        .map(([prop, value]) => ({ prop, value }));

/** Every custom property's definitions: the served sheets', `extra`'s and every shipped look's `--s-*`. */
function customProperties(extra: string): Map<string, string[]> {
    const defs = new Map<string, string[]>();
    const add = (name: string, value: string): void => {
        defs.set(name, [...(defs.get(name) ?? []), value]);
    };
    const sheets = SERVED_SHEETS.map((sheet) => readFileSync(join(UI_DIR, '..', '..', sheet.path), 'utf8'));
    for (const css of [...sheets, extra]) {
        for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[;{])\s*(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+)/g)) {
            add(m[1]!, m[2]!.trim());
        }
    }
    for (const { id } of SHIPPED_THEMES) {
        for (const [name, value] of Object.entries(themeVars(decodeTheme(id)))) add(name, value);
    }
    return defs;
}

/** `var(--name[, fallback])` calls at the top of `value`'s nesting or anywhere inside it. */
function varCalls(value: string): { name: string; fallback: string | undefined; whole: string }[] {
    const out: { name: string; fallback: string | undefined; whole: string }[] = [];
    let at = value.indexOf('var(');
    while (at >= 0) {
        let depth = 0;
        let end = at + 3;
        for (; end < value.length; end += 1) {
            if (value[end] === '(') depth += 1;
            if (value[end] === ')' && --depth === 0) break;
        }
        const inner = value.slice(at + 4, end);
        const comma = inner.indexOf(',');
        out.push({
            name: (comma < 0 ? inner : inner.slice(0, comma)).trim(),
            fallback: comma < 0 ? undefined : inner.slice(comma + 1).trim(),
            whole: value.slice(at, end + 1),
        });
        at = value.indexOf('var(', end);
    }
    return out;
}

/**
 * Whether `value` paints anything, custom properties resolved to every
 * value any sheet or look gives them (a var painting in one place paints).
 * Conservative on purpose: a function that is not arithmetic paints, and
 * so does any word this reader does not know to be paintless.
 */
function paints(value: string, prop: string, defs: Map<string, string[]>, seen: ReadonlySet<string> = new Set()): boolean {
    let bare = value;
    for (const call of varCalls(value)) {
        bare = bare.replace(call.whole, ' 0 ');
        if (seen.has(call.name)) continue;
        const next = new Set([...seen, call.name]);
        const options = [...(defs.get(call.name) ?? []), ...(call.fallback === undefined ? [] : [call.fallback])];
        if (options.some((option) => paints(option, prop, defs, next))) return true;
    }
    const v = bare
        .toLowerCase()
        .replace(/!important/g, ' ')
        .replace(/\b(?:calc|min|max|clamp)\(/g, '(');
    if (/[a-z-]+\(/.test(v)) return true;
    const words = v.split(/[\s,/()]+/).filter((w) => w !== '');
    if (words.some((w) => !NO_PAINT.has(w) && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z%]+)?$/.test(w))) return true;
    // A drawn border or outline with no colour named is drawn in the text's own colour.
    if (/^(?:-webkit-)?(?:border|outline|column-rule)/.test(prop) && DRAWN_STYLE.test(v) && !/\btransparent\b/.test(v)) {
        return /(?:^|-)(?:style)$/.test(prop) || /^(?:border|outline|column-rule)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?$/.test(prop);
    }
    return false;
}

/**
 * Where each custom property ends up: the ordinary properties that read it,
 * directly or through other custom properties, across every served sheet and
 * `extra`. A property nobody reads answers an empty set.
 */
function customUses(extra: string): (name: string) => Set<string> {
    const readers = new Map<string, Set<string>>();
    const sheets = SERVED_SHEETS.map((sheet) => readFileSync(join(UI_DIR, '..', '..', sheet.path), 'utf8'));
    for (const css of [...sheets, extra]) {
        for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            for (const d of declarationsOf(m[2]!)) {
                for (const call of varCalls(d.value)) {
                    readers.set(call.name, new Set([...(readers.get(call.name) ?? []), d.prop]));
                }
            }
        }
    }
    const uses = (name: string, seen: ReadonlySet<string>): Set<string> => {
        const out = new Set<string>();
        for (const prop of readers.get(name) ?? []) {
            if (!prop.startsWith('--')) {
                out.add(prop);
            } else if (!seen.has(prop)) {
                for (const p of uses(prop, new Set([...seen, prop]))) out.add(p);
            }
        }
        return out;
    };
    return (name) => uses(name, new Set([name]));
}

/**
 * Every declaration in `css` that lays a ground under a box from a rule
 * scoped to a decoration class — directly, through a keyframe the rule runs,
 * or as a custom property the rule sets for another rule to read — and that
 * is not the decoration's own art (`DECORATION_ART`).
 */
function groundsUnderText(
    css: string,
    defs: Map<string, string[]> = customProperties(css),
    usesOf: (name: string) => Set<string> = customUses(css),
): string[] {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const frames = keyframesIn(clean);
    const out: string[] = [];
    for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectors = m[1]!.split(',').map((s) => s.replace(/\s+/g, ' ').trim());
        const own = declarationsOf(m[2]!);
        const run = own
            .filter((d) => d.prop === 'animation' || d.prop === 'animation-name')
            .flatMap((d) => d.value.split(','))
            .flatMap((one) => one.trim().split(/\s+/))
            .filter((word) => frames.has(word))
            .flatMap((name) => declarationsOf(frames.get(name)!.replace(/[^{}]*\{|\}/g, ';')));
        for (const selector of selectors.filter((s) => DECORATION_SCOPED.test(s))) {
            for (const d of [...own, ...run]) {
                const custom = d.prop.startsWith('--');
                if (!custom && !GROUND_PROPS.test(d.prop)) continue;
                // A custom property is judged where it is read (round 8): one
                // that only ever reaches a shadow on the glyphs, a colour or
                // a length lays no ground — the rain's outline sets are read
                // by `text-shadow` alone, and read in the ring by the pass.
                // One read by a ground, or by nothing a sheet here shows, is
                // judged by what it holds.
                if (custom) {
                    const uses = usesOf(d.prop);
                    if (uses.size > 0 && ![...uses].some((use) => GROUND_PROPS.test(use))) continue;
                }
                if (!custom && DECORATION_ART[`${selector} | ${d.prop}`] !== undefined) continue;
                if (paints(d.value, d.prop, defs)) {
                    out.push(`${selector} { ${d.prop}: ${d.value.replace(/\s+/g, ' ')} }`);
                }
            }
        }
    }
    return out;
}

describe('a-decoration-lays-no-ground-under-text', () => {
    /**
     * Read from source, over every served sheet (the workshop kit's
     * included — a creator's decoration is held to it too): no rule scoped
     * to a decoration class lays a ground, a slab or a ring under any box —
     * `background` and its longhands, a gradient as a `background-image`,
     * `border`, `outline` or `box-shadow` — whether it is written there, run
     * through a keyframe, or handed to another rule as a custom property;
     * values are read with every custom property resolved to what any sheet
     * or look sets it to. The decoration's own art is the allow-list above,
     * each entry with its reason. What a line over a decoration may do
     * instead — an ink lifted, an outline hugging the strokes — is
     * the rain's outline, in `text-shadow`, which is not on this list for
     * that reason; a custom property is judged where it is read
     * (`customUses`).
     */
    it('lays none in any served sheet', () => {
        for (const sheet of SERVED_SHEETS) {
            const css = readFileSync(join(UI_DIR, '..', '..', sheet.path), 'utf8');
            expect(groundsUnderText(css), sheet.path).toEqual([]);
        }
    });

    it('names only art a served sheet still declares', () => {
        const declared = new Set<string>();
        for (const sheet of SERVED_SHEETS) {
            const css = readFileSync(join(UI_DIR, '..', '..', sheet.path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
            for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
                for (const selector of m[1]!.split(',').map((s) => s.replace(/\s+/g, ' ').trim())) {
                    for (const d of declarationsOf(m[2]!)) declared.add(`${selector} | ${d.prop}`);
                }
            }
        }
        expect(Object.keys(DECORATION_ART).filter((key) => !declared.has(key))).toEqual([]);
    });

    it('refuses every shape of ground the rounds before it laid, and the critic’s plants', () => {
        for (const planted of [
            // Round 5's solid ground and its slab between two sections.
            '.stall.att-rainfall .activity-sec { background-color: var(--s-bg); }',
            '.stall.att-rainfall .activity-sec + .activity-sec { box-shadow: 0 -12px 0 0 var(--s-bg); }',
            // Round 6's veil and its ring, on a line and on a box.
            '.stall.att-rainfall .mid-t { background-color: color-mix(in srgb, var(--s-bg) 25%, transparent); }',
            '.stall.att-rainfall .mid-t { box-shadow: 0 0 0 2px color-mix(in srgb, var(--s-bg) 25%, transparent); }',
            // A literal ground, a named colour, a gradient slab, an outline slab.
            '.stall.att-rainfall .stall-foot .fine { background: #05060d; }',
            '.stall.att-rainfall .orn { background-color: black; }',
            '.stall.att-rainfall .mid-p { background-image: linear-gradient(rgba(5, 6, 13, 0.5), rgba(5, 6, 13, 0.5)); }',
            '.stall.att-rainfall .orn { outline: 6px solid rgba(5, 6, 13, 0.6); }',
            '.stall.att-rainfall .orn { border-bottom: 3px solid; }',
            // A decoration's own class on a list beside the root it may paint.
            '.stall.att-rainfall, .stall.att-rainfall .notice { background-image: url(decor/rain-near.svg); }',
            // Inside a media query, and under the look.
            '@media (min-width: 680px) { .t-neo.att-aurora .section-head { background-color: #05060d; } }',
            // Through a keyframe the decoration runs on a line.
            '@keyframes wk-veil { to { background-color: rgba(5, 6, 13, 0.4); } } .stall.att-hum .sign-lamp { animation: wk-veil 1s; }',
            // A custom property the decoration sets for a base rule to read.
            '.stall.att-rainfall { --foot-ground: var(--s-bg); }',
        ]) {
            expect(groundsUnderText(planted), planted).toHaveLength(1);
        }
        // CRITIC-6 item 4's full-width veil and slab, as one rule: two grounds.
        expect(
            groundsUnderText(
                '.stall.att-rainfall .activity-sec { background-color: color-mix(in srgb, var(--s-bg) 40%, transparent); box-shadow: 0 -12px 0 0 color-mix(in srgb, var(--s-bg) 40%, transparent); }',
            ),
        ).toHaveLength(2);
    });

    it('resolves a custom property defined anywhere to what it holds', () => {
        // A var holding the ground, defined in a rule no decoration scopes.
        expect(
            groundsUnderText('.stall-foot { --wk-ground: var(--s-bg); } .stall.att-rainfall .stall-foot .fine { background-color: var(--wk-ground); }'),
        ).toHaveLength(1);
        // Two hops, and a fallback that paints behind a var nobody defines.
        expect(
            groundsUnderText('.a { --wk-a: var(--wk-b); } .b { --wk-b: #05060d; } .stall.att-rainfall .fine { box-shadow: 0 0 0 4px var(--wk-a); }'),
        ).toHaveLength(1);
        expect(groundsUnderText('.stall.att-rainfall .fine { background: var(--wk-nobody, #05060d); }')).toHaveLength(1);
        // And one that holds nothing paints nothing: the resolution, not the selector, decided.
        expect(
            groundsUnderText('.stall-foot { --wk-none: transparent; } .stall.att-rainfall .stall-foot .fine { background-color: var(--wk-none); }'),
        ).toEqual([]);
        expect(groundsUnderText('.stall.att-rainfall .fine { background: none; border: 0; box-shadow: none; outline: none; }')).toEqual([]);
        expect(groundsUnderText('.stall.att-rainfall { --wk-scale: calc(2 * var(--s-decor-scale, 1)); }')).toEqual([]);
    });

    it('judges a custom property where it is read', () => {
        // Read by a shadow on the glyphs alone: no ground here.
        expect(
            groundsUnderText('.stall.att-rainfall { --wk-o: 1px 0 0 var(--s-bg); } .stall.att-rainfall .fine { text-shadow: var(--wk-o); }'),
        ).toEqual([]);
        // The same property also read by a ground in a rule no decoration scopes: refused.
        expect(
            groundsUnderText(
                '.stall.att-rainfall { --wk-o: 1px 0 0 var(--s-bg); } .fine { text-shadow: var(--wk-o); } .stall-foot { box-shadow: var(--wk-o); }',
            ),
        ).toHaveLength(1);
        // Read by a ground through another custom property: refused.
        expect(
            groundsUnderText('.stall.att-rainfall { --wk-g: var(--s-bg); } .x { --wk-h: var(--wk-g); } .stall-foot { background-color: var(--wk-h); }'),
        ).toHaveLength(1);
        // Read by nothing a sheet here shows: judged by what it holds (the plant above).
        expect(groundsUnderText('.stall.att-rainfall { --wk-nobody-reads: var(--s-bg); }')).toHaveLength(1);
    });
});
