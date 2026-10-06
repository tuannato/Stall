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
import { afterAll, describe, expect, it } from 'vitest';
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
import { PLANTED_CLASS, beforeReduce, plantLooks, removePlants } from '../../scripts/private-looks-plant.mjs';
import { guardSheets, privateRows, servedSheets, type ServedSheetText } from '../../scripts/served-sheets.mjs';
import { OUTLINE_1, OUTLINE_2, OUTLINE_2_UNDER_PX, outlineSet } from '../../layout/outline';

const UI_DIR = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every sheet a run serves, with its text (`scripts/served-sheets.mjs`):
 * the role table's, and every private look's the run reads — the tracked
 * fixture always, the selection when the environment names one (step 8e1).
 * Every rule below that reads the served sheets reads a private look's too:
 * the ground under text, the outline's shape and colours, a mood class's
 * scope (its rows read from the look's own `look.json`), a keyframe's
 * runners and the custom properties every value is resolved through. What
 * reads the shipped catalogue alone — a row's own paint, its palette, its
 * art under a mood, its travel — reads `stall.css` and the shipped rows,
 * and a private look's rows join it with their reasons (8e2).
 */
const SERVED: readonly ServedSheetText[] = await guardSheets();
const PRIVATE = privateRows(SERVED);
afterAll(removePlants);

/** A planted private look (the fixture, renamed) with `rule` before its reduce block and `edit` over its look.json, as a run that selects it serves it. */
async function plantedServed(rule: string, editLook: (json: string) => string = (json) => json): Promise<readonly ServedSheetText[]> {
    const repo = plantLooks((path, text) =>
        path === 'fixture/sheet.css' ? beforeReduce(text, rule) : path === 'fixture/look.json' ? editLook(text) : text,
    );
    const sheets = await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env });
    if (!privateRows(sheets).some((sheet) => sheet.lookClass === PLANTED_CLASS)) throw new Error('the planted look was not read');
    return sheets;
}

/**
 * Where each row's COLOURS come from, and therefore whether a mood can move
 * them. `palette`: every colour is a `--s-*` token, so the row repaints
 * itself when the palette changes, a mood included. `art`: the row ships
 * drawn art — an asset, or literals a mood cannot reach.
 *
 * **The gate's table, not the catalogue's** (moved 2026-09-18). It lived on
 * `ShippedAttachment` for one commit, on the argument that a submission
 * would carry it on the wire. It cost 204 bytes every visitor downloads, no
 * runtime code read it, and it pushed the built output past the served
 * ceiling of the time (retired 2026-10-06) — a guard that had to be run to notice,
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
    'att-horizon': 'art',
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
        "Paper, not palette, since v5 (2026-09-22): the owner's reference is a torn scrap with a folded corner, and no CSS gradient draws one small and sparse — a conic wedge runs to its tile's edge, so a small scrap needs a small tile and a small tile repeats every few pixels. Tried at three tile sizes and photographed before this was written. The mismatch under Sun-faded is the stall fading while the paper does not, which is what new paper on an old stall looks like; and the legibility that a mood WOULD have moved is held from the other side: every scrap colour, fold included, clears 3:1 against every ink Rural can set on bare ground under every Rural mood (worst 3.12:1, Sun-faded's accent over the sage fold, after the owner darkened that mood's accent and muted on 2026-09-25 rather than repaint the paper; `every-confetti-scrap-clears-three-to-one-under-every-ground-ink`) — which is also why the reference's saturated rust and green are not in the tiles.",
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

/**
 * The decorations: every row with a class, less a mood's (D11). A mood's
 * class is a look's own and its rules live in that look's sheet, where the
 * look lint reads them — never in stall.css, which is what this gate's
 * paint and colour tables read — so it is held by
 * `a-mood-class-is-look-scoped` below instead. Its rules are still
 * decoration-scoped (`DECORATION_SCOPED`): no ground under text, no mark but
 * the outline, exactly as a decoration's.
 */
const paintable: readonly (ShippedAttachment & { cls: string })[] = SHIPPED_ATTACHMENTS.filter(
    (row): row is ShippedAttachment & { cls: string } => row.cls !== undefined && row.slot !== 'mood',
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
 *  the beetle's sprite (until v3) used the shorthand, so a longhand-only
 *  reader was blind on exactly the drawn-art rows. */
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
const reachesArt = (blob: string, defines: ReadonlySet<string> = SHEET_DEFINES): boolean => {
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
        (name) => !name.startsWith('--s-') && !defines.has(name),
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
         * inherit: a MOOD swaps the palette, and a decoration's rules cannot
         * ask whether one is worn — a mood may carry a class since D11, but
         * it is its look's own (`a-mood-class-is-look-scoped`), never a
         * decoration's selector, and no shipped mood carries one. A row whose
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

/** A private decoration row as the gate reads it: its catalogue fields from its look's `look.json`, its look's class and sheet. */
type PrivateDecoration = { cls: string; label: string; paint?: unknown; motion?: unknown; lookClass: string; css: string; path: string };

/** Every decoration row with a class of every private look in `sheets` (moods aside, as `paintable` sets them aside). */
function privateDecorations(sheets: readonly ServedSheetText[]): PrivateDecoration[] {
    return privateRows(sheets).flatMap((row) =>
        ((row.look.look as { decorations?: Record<string, unknown>[] } | undefined)?.decorations ?? [])
            .filter((d) => typeof d['cls'] === 'string')
            .map((d) => ({ cls: d['cls'] as string, label: String(d['label']), paint: d['paint'], motion: d['motion'], lookClass: row.lookClass, css: row.css, path: row.path })),
    );
}

/**
 * Why the gate cannot pass a private decoration row, or nothing (the 8e1
 * critic's item 8): the per-row rules above read the shipped catalogue and
 * stall.css, and a private row's reasons — the colours it follows, art it
 * draws, a mover's reader — have no place to be written until its
 * `look.json` carries the plan's `guard` field (8i). So a private row is
 * judged in the one shape that needs no reason, and refused in any other,
 * never skipped: a rule of its own in its look's sheet that paints
 * something; colours that are tokens and only tokens (`palette`); no art (a
 * `url()`, an `image-set()`, a property its sheet does not define); no
 * motion (its `motion` flag, an animation or a transition); and a root
 * paint (a node needs its mount and its `pointer-events` with it).
 */
function privateRowProblems(row: PrivateDecoration): string[] {
    const css = row.css.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim().replace(/\s+/g, ' '), body: m[2]! }));
    const own = rules.filter((r) => {
        const seen = classesIn(r.selector);
        return seen.length > 0 && seen.every((found) => ownedBy(row.cls, found));
    });
    const bodies = own.map((r) => r.body).join(' ');
    const defines = new Set([...css.toLowerCase().matchAll(/(--[a-z0-9_-]+)\s*:/g)].map((m) => m[1]!));
    const at = `${row.label} (${row.cls}, ${row.path})`;
    const out: string[] = [];
    if (own.length === 0 || !own.some((r) => PAINTS.test(r.body))) {
        out.push(`${at} has no rule of its own in its look's sheet that paints`);
    }
    if (reachesArt(bodies, defines) || /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(|\bcolor\(/i.test(bodies)) {
        out.push(`${at} draws art or a literal colour a mood cannot reach — its reason travels with the row's guard (8i), refused until then`);
    }
    if (own.length > 0 && !bodies.includes('var(--s-')) {
        out.push(`${at} names no token: a private row with no declared reason follows the palette`);
    }
    if (row.motion === true || /(?:^|;)\s*(?:animation|animation-name|transition)\s*:/.test(bodies)) {
        out.push(`${at} moves — a mover's reader travels with the row's guard (8i), refused until then`);
    }
    if (row.paint !== 'root') {
        out.push(`${at} paints ${String(row.paint)} — a private node row needs its mount and its reader (8i), refused until then`);
    }
    return out;
}

describe('a-private-row-the-gate-cannot-judge-is-refused', () => {
    it('judges every private decoration a run reads, the fixture\'s two among them, in the one shape that needs no reason', () => {
        const rows = privateDecorations(SERVED);
        expect(rows.filter((row) => row.lookClass === 't-fixture-private').map((row) => row.cls).sort()).toEqual(['att-fixture-crest', 'att-fixture-trim']);
        for (const row of rows) {
            expect(privateRowProblems(row), row.cls).toEqual([]);
        }
    });

    it('refuses a planted row with no rule, one with art or a literal colour, one that moves, and a node', async () => {
        const planted = async (rule: string, editLook?: (json: string) => string): Promise<string[]> =>
            privateDecorations(await plantedServed(rule, editLook))
                .filter((row) => row.lookClass === PLANTED_CLASS)
                .flatMap(privateRowProblems);
        const harmless = `.${PLANTED_CLASS} .item-n { letter-spacing: 0.01em; }`;
        expect(await planted(harmless)).toEqual([]);
        expect((await planted(harmless, (json) => json.replace('"att-planted-crest"', '"att-planted-ghost"'))).join('\n')).toMatch(/att-planted-ghost.* has no rule of its own/);
        expect((await planted(`.${PLANTED_CLASS}.att-planted-trim .stall-sign { color: #c0503f; }`)).join('\n')).toMatch(/att-planted-trim.* draws art or a literal colour/);
        expect((await planted(`.${PLANTED_CLASS}.att-planted-trim .x { color: var(--s-text); mask-image: url(./art/ground.svg); }`)).join('\n')).toMatch(/draws art/);
        expect((await planted(harmless, (json) => json.replace('"motion": false,\n            "tokenId": "f1', '"motion": true,\n            "tokenId": "f1'))).join('\n')).toMatch(/att-planted-trim.* moves/);
        expect((await planted(`.${PLANTED_CLASS}.att-planted-crest .stall-name { transition: color 1s; }`)).join('\n')).toMatch(/att-planted-crest.* moves/);
        expect((await planted(harmless, (json) => json.replace('"paint": "root",\n            "motion": false\n', '"paint": "node",\n            "motion": false\n'))).join('\n')).toMatch(/att-planted-crest.* paints node/);
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
        'the Horizon is a floor and a skyline drawn on the sign’s own panel (`yard` on Neo): the city, moon and stars stand behind the name as a picture does, and the haze and scrim sink its own floor lines under the name, as shipped',
    '.att-bunting | background': 'a decoration node’s own box: aria-hidden, no text in it',
    '.att-beetle | background-image': 'a decoration node’s own box: the beetle’s rail, aria-hidden, no text in it',
    '.att-beetle-bug | background-image': 'a decoration node’s own box: the beetle sprite, walking or flying, aria-hidden, no text in it',
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
    const sheets = SERVED.map((sheet) => sheet.css);
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
    const sheets = SERVED.map((sheet) => sheet.css);
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
                // by `text-shadow` alone, and that use is the outline test's.
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

/** `text` split at `sep` where no bracket, parenthesis or quote is open. */
function splitTop(text: string, sep: (ch: string) => boolean): string[] {
    const out: string[] = [];
    let depth = 0;
    let quote = '';
    let cur = '';
    for (const ch of text) {
        if (quote !== '') {
            cur += ch;
            if (ch === quote) quote = '';
            continue;
        }
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(' || ch === '[') depth += 1;
        else if (ch === ')' || ch === ']') depth -= 1;
        if (depth === 0 && sep(ch)) {
            out.push(cur);
            cur = '';
            continue;
        }
        cur += ch;
    }
    out.push(cur);
    return out.map((part) => part.trim()).filter((part) => part !== '');
}

/**
 * Every selector in `css` that reads the mood class `cls` (or a child class
 * of it) outside its look, each with the reason. A selector naming it must:
 *
 * - name one of `lookClasses` **in the same compound** — the class lands on
 *   the stall root beside the look's own, so `.t-rural.att-x` is its look and
 *   `.t-rural .att-x` or `.att-x` alone is not. For a kit sheet the sheet's
 *   own class counts (`t-workshop`): `workshop:start` copies a shipped mood's
 *   rules re-scoped there, and the kit allows the class (step 5c's critic,
 *   item 2);
 * - carry **no functional pseudo-class** (`:is()`, `:not()`, `:where()`,
 *   `:has()`, …) anywhere: `:is(.t-neo, .t-rural).att-x` names the look's
 *   class as text and matches another look, and `:not(.t-rural).att-x`
 *   matches every other look (item 3). Refused outright rather than parsed —
 *   nothing a mood's rule needs is said only that way;
 * - name **no other row's `att-` class**: a mood's class is never a
 *   decoration's selector, so `.t-rural.att-x.att-confetti` — a mood
 *   re-dressing a decoration — is refused (item 1). A decoration that must
 *   change under a mood is written in the tokens (CLAUDE §4).
 */
function outOfScope(css: string, cls: string, lookClasses: readonly string[]): string[] {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out: string[] = [];
    for (const m of bare.matchAll(/([^{}]+)\{/g)) {
        const head = m[1]!.trim();
        if (head.startsWith('@')) {
            continue;
        }
        for (const selector of splitTop(head, (ch) => ch === ',').map((one) => one.replace(/\s+/g, ' '))) {
            if (!classesIn(selector).some((found) => ownedBy(cls, found))) {
                continue;
            }
            if (/:(?!:)[a-z-]+\(/.test(selector)) {
                out.push(`${selector} — a functional pseudo-class`);
                continue;
            }
            const others = classesIn(selector).filter((found) => !ownedBy(cls, found));
            if (others.length > 0) {
                out.push(`${selector} — names another row's ${others.join(', ')}`);
                continue;
            }
            const compounds = splitTop(selector, (ch) => /[\s>+~]/.test(ch));
            const home = compounds.find((compound) => classesIn(compound).some((found) => ownedBy(cls, found)))!;
            const tokens = [...home.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((t) => t[1]!);
            if (!lookClasses.some((look) => tokens.includes(look))) {
                out.push(`${selector} — not beside ${lookClasses.map((look) => `.${look}`).join(' or ')}`);
            }
        }
    }
    return out;
}

/** The classes a mood's rule may stand beside in `sheet`: its look's, and a kit sheet's own. */
const lookClassesFor = (lookClass: string, sheet: { role: string; lookClass?: string }): string[] =>
    sheet.role === 'kit' && sheet.lookClass !== undefined ? [lookClass, sheet.lookClass] : [lookClass];

describe('a-mood-class-is-look-scoped', () => {
    /**
     * D11 (step 5c): a mood may name one class. It rides the stall root on
     * the shop and the wall and is stripped from the overlay
     * (`a-mood-class-never-reaches-the-overlay`); here, the CSS half of
     * "look-scoped", read over every served sheet by `outOfScope`: beside
     * its look's class in one compound, through no functional pseudo-class,
     * and never beside another row's class — a mood's class is never a
     * decoration's selector. In a look's sheet the look lint already holds
     * every selector under that class. The shape and the owner are
     * `moodClassProblems` (`src/domain/moodClass.ts`), read by the catalogue's
     * pin test and the look data validator. No shipped mood carries a class today, so the
     * plants are what show the rule refusing.
     */
    const sheets = SERVED.map((sheet) => ({
        sheet,
        css: sheet.css,
    }));

    it('holds every shipped mood class to its look, in every served sheet', () => {
        for (const row of SHIPPED_ATTACHMENTS.filter((a) => a.slot === 'mood' && a.cls !== undefined)) {
            const lookClass = decodeTheme(row.themeId).sheetClass;
            for (const { sheet, css } of sheets) {
                expect(outOfScope(css, row.cls!, lookClassesFor(lookClass, sheet)), `${row.label} in ${sheet.path}`).toEqual([]);
            }
        }
    });

    /** Every mood class a private look's `look.json` names, with its look's class. */
    const privateMoodClasses = (rows: readonly ServedSheetText[]): { cls: string; lookClass: string; label: string }[] =>
        privateRows(rows).flatMap((row) =>
            ((row.look.look as { moods?: { cls?: unknown; label?: unknown }[] } | undefined)?.moods ?? [])
                .filter((mood) => typeof mood.cls === 'string')
                .map((mood) => ({ cls: mood.cls as string, lookClass: row.lookClass, label: String(mood.label) })),
        );

    it('holds every private look\'s mood class to its look, in every served sheet, the fixture\'s among them', () => {
        const moods = privateMoodClasses(SERVED);
        expect(moods.some((mood) => mood.lookClass === 't-fixture-private'), 'the fixture names a mood class').toBe(true);
        for (const mood of moods) {
            for (const { sheet, css } of sheets) {
                expect(outOfScope(css, mood.cls, lookClassesFor(mood.lookClass, sheet)), `${mood.label} in ${sheet.path}`).toEqual([]);
            }
        }
    });

    it('goes red on a planted private look whose own sheet reads its mood class outside its compound', async () => {
        const served = await plantedServed(`.${PLANTED_CLASS} .att-planted-dusk .item { letter-spacing: 0.01em; }`);
        const mood = privateMoodClasses(served).find((m) => m.lookClass === PLANTED_CLASS)!;
        expect(mood.cls).toBe('att-planted-dusk');
        const offences = served.flatMap((sheet) => outOfScope(sheet.css, mood.cls, lookClassesFor(mood.lookClass, sheet)));
        expect(offences).toEqual([`.${PLANTED_CLASS} .att-planted-dusk .item — not beside .${PLANTED_CLASS}`]);
    });

    it('refuses a rule that reads a mood class outside its look (plants)', () => {
        const at = 'att-harness-dusk';
        const rural = ['t-rural'];
        expect(outOfScope(`.t-rural.${at} .item { color: red }`, at, rural)).toEqual([]);
        expect(outOfScope(`.stall.t-rural.${at}-line::after { color: red }`, at, rural)).toEqual([]);
        expect(outOfScope(`@media (min-width: 680px) { .t-rural.${at} .item { color: red } }`, at, rural)).toEqual([]);
        expect(outOfScope(`.stall.${at} .item { color: red }`, at, rural)).toHaveLength(1);
        expect(outOfScope(`.t-rural .x, .${at} .item { color: red }`, at, rural)).toHaveLength(1);
        expect(outOfScope(`.t-neo.${at} .item { color: red }`, at, rural)).toHaveLength(1);
        expect(outOfScope(`.t-rurals.${at} .item { color: red }`, at, rural)).toHaveLength(1);
        // The look's class in another compound is not its look: the class is
        // on the root, beside the look's own.
        expect(outOfScope(`.t-rural .${at} .item { color: red }`, at, rural)).toHaveLength(1);
        // Another class that merely starts with the same letters is not its.
        expect(outOfScope(`.stall.${at}s .item { color: red }`, at, rural)).toEqual([]);
    });

    it('refuses a mood class read beside a decoration (item 1)', () => {
        const at = 'att-harness-dusk';
        expect(outOfScope(`.t-rural.${at}.att-confetti .item { color: red }`, at, ['t-rural'])[0]).toMatch(
            /names another row's att-confetti/,
        );
        expect(outOfScope(`.t-rural.${at} .att-beetle-bug { color: red }`, at, ['t-rural'])[0]).toMatch(
            /names another row's att-beetle-bug/,
        );
    });

    it('refuses the look class behind :is() or :not() (item 3)', () => {
        const at = 'att-harness-dusk';
        for (const plant of [
            `:is(.t-neo, .t-rural).${at} .item { color: red }`,
            `:not(.t-rural).${at} .item { color: red }`,
            `.t-rural:where(.${at}) .item { color: red }`,
        ]) {
            expect(outOfScope(plant, at, ['t-rural']), plant).toHaveLength(1);
            expect(outOfScope(plant, at, ['t-rural'])[0]).toMatch(/functional pseudo-class/);
        }
        // A pseudo-element's double colon is not a pseudo-class.
        expect(outOfScope(`.t-rural.${at}::after { color: red }`, at, ['t-rural'])).toEqual([]);
    });

    it("reads a kit sheet under the sheet's own class, and no other sheet (item 2)", () => {
        const at = 'att-harness-dusk';
        const kit = SERVED.find((sheet) => sheet.role === 'kit')!;
        const base = SERVED.find((sheet) => sheet.role === 'base')!;
        const copied = `.t-workshop.${at} .item { color: red }`;
        expect(outOfScope(copied, at, lookClassesFor('t-rural', kit))).toEqual([]);
        expect(outOfScope(copied, at, lookClassesFor('t-rural', base))).toHaveLength(1);
    });
});

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
     * `an-outline-is-the-only-mark-under-text-on-a-decoration`'s, below, and
     * `text-shadow` is not on this list for that reason: every other mark a
     * decoration may put under a glyph — a shadow that is not the outline, a
     * stroke, a paint order, a decoration line — is refused there
     * (`marksUnderText`, the critic's eighth pass, item 7). A custom
     * property is judged where it is read (`customUses`).
     */
    it('lays none in any served sheet, a private look\'s among them', async () => {
        expect(PRIVATE.length).toBeGreaterThan(0);
        for (const sheet of SERVED) {
            const css = sheet.css;
            expect(groundsUnderText(css), sheet.path).toEqual([]);
        }
        // A planted private look whose decoration lays a ground under a line: red.
        const served = await plantedServed(`.${PLANTED_CLASS}.att-planted-trim .item-n { background-color: #05060d; }`);
        const planted = privateRows(served).find((sheet) => sheet.lookClass === PLANTED_CLASS)!;
        expect(groundsUnderText(planted.css)).toEqual([`.${PLANTED_CLASS}.att-planted-trim .item-n { background-color: #05060d }`]);
    });

    it('names only art a served sheet still declares', () => {
        const declared = new Set<string>();
        for (const sheet of SERVED) {
            const css = sheet.css.replace(/\/\*[\s\S]*?\*\//g, '');
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
        // Read by a shadow on the glyphs alone: no ground here (the outline test's).
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

/*
 * ---------------------------------------------------------------------------
 * An outline is the only mark under text on a decoration (round 8,
 * 2026-09-25): where a line does not read over a decoration, the owner's
 * "lớp nền tối ngay dưới nét chữ" is `text-shadow` in the colour of the
 * ground the line stands on, opaque and unblurred, one or two pixels wide
 * (`layout/outline.ts`) — and nothing else in a ground's colour ever sits
 * under a glyph. The colour is `var(--s-bg)` on the plain ground and, on a
 * tinted surface, that surface's own paint over the ground (option (b), the
 * owner, 2026-09-25, re-confirmed after `visible-batch-shots/15-outline-b/`),
 * always through `var(--rain-outline-ground)`, whose
 * every value is declared in `OUTLINE_GROUNDS` with the surface it matches.
 * ---------------------------------------------------------------------------
 */

/**
 * The two names an outline's colour is written in, kept as markers when a
 * value is expanded: the look's ground, and the parameter the rain's two
 * sets are written in (`--rain-outline-ground`), whose values are held on
 * their own (`outlineGroundOffences`) — expanding it inside a twenty-shadow
 * set would be five options twenty times over.
 */
const OUTLINE_COLOURS: ReadonlySet<string> = new Set(['--s-bg', '--rain-outline-ground']);

/** Every value `value` can take with its custom properties substituted, the outline's colours kept as markers. */
function expansions(value: string, defs: Map<string, string[]>, seen: ReadonlySet<string> = new Set()): string[] {
    const call = varCalls(value).find((c) => !OUTLINE_COLOURS.has(c.name));
    if (call === undefined) return [value];
    // The call resolved on its own, a cycle refused along its own path; then
    // the rest of the value, so a property named twice is expanded twice.
    const options = seen.has(call.name)
        ? []
        : [...new Set([...(defs.get(call.name) ?? []), ...(call.fallback === undefined ? [] : [call.fallback])])];
    const resolved =
        options.length === 0 ? ['unresolved'] : options.flatMap((option) => expansions(option, defs, new Set([...seen, call.name])));
    return resolved.flatMap((one) => expansions(value.replace(call.whole, one), defs, seen)).slice(0, 64);
}

/** A comma-separated list split at its top-level commas. */
function topLevel(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] === '(') depth += 1;
        if (value[i] === ')') depth -= 1;
        if (value[i] === ',' && depth === 0) {
            out.push(value.slice(start, i).trim());
            start = i + 1;
        }
    }
    out.push(value.slice(start).trim());
    return out.filter((part) => part !== '');
}

/** A literal colour as rgb, or `undefined` when it is not a literal this reader parses. */
function literalRgb(token: string): Rgb3 | undefined {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(token)?.[1];
    if (hex !== undefined) {
        const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
        return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as unknown as Rgb3;
    }
    const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(token);
    return rgb === null ? undefined : [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

type Rgb3 = readonly [number, number, number];

/** An expression with its whitespace squashed, to compare as written. */
const squash = (value: string): string =>
    value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();

/** How a shadow names an outline's colour: the look's ground, or the parameter the rain's sets are written in. */
const OUTLINE_WRITTEN: ReadonlySet<string> = new Set(['var(--s-bg)', 'var(--rain-outline-ground)']);

/** The rain's root, where the plain ground's colour is declared, and the scope every surface's own colour is. */
const RAIN_ROOT = '.stall.att-rainfall';
const RAIN_SCOPE = '.stall.att-rainfall:not(.deck-stall)';
/**
 * Grid horizon's scope (step 5a″, D14): it paints its skyline on the sign's
 * own box, so the one surface it outlines on is the sign, and the colour is
 * declared there.
 */
const HORIZON_SCOPE = '.stall.att-horizon:not(.deck-stall)';

type OutlineGround = {
    /** The decoration's scope the surface is named under: the rain's (`RAIN_SCOPE`) unless stated. */
    scope?: string;
    /** The colour `stall.css` gives `--rain-outline-ground` on this surface. */
    colour: string;
    /**
     * Where the surface is painted: the rule, and whether its paint is one
     * fill, a two-stop wash read at its midpoint, or — `stops`, a panel
     * whose ground is one layer of a stack — the even mix of that layer's
     * first two stops, the layer named as written (`layer`) — and, with
     * `sunk`, that mix taken that share of the way to the page ground
     * (`--s-bg`), where a decoration's floor sink darkens the panel.
     */
    paint: { sheet: string; rule: string; read: 'fill' | 'midpoint' | 'stops'; layer?: string; sunk?: number };
    reason: string;
    /**
     * Each state — `:hover`, `:focus`, `:focus-visible`, `:focus-within`,
     * `:active`, as written after the surface — in which the surface's own
     * sheet paints another fill: the rule that paints it, and the outline's
     * colour in that state, declared in `stall.css` on the surface with the
     * state on it. Found by `statesWithoutOutline`.
     */
    states?: Readonly<Record<string, { colour: string; rule: string }>>;
};

/** One colour `stall.css` gives `--rain-outline-ground`: a listed surface at rest, or in one of its states. */
type GroundRow = {
    surface: string;
    /** '' at rest. */
    state: string;
    /** The one selector the colour is declared under. */
    selector: string;
    colour: string;
    paint: OutlineGround['paint'];
    /** The decoration's scope the row is declared under. */
    scope: string;
};

/** Every colour a table lists, one row a surface and one row each state of it. */
function groundRows(table: Readonly<Record<string, OutlineGround>>): GroundRow[] {
    return Object.entries(table).flatMap(([surface, ground]) => [
        { surface, state: '', selector: `${ground.scope ?? RAIN_SCOPE} ${surface}`, colour: ground.colour, paint: ground.paint, scope: ground.scope ?? RAIN_SCOPE },
        ...Object.entries(ground.states ?? {}).map(([state, painted]) => ({
            surface,
            state,
            selector: `${ground.scope ?? RAIN_SCOPE} ${surface}${state}`,
            scope: ground.scope ?? RAIN_SCOPE,
            colour: painted.colour,
            paint: { sheet: ground.paint.sheet, rule: painted.rule, read: 'fill' as const },
        })),
    ]);
}

/**
 * Every colour the rain's outline takes other than the plain ground's
 * `var(--s-bg)` (option (b): the owner's choice, 2026-09-25, re-confirmed
 * that morning after the corrected pictures in
 * `visible-batch-shots/15-outline-b/` — the at-rest frames of
 * `13-outline-options/`, where it was first chosen, came from a script with
 * a bug): keyed by the tinted surface as
 * the outline rules name it, each the surface's own paint composited over
 * the ground, written as a `color-mix` of the look's tokens — so at rest,
 * with no drop behind a line, the outline is the ground it stands on
 * (`an-outline-that-shows-at-rest` measures that in the browser). A literal
 * is allowed inside one only where the surface's own paint carries it and
 * no token of the look does: the notice's violet stop. Anything else is
 * refused (`outlineGroundOffences`), and each colour is held to the paint
 * it names (`outlineGroundMismatches`).
 */
const OUTLINE_GROUNDS: Readonly<Record<string, OutlineGround>> = {
    "[data-role='list-first']": {
        colour: 'color-mix(in srgb, var(--s-accent) 16%, var(--s-bg))',
        paint: { sheet: 'src/ui/theme-neo.css', rule: '.t-neo .cta', read: 'fill' },
        reason: 'the empty stall’s call to action: Neo fills it with its accent at 16%',
    },
    '.event-txid': {
        colour: 'color-mix(in srgb, var(--s-muted) 12%, var(--s-bg))',
        paint: { sheet: 'src/ui/stall.css', rule: '.event-txid', read: 'fill' },
        reason: 'the Activity pill: the muted at 12%',
    },
    '.notice-invite': {
        colour: 'color-mix(in srgb, var(--s-accent-2) 4%, var(--s-bg))',
        paint: { sheet: 'src/ui/theme-neo.css', rule: '.t-neo .notice-invite', read: 'fill' },
        reason: 'the notice invite’s wash: Neo’s second accent at 4%, under its words and its ghost chip',
        // The critic's final merge, item 2: at 4% under a 9% wash, the
        // outline showed about 13 levels off the invite under a pointer.
        states: {
            ':hover': {
                colour: 'color-mix(in srgb, var(--s-accent-2) 9%, var(--s-bg))',
                rule: '.t-neo .notice-invite:hover',
            },
        },
    },
    '.notice:not(.stall-sign .notice)': {
        colour: 'color-mix(in srgb, color-mix(in srgb, var(--s-accent-2) 16%, var(--s-bg)), color-mix(in srgb, #8b7bff 10%, var(--s-bg)))',
        paint: { sheet: 'src/ui/theme-neo.css', rule: '.t-neo .notice', read: 'midpoint' },
        reason:
            'the notice’s wash, a gradient from the second accent at 16% to a violet at 10% that no single colour matches: its midpoint, both stops over the ground mixed evenly; the violet is a literal of Neo’s own sheet that no token carries',
    },
    '.studio-browser': {
        colour: 'color-mix(in srgb, var(--s-accent) 4%, var(--s-bg))',
        paint: { sheet: 'src/ui/theme-neo.css', rule: '.t-neo .studio-browser', read: 'fill' },
        reason:
            'the Studio’s “This browser” box: Neo tints it with its accent at 4% — not on the owner’s list of four, found by `an-outline-that-shows-at-rest` (its note’s outline read 9 levels off the box)',
    },
    '.stall-sign': {
        scope: HORIZON_SCOPE,
        colour: 'color-mix(in srgb, #101a2c, #0a1120)',
        paint: {
            sheet: 'src/ui/theme-neo.css',
            rule: '.t-neo .stall-head',
            read: 'stops',
            layer: 'linear-gradient(180deg, #101a2c 0%, #0a1120 55%, #070c17 100%)',
        },
        reason:
            'the sign, where Grid horizon draws its skyline, windows and stars behind the seller’s name (step 5a″, D14, the owner’s (a)): the ground under that art is Neo’s sign panel, a gradient whose top two stops are where the name stands — their even mix, both literals of Neo’s own sheet that no token carries',
    },
    '.stall-tagline': {
        scope: HORIZON_SCOPE,
        colour: 'color-mix(in srgb, var(--s-bg), color-mix(in srgb, #101a2c, #0a1120))',
        paint: {
            sheet: 'src/ui/theme-neo.css',
            rule: '.t-neo .stall-head',
            read: 'stops',
            layer: 'linear-gradient(180deg, #101a2c 0%, #0a1120 55%, #070c17 100%)',
            sunk: 0.5,
        },
        reason:
            'the tagline under Grid horizon (step 5a″, the owner via the window): the panel’s top two stops taken half way to `--s-bg`. `sunk: 0.5` is a fitted value, not a derived one: the ground under the tagline darkens differently by place — below the horizon’s line at a phone and a desk, where the floor sink (the page ground at 86%, from 44% to 80% of the sign) lies over the panel; on the wall it stands in the sky just above the line, and the sink, which begins above the line at 44%, already darkens it there — and the half-way mix is the one colour the at-rest read measured inside the ground on every screen and width, where the panel’s own colour fell outside it at the desk and on the wall',
    },
};

const LISTED_GROUNDS: ReadonlySet<string> = new Set(groundRows(OUTLINE_GROUNDS).map((row) => squash(row.colour)));

type Paint = { rgb: Rgb3; alpha: number };

/** A colour expression as `var()`, `transparent`, a hex or `rgb[a]()` literal, or a `color-mix(in srgb, …)` of those. */
function paintOf(expr: string, vars: Readonly<Record<string, string>>, depth = 0): Paint | undefined {
    const v = squash(expr);
    if (depth > 8) return undefined;
    const call = /^var\((--[a-zA-Z0-9-]+)\)$/.exec(v);
    if (call !== null) {
        const def = vars[call[1]!];
        return def === undefined ? undefined : paintOf(def, vars, depth + 1);
    }
    if (v === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
    const rgba = /^rgba?\(([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\)$/.exec(v);
    if (rgba !== null) {
        const a = rgba[4] === undefined ? 1 : Number(rgba[4]) / (rgba[5] === '%' ? 100 : 1);
        return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: a };
    }
    const hex = literalRgb(v);
    if (hex !== undefined && v.startsWith('#')) return { rgb: hex, alpha: 1 };
    if (!v.startsWith('color-mix(') || !v.endsWith(')')) return undefined;
    const args = topLevel(v.slice('color-mix('.length, -1));
    if (args.length !== 3 || args[0] !== 'in srgb') return undefined;
    const part = (arg: string): { c: string; p: number | undefined } => {
        const m = /^(.*?)\s+([\d.]+)%$/.exec(arg);
        return m === null ? { c: arg, p: undefined } : { c: m[1]!, p: Number(m[2]) };
    };
    const [a, b] = [part(args[1]!), part(args[2]!)];
    const p1 = a.p ?? (b.p === undefined ? 50 : 100 - b.p);
    const p2 = b.p ?? 100 - p1;
    const c1 = paintOf(a.c, vars, depth + 1);
    const c2 = paintOf(b.c, vars, depth + 1);
    if (c1 === undefined || c2 === undefined || p1 + p2 <= 0) return undefined;
    const [w1, w2] = [p1 / (p1 + p2), p2 / (p1 + p2)];
    const alpha = c1.alpha * w1 + c2.alpha * w2;
    const rgb = [0, 1, 2].map((k) => (alpha === 0 ? 0 : (c1.rgb[k]! * c1.alpha * w1 + c2.rgb[k]! * c2.alpha * w2) / alpha));
    return { rgb: rgb as unknown as Rgb3, alpha: alpha * (Math.min(p1 + p2, 100) / 100) };
}

/** `paint` at its alpha over the opaque `ground`. */
function paintOver(paint: Paint, ground: Rgb3): Rgb3 {
    return ground.map((g, k) => paint.rgb[k]! * paint.alpha + g * (1 - paint.alpha)) as unknown as Rgb3;
}

/**
 * Every offence against the rule that an outline's colour is declared, in
 * `css`: `--rain-outline-ground` is set only on the rain's root, as
 * `var(--s-bg)`, and on a surface `OUTLINE_GROUNDS` lists, as the colour
 * listed for it — one selector a rule, never in a keyframe — and each
 * listed colour is a `color-mix`, of the look's `--s-*` tokens alone but
 * for a literal the surface's own paint carries and no token does.
 */
function outlineGroundOffences(
    css: string,
    table: Readonly<Record<string, OutlineGround>> = OUTLINE_GROUNDS,
    sheetOf: (path: string) => string = (path) => readFileSync(join(UI_DIR, '..', '..', path), 'utf8'),
): string[] {
    const out: string[] = [];
    for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectors = topLevel(m[1]!).map(squash);
        for (const d of declarationsOf(m[2]!).filter((decl) => decl.prop === '--rain-outline-ground')) {
            const value = squash(d.value.replace(/\s*!important\s*$/i, ''));
            const at = `${selectors.join(', ')} { --rain-outline-ground: ${value.slice(0, 80)} }`;
            const listed = groundRows(table).find((row) => selectors.length === 1 && selectors[0] === row.selector);
            if (selectors.length === 1 && selectors[0] === RAIN_ROOT) {
                if (value !== 'var(--s-bg)') out.push(`${at}: the plain ground’s outline is var(--s-bg)`);
            } else if (listed === undefined) {
                out.push(`${at}: an outline colour on a surface OUTLINE_GROUNDS does not list`);
            } else if (value !== squash(listed.colour)) {
                out.push(`${at}: not the colour OUTLINE_GROUNDS lists for ${listed.surface}${listed.state}`);
            }
        }
    }
    for (const ground of groundRows(table)) {
        const surface = `${ground.surface}${ground.state}`;
        const colour = squash(ground.colour);
        if (!colour.startsWith('color-mix(')) out.push(`${surface}: its outline colour is not a color-mix of the look’s tokens`);
        for (const call of varCalls(colour)) {
            if (!call.name.startsWith('--s-')) out.push(`${surface}: its outline colour reads ${call.name}, not a look’s token`);
        }
        const paintRule = ground.paint.read === 'stops' ? stopsLayerOf(ground, sheetOf) : paintRuleOf(ground, sheetOf);
        const literals = colour.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? [];
        for (const literal of literals) {
            const rgb = literalRgb(literal);
            const inPaint = (paintRule?.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []).some((p) => {
                const q = literalRgb(p);
                return rgb !== undefined && q !== undefined && q.every((c, i) => c === rgb[i]);
            });
            const aToken = looksOfScope(ground.scope).some((id) =>
                Object.entries(themeVars(decodeTheme(id))).some(([name, value]) => {
                    const t = literalRgb(value);
                    return name.startsWith('--s-') && rgb !== undefined && t !== undefined && t.every((c, i) => c === rgb[i]);
                }),
            );
            if (!inPaint) out.push(`${surface}: the literal ${literal} is not in the paint it names`);
            if (aToken) out.push(`${surface}: the literal ${literal} is a colour a look’s token carries — write the token`);
        }
    }
    return out;
}

/** The looks that wear the rain. */
const RAIN_LOOKS: readonly number[] = [
    ...new Set(SHIPPED_ATTACHMENTS.filter((row) => row.cls === 'att-rainfall').map((row) => row.themeId)),
];

/** The looks that wear the decoration a scope names (`.stall.att-…`). */
function looksOfScope(scope: string): readonly number[] {
    const cls = /\.(att-[a-z0-9-]+)/.exec(scope)?.[1];
    return [...new Set(SHIPPED_ATTACHMENTS.filter((row) => row.cls === cls).map((row) => row.themeId))];
}

/** The two literal stops a `stops` read mixes, when the rule's background-image carries the named layer as written. */
function stopsLayerOf(ground: { paint: OutlineGround['paint'] }, sheetOf: (path: string) => string): string | undefined {
    if (ground.paint.read !== 'stops' || ground.paint.layer === undefined) return undefined;
    const css = sheetOf(ground.paint.sheet).replace(/\/\*[\s\S]*?\*\//g, '');
    const layers = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => topLevel(m[1]!).map(squash).includes(ground.paint.rule))
        .flatMap((m) => declarationsOf(m[2]!).filter((d) => d.prop === 'background-image'))
        .flatMap((d) => topLevel(squash(d.value)));
    return layers.find((layer) => layer === squash(ground.paint.layer!));
}

/** The background a listed surface's paint rule declares, or `undefined` when the sheet has not exactly one such rule. */
function paintRuleOf(ground: { paint: OutlineGround['paint'] }, sheetOf: (path: string) => string): string | undefined {
    const css = sheetOf(ground.paint.sheet).replace(/\/\*[\s\S]*?\*\//g, '');
    const values = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => topLevel(m[1]!).map(squash).includes(ground.paint.rule))
        .flatMap((m) => declarationsOf(m[2]!).filter((d) => /^background(?:-color|-image)?$/.test(d.prop)))
        .map((d) => squash(d.value));
    return values.length === 1 ? values[0] : undefined;
}

/**
 * Every listed outline colour that is not, on a look that wears the rain,
 * the surface's own paint over that look's ground — its one fill, or a
 * two-stop wash at its midpoint — within one level on each channel.
 */
function outlineGroundMismatches(
    table: Readonly<Record<string, OutlineGround>> = OUTLINE_GROUNDS,
    sheetOf: (path: string) => string = (path) => readFileSync(join(UI_DIR, '..', '..', path), 'utf8'),
): string[] {
    const out: string[] = [];
    for (const entry of groundRows(table)) {
        for (const id of looksOfScope(entry.scope)) {
            const vars = themeVars(decodeTheme(id));
            const ground = paintOf('var(--s-bg)', vars);
            const surface = `${entry.surface}${entry.state}`;
            const listed = paintOf(entry.colour, vars);
            const rule = entry.paint.read === 'stops' ? stopsLayerOf(entry, sheetOf) : paintRuleOf(entry, sheetOf);
            let painted: Rgb3 | undefined;
            if (rule !== undefined && entry.paint.read === 'stops') {
                // A panel's own layer: its first two stops, both opaque, mixed evenly.
                const inner = /^linear-gradient\((.*)\)$/.exec(rule)?.[1];
                const args = inner === undefined ? [] : topLevel(inner);
                const stops = (/^(?:-?[\d.]+deg|to [a-z ]+)$/.test(args[0] ?? '') ? args.slice(1) : args)
                    .slice(0, 2)
                    .map((stop) => paintOf(stop.replace(/\s+-?[\d.]+%$/, ''), vars));
                if (stops.length === 2 && stops.every((stop) => stop !== undefined && stop.alpha === 1)) {
                    painted = stops[0]!.rgb.map((c, k) => (c + stops[1]!.rgb[k]!) / 2) as unknown as Rgb3;
                    const sunk = entry.paint.sunk ?? 0;
                    if (sunk > 0) {
                        painted = ground === undefined ? undefined : (painted.map((c, k) => c * (1 - sunk) + ground.rgb[k]! * sunk) as unknown as Rgb3);
                    }
                }
            } else if (ground !== undefined && rule !== undefined && entry.paint.read === 'fill') {
                const fill = paintOf(rule, vars);
                painted = fill === undefined ? undefined : paintOver(fill, ground.rgb);
            } else if (ground !== undefined && rule !== undefined) {
                const inner = /^linear-gradient\((.*)\)$/.exec(rule)?.[1];
                const args = inner === undefined ? [] : topLevel(inner);
                const stops = (/^(?:-?[\d.]+deg|to [a-z ]+)$/.test(args[0] ?? '') ? args.slice(1) : args).map((stop) => paintOf(stop, vars));
                if (stops.length === 2 && stops.every((stop) => stop !== undefined)) {
                    const [a, b] = stops.map((stop) => paintOver(stop!, ground.rgb));
                    painted = a!.map((c, k) => (c + b![k]!) / 2) as unknown as Rgb3;
                }
            }
            if (listed === undefined || listed.alpha !== 1 || painted === undefined) {
                out.push(`${surface} on look ${id}: the listed colour or the paint of ${entry.paint.rule} does not read`);
            } else if (listed.rgb.some((c, k) => Math.abs(c - painted![k]!) > 1)) {
                out.push(
                    `${surface} on look ${id}: listed rgb(${listed.rgb.map(Math.round).join(', ')}), ${entry.paint.rule} paints rgb(${painted.map(Math.round).join(', ')})`,
                );
            }
        }
    }
    return out;
}

/**
 * Every offence in `css` against the outline's shape: each `text-shadow`
 * whose shadows, custom properties substituted, include one in a ground's
 * colour — `var(--s-bg)`, `var(--rain-outline-ground)`, a literal any
 * shipped look's `--s-bg` equals, or any colour written with `var(--s-bg)`
 * in it or listed in `OUTLINE_GROUNDS` — must stand in a rule every
 * selector of which is scoped to a decoration, name its colour as
 * `var(--s-bg)` or `var(--rain-outline-ground)` and only one of them, blur
 * nothing, offset no more than two pixels, hold at most twenty such
 * shadows, and be exactly one of the two sets. Any other shadow beside it
 * (Neo's heading glow) is the look's own.
 */
function outlineOffences(
    css: string,
    defs: Map<string, string[]> = customProperties(css),
    runnersCss: string = servedCss(),
): string[] {
    const grounds = (defs.get('--s-bg') ?? []).map(literalRgb).filter((c): c is Rgb3 => c !== undefined);
    const isGroundLiteral = (token: string): boolean => {
        const rgb = literalRgb(token);
        return rgb !== undefined && grounds.some((g) => g.every((c, i) => c === rgb[i]));
    };
    const out: string[] = [];
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const frames = keyframeSpans(clean);
    for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        // A keyframe's frame is judged by the rules that run it (step 5a″,
        // the failing lamp's outlined flicker): each must be scoped to a
        // decoration, and a frame nothing runs is judged as unscoped.
        const frame = frames.find((f) => m.index! >= f.from && m.index! < f.to);
        const selectors =
            frame === undefined
                ? topLevel(m[1]!).map((sel) => sel.replace(/\s+/g, ' ').trim())
                : runnersOf(`${clean}\n${runnersCss}`, frame.name).length > 0
                  ? runnersOf(`${clean}\n${runnersCss}`, frame.name)
                  : [`@keyframes ${frame.name} (run by no rule)`];
        for (const d of declarationsOf(m[2]!).filter((decl) => decl.prop === 'text-shadow')) {
            for (const value of expansions(d.value.replace(/\s*!important\s*$/i, ''), defs)) {
                const shadows = topLevel(value).map((part) => {
                    const colour =
                        /var\(--s-bg\)|var\(--rain-outline-ground\)|#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|color-mix\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/.exec(
                            part,
                        )?.[0];
                    const lengths = part
                        .replace(colour ?? '', ' ')
                        .trim()
                        .split(/\s+/)
                        .filter((w) => w !== '');
                    return { part, colour, lengths };
                });
                const inGround = shadows.filter(
                    (sh) =>
                        sh.colour !== undefined &&
                        (OUTLINE_WRITTEN.has(sh.colour) ||
                            isGroundLiteral(sh.colour) ||
                            /var\(--s-bg\)/.test(sh.colour) ||
                            LISTED_GROUNDS.has(squash(sh.colour))),
                );
                if (inGround.length === 0) continue;
                const at = `${selectors.join(', ')} { text-shadow: ${d.value.replace(/\s+/g, ' ').slice(0, 80)} }`;
                const says = (why: string): void => {
                    out.push(`${at}: ${why}`);
                };
                if (!selectors.every((sel) => DECORATION_SCOPED.test(sel))) says('a shadow in the ground’s colour outside a decoration');
                if (inGround.some((sh) => !OUTLINE_WRITTEN.has(sh.colour!))) {
                    says('the ground written other than as var(--s-bg) or var(--rain-outline-ground)');
                }
                if (new Set(inGround.map((sh) => sh.colour)).size > 1) says('an outline in more than one colour');
                const px = (w: string | undefined): number | undefined =>
                    w === undefined ? 0 : /^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/.test(w) ? Number.parseFloat(w) : undefined;
                const read = inGround.map((sh) => sh.lengths.map(px));
                if (read.some((l) => l.length < 2 || l.length > 3 || l.some((n) => n === undefined))) {
                    says('a shadow whose offsets and blur do not read as pixels');
                    continue;
                }
                if (read.some((l) => (l[2] ?? 0) !== 0)) says('a blurred shadow in the ground’s colour');
                if (read.some((l) => Math.abs(l[0]!) > 2 || Math.abs(l[1]!) > 2)) says('an offset over two pixels');
                if (inGround.length > 20) says(`${inGround.length} shadows in the ground’s colour, over twenty`);
                if (outlineSet(read.map((l) => [l[0]!, l[1]!] as const)) === 0) says('neither outline set');
            }
        }
    }
    return out;
}

/**
 * Every served sheet, comments out, one after another: a keyframe is run by
 * a rule in any of them (the critic, step 5a″ item 4 — a look sheet may run
 * a keyframe stall.css declares), so its runners are looked for in all.
 */
function servedCss(): string {
    return SERVED.map((sheet) => sheet.css.replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
}

/** Where each `@keyframes` block of `css` begins and ends, by name. */
function keyframeSpans(css: string): { name: string; from: number; to: number }[] {
    const out: { name: string; from: number; to: number }[] = [];
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
        out.push({ name: m[1]!, from: m.index, to: i });
    }
    return out;
}

/** The selectors of every rule in `css` that runs the keyframes `name`, outside any `@keyframes`. */
function runnersOf(css: string, name: string): string[] {
    const spans = keyframeSpans(css);
    const out: string[] = [];
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (spans.some((f) => m.index! >= f.from && m.index! < f.to)) continue;
        const runs = declarationsOf(m[2]!)
            .filter((d) => d.prop === 'animation' || d.prop === 'animation-name')
            .some((d) => d.value.split(',').some((one) => one.trim().split(/\s+/).includes(name)));
        if (runs) out.push(...topLevel(m[1]!).map((sel) => sel.replace(/\s+/g, ' ').trim()));
    }
    return out;
}

/**
 * The text shadows a decoration-scoped rule may set besides the outline,
 * keyed `selector | the shadows left once the outline's are taken out`, each
 * with its reason. Anything else a decoration puts under a glyph — a dark
 * cloud (`0 0 20px #000` twice passed every guard until the critic's eighth
 * pass, item 7), a stroke, a paint order that lays one, a decoration line
 * thickened into a slab — is refused (`marksUnderText`).
 */
const DECORATION_GLOW: Readonly<Record<string, string>> = {
    '.stall.att-rainfall:not(.deck-stall) :is(.section-title, .collection-name) | 0 0 12px rgba(44, 233, 224, 0.5)':
        'Neo’s own heading glow (`.t-neo .section-title`), restated after the outline so the outline does not erase it: cyan, blurred, lighter than the ground, and outside the ring by construction',
    '.stall.att-hum .stall-name | 0 0 2px color-mix(in srgb, #ffffff 85%, var(--s-accent)), 0 0 6px color-mix(in srgb, var(--s-accent) 95%, transparent), 0 0 13px color-mix(in srgb, var(--s-accent) 65%, transparent), 0 0 26px color-mix(in srgb, var(--s-accent) 38%, transparent), 0 2px 18px color-mix(in srgb, var(--s-accent-2) 32%, transparent)':
        'the crest’s own art (round 13): a neon glow on the seller’s name, in the accents, on the sign’s own panel — the decoration is this shadow',
    '.stall.att-hum .sign-lamp | 0 0 2px color-mix(in srgb, #ffffff 85%, var(--s-accent)), 0 0 6px color-mix(in srgb, var(--s-accent) 95%, transparent), 0 0 13px color-mix(in srgb, var(--s-accent) 65%, transparent), 0 0 26px color-mix(in srgb, var(--s-accent) 38%, transparent)':
        'the failing lamp’s lit frames (`att-hum-gutter`): the crest’s glow on one grapheme',
    '.stall.att-hum .sign-lamp | 0 0 2px color-mix(in srgb, var(--s-accent) 30%, transparent), 0 0 5px color-mix(in srgb, var(--s-accent) 16%, transparent)':
        'the failing lamp’s dim frames (`att-hum-gutter`): the glow cut, the letter still lit',
    // Step 5a″, D14: the name outlined over Grid horizon keeps the glow it
    // wore before, restated after the outline so the outline does not erase it.
    '.stall.att-horizon:not(.deck-stall) .stall-name | 0 0 8px rgba(44, 233, 224, 0.9), 0 0 28px rgba(44, 233, 224, 0.5)':
        'Neo’s own sign glow (`.t-neo .stall-name`), restated after the outline over Grid horizon: cyan, blurred, lighter than the panel, and blanked with the glyph in the contrast pass (the name’s own glow is not its ground)',
    '.stall.att-horizon.att-hum:not(.deck-stall) .stall-name | 0 0 2px color-mix(in srgb, #ffffff 85%, var(--s-accent)), 0 0 6px color-mix(in srgb, var(--s-accent) 95%, transparent), 0 0 13px color-mix(in srgb, var(--s-accent) 65%, transparent), 0 0 26px color-mix(in srgb, var(--s-accent) 38%, transparent), 0 2px 18px color-mix(in srgb, var(--s-accent-2) 32%, transparent)':
        'the crest’s glow (`.stall.att-hum .stall-name`), restated after the outline where Grid horizon is worn with it',
    '.stall.att-horizon.att-hum:not(.deck-stall) .sign-lamp | 0 0 2px color-mix(in srgb, #ffffff 85%, var(--s-accent)), 0 0 6px color-mix(in srgb, var(--s-accent) 95%, transparent), 0 0 13px color-mix(in srgb, var(--s-accent) 65%, transparent), 0 0 26px color-mix(in srgb, var(--s-accent) 38%, transparent)':
        'the failing lamp’s lit frames with the outline under them (`att-hum-gutter-outlined`), where Grid horizon is worn with the crest',
    '.stall.att-horizon.att-hum:not(.deck-stall) .sign-lamp | 0 0 2px color-mix(in srgb, var(--s-accent) 30%, transparent), 0 0 5px color-mix(in srgb, var(--s-accent) 16%, transparent)':
        'the failing lamp’s dim frames with the outline under them (`att-hum-gutter-outlined`)',
};

/**
 * The shadows in `value` that are not the outline's, as written: a part is
 * the outline's when everything it can expand to is shadows in `--s-bg` or
 * `--rain-outline-ground` (whose shape `outlineOffences` holds, and whose
 * values `outlineGroundOffences` does), so a custom property hiding anything
 * else stays in the answer under its own name.
 */
function glowOf(value: string, defs: Map<string, string[]>): string {
    const inGround = (part: string): boolean =>
        expansions(part, defs).every((one) =>
            topLevel(one).every((shadow) => /var\(--s-bg\)|var\(--rain-outline-ground\)/.test(shadow)),
        );
    return topLevel(value)
        .filter((part) => !inGround(part))
        .join(', ');
}

/** A decoration line: underline, overline or a strike. */
const DRAWS_A_LINE = /\b(?:underline|overline|line-through)\b/;

/**
 * Every mark under text in `css` that a decoration-scoped rule sets — in the
 * rule, or through a keyframe it runs — other than the outline's shadows
 * (`outlineOffences` holds their shape) and the listed glows: a `text-shadow`
 * with anything else in it, a text stroke, a `paint-order` other than
 * `normal`, and a decoration line or its thickness.
 */
function marksUnderText(css: string, defs: Map<string, string[]> = customProperties(css)): string[] {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const frames = keyframesIn(clean);
    const out: string[] = [];
    for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectors = topLevel(m[1]!).map((sel) => sel.replace(/\s+/g, ' ').trim());
        if (!selectors.some((sel) => DECORATION_SCOPED.test(sel))) continue;
        const key = selectors.join(', ');
        const own = declarationsOf(m[2]!);
        const run = own
            .filter((d) => d.prop === 'animation' || d.prop === 'animation-name')
            .flatMap((d) => d.value.split(','))
            .flatMap((one) => one.trim().split(/\s+/))
            .filter((word) => frames.has(word))
            .flatMap((name) => declarationsOf(frames.get(name)!.replace(/[^{}]*\{|\}/g, ';')));
        for (const d of [...own, ...run]) {
            const value = d.value.replace(/\s*!important\s*$/i, '').replace(/\s+/g, ' ').trim();
            const at = `${key} { ${d.prop}: ${value.slice(0, 80)} }`;
            if (d.prop === 'text-shadow') {
                if (!paints(value, d.prop, defs)) continue;
                const rest = glowOf(value, defs);
                if (rest !== '' && DECORATION_GLOW[`${key} | ${rest}`] === undefined) {
                    out.push(`${at}: a shadow under text that is neither the outline nor a listed glow`);
                }
            } else if (/^(?:-webkit-)?text-stroke(?:-[a-z]+)?$/.test(d.prop)) {
                // A width alone strokes in the text's own colour.
                if (!/^(?:0(?:px)?|none|initial|unset|transparent)(?:\s|$)/.test(value) && d.prop !== '-webkit-text-stroke-color') {
                    out.push(`${at}: a stroke under text`);
                }
            } else if (d.prop === 'paint-order') {
                if (value !== 'normal' && value !== 'initial' && value !== 'unset') out.push(`${at}: a paint order that lays a stroke`);
            } else if (d.prop === 'text-decoration' || d.prop === 'text-decoration-line') {
                if (DRAWS_A_LINE.test(value)) out.push(`${at}: a decoration line under text`);
            } else if (d.prop === 'text-decoration-thickness') {
                if (!/^(?:auto|from-font|initial|unset)$/.test(value)) out.push(`${at}: a decoration line thickened into a slab`);
            }
        }
    }
    return out;
}

describe('an-outline-is-the-only-mark-under-text-on-a-decoration', () => {
    it('holds every served sheet to the outline’s shape, a private look\'s among them', async () => {
        expect(PRIVATE.length).toBeGreaterThan(0);
        for (const sheet of SERVED) {
            const css = sheet.css;
            expect(outlineOffences(css), sheet.path).toEqual([]);
        }
        // A planted private look whose decoration outlines in the ground's colour, three pixels out: red.
        const served = await plantedServed(`.${PLANTED_CLASS}.att-planted-trim .fine { text-shadow: 3px 3px 0 var(--s-bg); }`);
        const planted = privateRows(served).find((sheet) => sheet.lookClass === PLANTED_CLASS)!;
        expect(outlineOffences(planted.css)).not.toEqual([]);
    });

    it('lets no other mark under text on a decoration, in any served sheet, and lists every glow it lets', async () => {
        for (const sheet of SERVED) {
            const css = sheet.css;
            expect(marksUnderText(css), sheet.path).toEqual([]);
        }
        // A planted private look whose decoration puts a cloud under a line: red.
        const served = await plantedServed(`.${PLANTED_CLASS}.att-planted-trim .fine { text-shadow: 0 0 20px #000; }`);
        const planted = privateRows(served).find((sheet) => sheet.lookClass === PLANTED_CLASS)!;
        expect(marksUnderText(planted.css)).not.toEqual([]);
        // Every listed glow is a rule a served sheet still sets.
        const seen = new Set<string>();
        for (const sheet of SERVED) {
            const css = sheet.css.replace(/\/\*[\s\S]*?\*\//g, '');
            const defs = customProperties('');
            const frames = keyframesIn(css);
            for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
                const key = topLevel(m[1]!).map((sel) => sel.replace(/\s+/g, ' ').trim()).join(', ');
                const own = declarationsOf(m[2]!);
                const run = own
                    .filter((d) => d.prop === 'animation')
                    .flatMap((d) => d.value.split(/\s+/))
                    .filter((word) => frames.has(word))
                    .flatMap((name) => declarationsOf(frames.get(name)!.replace(/[^{}]*\{|\}/g, ';')));
                for (const d of [...own, ...run].filter((decl) => decl.prop === 'text-shadow')) {
                    seen.add(`${key} | ${glowOf(d.value.replace(/\s+/g, ' ').trim(), defs)}`);
                }
            }
        }
        expect(Object.keys(DECORATION_GLOW).filter((key) => !seen.has(key))).toEqual([]);
    });

    it('refuses a dark cloud, a stroke, a paint order and a decoration slab under text on a decoration', () => {
        for (const planted of [
            // The critic's eighth pass, item 7: a shadow in no ground's colour.
            '.stall.att-rainfall .fine { text-shadow: 0 0 20px #000, 0 0 20px #000; }',
            // The outline with a dark cloud beside it.
            '.stall.att-rainfall .fine { text-shadow: var(--rain-outline-1), 0 0 8px rgba(0, 0, 0, 0.9); }',
            // The listed glow on a line it was not listed for.
            '.stall.att-rainfall .fine { text-shadow: var(--rain-outline-2), 0 0 12px rgba(44, 233, 224, 0.5); }',
            // Through a custom property and through a keyframe.
            '.x { --wk-cloud: 0 0 6px black; } .stall.att-rainfall .fine { text-shadow: var(--wk-cloud); }',
            '@keyframes wk-c { to { text-shadow: 0 0 4px #111; } } .stall.att-rainfall .fine { animation: wk-c 1s; }',
            // A stroke, both spellings, and one handed through a var.
            '.stall.att-rainfall .fine { -webkit-text-stroke: 3px #05060d; }',
            '.stall.att-rainfall .fine { -webkit-text-stroke-width: 2px; }',
            '.stall.att-rainfall .fine { paint-order: stroke fill; }',
            // A decoration line thickened into a slab under the words.
            '.stall.att-rainfall .fine { text-decoration: underline 1em #05060d; }',
            '.stall.att-rainfall .fine { text-decoration-line: line-through; }',
            '.stall.att-rainfall .fine { text-decoration-thickness: 0.9em; }',
        ]) {
            expect(marksUnderText(planted), planted).not.toEqual([]);
        }
        // The outline alone, the listed glow on its own line, and nothing at all pass.
        expect(marksUnderText('.stall.att-rainfall .fine { text-shadow: var(--rain-outline-2); }')).toEqual([]);
        expect(
            marksUnderText(
                '.stall.att-rainfall:not(.deck-stall) :is(.section-title, .collection-name) { text-shadow: var(--rain-outline-2), 0 0 12px rgba(44, 233, 224, 0.5); }',
            ),
        ).toEqual([]);
        expect(
            marksUnderText(
                '.stall.att-rainfall .fine { text-shadow: none; -webkit-text-stroke: 0; paint-order: normal; text-decoration: none; text-decoration-thickness: auto; }',
            ),
        ).toEqual([]);
        // Outside a decoration, not this test's: a look's own glow.
        expect(marksUnderText('.t-neo .x { text-shadow: 0 0 20px #000; }')).toEqual([]);
    });

    it('states the two sets once, on the rain and each surface it matches, in the ground’s colour, as the probe reads them', () => {
        const defs = customProperties('');
        const setOf = (name: string): number => {
            const [value, ...more] = expansions(`var(${name})`, defs);
            expect(more, name).toEqual([]);
            const offsets = topLevel(value!).map((part) => {
                const [x, y, blur] = part.replace('var(--rain-outline-ground)', '').trim().split(/\s+/).map((w) => Number.parseFloat(w));
                expect(part, name).toContain('var(--rain-outline-ground)');
                expect(blur, name).toBe(0);
                return [x!, y!] as const;
            });
            return outlineSet(offsets);
        };
        expect(setOf('--rain-outline-1')).toBe(1);
        expect(setOf('--rain-outline-2')).toBe(2);
        expect(OUTLINE_1).toHaveLength(8);
        expect(OUTLINE_2).toHaveLength(20);
        expect(OUTLINE_2_UNDER_PX).toBe(14);
        // Declared once, in one rule: on the decoration's own root and on
        // every surface OUTLINE_GROUNDS lists — a custom property is resolved
        // where it is declared, so a surface's own colour is read only where
        // the sets are declared again — and in no other served sheet.
        for (const sheet of SERVED) {
            const css = sheet.css.replace(/\/\*[\s\S]*?\*\//g, '');
            for (const name of ['--rain-outline-1', '--rain-outline-2']) {
                const at = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => declarationsOf(m[2]!).some((d) => d.prop === name));
                const expected =
                    sheet.path === 'src/ui/stall.css'
                        ? [
                              [
                                  RAIN_ROOT,
                                  `${RAIN_SCOPE} :is(${Object.entries(OUTLINE_GROUNDS)
                                      .filter(([, g]) => g.scope === undefined)
                                      .map(([key]) => key)
                                      .join(', ')})`,
                                  ...groundRows(OUTLINE_GROUNDS)
                                      .filter((row) => row.scope !== RAIN_SCOPE && row.state === '')
                                      .map((row) => row.selector),
                              ].join(', '),
                          ]
                        : [];
                expect(at.map((m) => topLevel(m[1]!).map(squash).join(', ')), `${sheet.path} ${name}`).toEqual(expected);
            }
        }
    });

    it('declares every outline colour it paints: the look’s ground on the rain, and each tinted surface’s own paint, listed', async () => {
        for (const sheet of SERVED) {
            const css = sheet.css;
            expect(outlineGroundOffences(css), sheet.path).toEqual([]);
        }
        // A planted private look that gives the outline a colour of its own: red.
        const served = await plantedServed(`.${PLANTED_CLASS} { --rain-outline-ground: #05060d; }`);
        const planted = privateRows(served).find((sheet) => sheet.lookClass === PLANTED_CLASS)!;
        expect(outlineGroundOffences(planted.css)).not.toEqual([]);
        // Every listed surface is declared, and nothing else is.
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        const declared = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
            .filter((m) => declarationsOf(m[2]!).some((d) => d.prop === '--rain-outline-ground'))
            .map((m) => squash(m[1]!));
        expect(declared.sort()).toEqual([RAIN_ROOT, ...groundRows(OUTLINE_GROUNDS).map((row) => row.selector)].sort());
        for (const planted of [
            // A literal, even the right one.
            `${RAIN_SCOPE} [data-role='list-first'] { --rain-outline-ground: rgb(11, 42, 47); }`,
            // One surface's colour on another.
            `${RAIN_SCOPE} .event-txid { --rain-outline-ground: color-mix(in srgb, var(--s-accent) 16%, var(--s-bg)); }`,
            // A surface the list does not name, and the plain ground in another colour.
            `${RAIN_SCOPE} .stall-foot .fine { --rain-outline-ground: color-mix(in srgb, var(--s-muted) 12%, var(--s-bg)); }`,
            `${RAIN_ROOT} { --rain-outline-ground: #05060d; }`,
            // Off the rain, two selectors in one rule, and in a keyframe.
            '.stall { --rain-outline-ground: var(--s-bg); }',
            `${RAIN_ROOT}, ${RAIN_SCOPE} .notice-invite { --rain-outline-ground: var(--s-bg); }`,
            '@keyframes wk-g { to { --rain-outline-ground: var(--s-bg); } }',
        ]) {
            expect(outlineGroundOffences(planted), planted).not.toEqual([]);
        }
        // A listed colour that is no color-mix, that reads a variable no look
        // owns, or that carries a literal the surface does not paint or a
        // token carries.
        const withCta = (colour: string): Record<string, OutlineGround> => ({
            ...OUTLINE_GROUNDS,
            "[data-role='list-first']": { ...OUTLINE_GROUNDS["[data-role='list-first']"]!, colour },
        });
        for (const colour of [
            'rgb(11, 42, 47)',
            'color-mix(in srgb, var(--wk-cyan) 16%, var(--s-bg))',
            'color-mix(in srgb, #123456 16%, var(--s-bg))',
            'color-mix(in srgb, #2ce9e0 16%, var(--s-bg))',
        ]) {
            expect(outlineGroundOffences('', withCta(colour)), colour).not.toEqual([]);
        }
        expect(outlineGroundOffences(`${RAIN_ROOT} { --rain-outline-ground: var(--s-bg); }`)).toEqual([]);
    });

    it('holds each listed colour to the paint of the surface it names, on every look that wears the rain', () => {
        expect(RAIN_LOOKS).toEqual([NEO_CITY_THEME_ID]);
        expect(outlineGroundMismatches()).toEqual([]);
        // The call to action repainted at 20%, the notice's violet moved, and
        // the pill's tint read from a rule that paints none.
        const real = (path: string): string => readFileSync(join(UI_DIR, '..', '..', path), 'utf8');
        const neo = real('src/ui/theme-neo.css');
        expect(neo).toContain('background: rgba(44, 233, 224, 0.16);');
        expect(neo).toContain('rgba(139, 123, 255, 0.1)');
        for (const [path, from, to] of [
            ['src/ui/theme-neo.css', 'background: rgba(44, 233, 224, 0.16);', 'background: rgba(44, 233, 224, 0.2);'],
            ['src/ui/theme-neo.css', 'rgba(139, 123, 255, 0.1)', 'rgba(100, 123, 255, 0.1)'],
            ['src/ui/stall.css', 'background: color-mix(in srgb, var(--s-muted) 12%, transparent);', 'color: var(--s-muted);'],
        ] as const) {
            const planted = (p: string): string => (p === path ? real(p).replace(from, to) : real(p));
            expect(real(path)).toContain(from);
            expect(outlineGroundMismatches(OUTLINE_GROUNDS, planted), `${path}: ${to}`).not.toEqual([]);
        }
        // The sign under Grid horizon (step 5a″, D14): its panel's top stop
        // moved, the listed colour moved to another pair of stops, and the
        // layer named but not in the rule — each refused.
        expect(looksOfScope(HORIZON_SCOPE)).toEqual([NEO_CITY_THEME_ID]);
        const panel = 'linear-gradient(180deg, #101a2c 0%, #0a1120 55%, #070c17 100%)';
        expect(neo).toContain(panel);
        const movedStop = (p: string): string => (p === 'src/ui/theme-neo.css' ? real(p).replace(panel, panel.replace('#101a2c', '#2a3a5c')) : real(p));
        expect(outlineGroundMismatches(OUTLINE_GROUNDS, movedStop)).not.toEqual([]);
        const sign = OUTLINE_GROUNDS['.stall-sign']!;
        expect(outlineGroundMismatches({ '.stall-sign': { ...sign, colour: 'color-mix(in srgb, #0a1120, #070c17)' } })).not.toEqual([]);
        expect(outlineGroundMismatches({ '.stall-sign': { ...sign, paint: { ...sign.paint, rule: '.t-neo .stall-sign' } } })).not.toEqual([]);
        // The tagline: the sink's share moved, and the plain panel colour
        // listed where the paint says it is sunk — each refused.
        const tagline = OUTLINE_GROUNDS['.stall-tagline']!;
        expect(outlineGroundMismatches({ '.stall-tagline': { ...tagline, paint: { ...tagline.paint, sunk: 0.25 } } })).not.toEqual([]);
        expect(outlineGroundMismatches({ '.stall-tagline': { ...tagline, colour: sign.colour } })).not.toEqual([]);
    });

    it('refuses every other mark in the ground’s colour, and passes the outline with the look’s glow beside it', () => {
        const O1 = '1px 0 0 var(--s-bg), -1px 0 0 var(--s-bg), 0 1px 0 var(--s-bg), 0 -1px 0 var(--s-bg), 1px 1px 0 var(--s-bg), 1px -1px 0 var(--s-bg), -1px 1px 0 var(--s-bg), -1px -1px 0 var(--s-bg)';
        for (const planted of [
            // Outside a decoration, directly and through a var defined elsewhere.
            '.stall .fine { text-shadow: var(--rain-outline-2); }',
            '.x { --wk-o: 1px 0 0 var(--s-bg); } .stall .fine { text-shadow: var(--wk-o); }',
            // A glow — the halo round 7 withdrew — and a shadow too far out.
            '.stall.att-rainfall .fine { text-shadow: 0 0 3px var(--s-bg); }',
            '.stall.att-rainfall .fine { text-shadow: 3px 0 0 var(--s-bg); }',
            // The ground as a literal, and a partial set.
            `.stall.att-rainfall .fine { text-shadow: ${O1.replaceAll('var(--s-bg)', '#05060d')}; }`,
            '.stall.att-rainfall .fine { text-shadow: 1px 0 0 var(--s-bg), -1px 0 0 var(--s-bg); }',
            // A cloud of shadows past twenty: two copies of the two-pixel set.
            '.stall.att-rainfall .fine { text-shadow: var(--rain-outline-2), var(--rain-outline-2); }',
            // In a keyframe, whose selectors are no decoration's.
            '@keyframes wk-o { to { text-shadow: var(--rain-outline-1); } }',
            // A surface's colour written into the shadow rather than through
            // the parameter, and an outline in two colours at once.
            `.stall.att-rainfall .cta { text-shadow: ${O1.replaceAll('var(--s-bg)', 'color-mix(in srgb, var(--s-accent) 16%, var(--s-bg))')}; }`,
            `.stall.att-rainfall .fine { text-shadow: ${O1.replace('var(--s-bg)', 'var(--rain-outline-ground)')}; }`,
        ]) {
            expect(outlineOffences(planted), planted).not.toEqual([]);
        }
        expect(outlineOffences(`.stall.att-rainfall .fine { text-shadow: ${O1.replaceAll('var(--s-bg)', 'var(--rain-outline-ground)')}; }`)).toEqual([]);
        expect(outlineOffences(`.stall.att-rainfall .fine { text-shadow: ${O1}; }`)).toEqual([]);
        expect(outlineOffences('.stall.att-rainfall .fine { text-shadow: var(--rain-outline-2), 0 0 12px rgba(44, 233, 224, 0.5); }')).toEqual([]);
        // A shadow in another colour is the look's own and not this test's.
        expect(outlineOffences('.t-neo .x { text-shadow: 0 0 12px rgba(44, 233, 224, 0.5); }')).toEqual([]);
        // A keyframe's frame is judged by the rules that run it (step 5a″,
        // the failing lamp's outlined flicker): run by a decoration, it is
        // the outline; run by a look, or by nothing, it is refused.
        const frame = '@keyframes wk-o { to { text-shadow: var(--rain-outline-1); } }';
        expect(outlineOffences(`${frame} .stall.att-horizon .x { animation: wk-o 1s; }`)).toEqual([]);
        expect(outlineOffences(`${frame} .t-neo .x { animation: wk-o 1s; }`)).not.toEqual([]);
        expect(outlineOffences(`${frame} .stall.att-horizon .x { animation: wk-o 1s; } .t-neo .y { animation: wk-o 1s; }`)).not.toEqual([]);
        // A runner in another sheet counts (step 5a″ item 4): the frame in
        // one sheet, a look sheet running it in another, refused; the
        // shipped outlined flicker run by a look sheet, refused too.
        expect(outlineOffences(frame, undefined, '.stall.att-horizon .x { animation: wk-o 1s; }')).toEqual([]);
        expect(outlineOffences(frame, undefined, '.stall.att-horizon .x { animation: wk-o 1s; } .t-neo .y { animation: wk-o 1s; }')).not.toEqual([]);
        const stall = readFileSync(join(UI_DIR, 'stall.css'), 'utf8');
        expect(outlineOffences(stall, undefined, `${servedCss()}\n.t-neo .sign-lamp { animation: att-hum-gutter-outlined 7s linear infinite; }`)).not.toEqual([]);
    });

    it('runs the lamp’s outlined flicker frame for frame as the plain one, the outline under every glow', () => {
        // Step 5a″ item 5: `att-hum-gutter-outlined` is `att-hum-gutter`
        // with `var(--rain-outline-1)` first in every frame's shadow, and
        // nothing else — a drifted copy would flicker differently over the
        // horizon than off it.
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        const frames = keyframesIn(css);
        const plain = frames.get('att-hum-gutter');
        const outlined = frames.get('att-hum-gutter-outlined');
        expect(plain).toBeDefined();
        expect(outlined).toBeDefined();
        const norm = (body: string): string => squash(body.replace(/\s+/g, ' '));
        expect(norm(outlined!)).toBe(norm(plain!.replace(/text-shadow:\s*/g, 'text-shadow: var(--rain-outline-1), ')));
        expect((outlined!.match(/var\(--rain-outline-1\)/g) ?? []).length).toBe((plain!.match(/text-shadow:/g) ?? []).length);
    });
});

/** The states a pointer or a keyboard puts a surface in, as pseudo-classes. */
const STATE_WORD = ':(?:hover|focus-visible|focus-within|focus|active)(?![\\w-])';

/** A selector split at its last top-level combinator: everything before, and its last compound. */
function lastCompound(selector: string): { head: string; last: string } {
    let depth = 0;
    let cut = -1;
    for (let i = 0; i < selector.length; i += 1) {
        const c = selector[i]!;
        if (c === '(') depth += 1;
        if (c === ')') depth -= 1;
        if (depth === 0 && /[\s>+~]/.test(c)) cut = i;
    }
    return { head: selector.slice(0, cut + 1), last: selector.slice(cut + 1) };
}

/** Every `:has(…)` in a compound, balanced, as written. */
function hasClauses(compound: string): string[] {
    const out: string[] = [];
    for (let at = compound.indexOf(':has('); at >= 0; at = compound.indexOf(':has(', at + 1)) {
        let depth = 0;
        for (let i = at + ':has'.length; i < compound.length; i += 1) {
            if (compound[i] === '(') depth += 1;
            if (compound[i] === ')') depth -= 1;
            if (depth === 0) {
                out.push(compound.slice(at, i + 1));
                break;
            }
        }
    }
    return out;
}

/**
 * A selector's last compound with its states taken out — each bare state
 * pseudo-class, and an `:is()` or `:where()` holding nothing else — and the
 * states as written, whitespace dropped. **A state anywhere else is a state
 * too** (the critic, 2026-09-25, item 9): on an ancestor
 * (`.stall-foot:hover .notice-invite`) it repaints the surface when a
 * pointer is over the ancestor, and inside a `:has()`
 * (`.notice-invite:has(:focus-visible)`) when a descendant is focused. Both
 * are taken out of `base` and `last` so the surface is still recognised,
 * and named in `elsewhere`, because the outline's colour is declared on the
 * surface with the state after it and neither shape can be listed so.
 */
function withoutStates(selector: string): { base: string; last: string; state: string; elsewhere: string } {
    const { head, last } = lastCompound(squash(selector));
    const hasState = new RegExp(STATE_WORD);
    let elsewhere = '';
    let within = last;
    for (const clause of hasClauses(last)) {
        if (hasState.test(clause)) {
            elsewhere += clause.replace(/\s+/g, '');
            within = within.replace(clause, '');
        }
    }
    let ancestors = head;
    if (hasState.test(head)) {
        elsewhere += head.replace(/\s+/g, '');
        ancestors = head.replace(new RegExp(STATE_WORD, 'g'), '');
    }
    let state = '';
    const take = (whole: string): string => {
        state += whole.replace(/\s+/g, '');
        return '';
    };
    const bare = within
        .replace(new RegExp(`:(?:is|where)\\(\\s*${STATE_WORD}(?:\\s*,\\s*${STATE_WORD})*\\s*\\)`, 'g'), take)
        .replace(new RegExp(STATE_WORD, 'g'), take);
    return { base: squash(`${ancestors}${bare}`), last: bare, state, elsewhere };
}

/**
 * A compound's simple selectors that name WHAT it matches — its classes,
 * ids and attribute tests, quotes normalised — with everything inside a
 * `:not(…)` left out, since that names what it does not match.
 */
function simpleSet(compound: string): Set<string> {
    let bare = compound;
    for (let at = bare.indexOf(':not('); at >= 0; at = bare.indexOf(':not(')) {
        let depth = 0;
        let end = at + ':not'.length;
        for (; end < bare.length; end += 1) {
            if (bare[end] === '(') depth += 1;
            if (bare[end] === ')') depth -= 1;
            if (depth === 0) break;
        }
        bare = bare.slice(0, at) + bare.slice(end + 1);
    }
    return new Set([...bare.matchAll(/[.#][\w-]+|\[[^\]]+\]/g)].map((m) => m[0].replace(/\s+/g, '').replace(/"/g, "'")));
}

/**
 * Whether a rule's last compound is the surface a key names, **by set, not
 * by string** (CARRYOVER-2 item 11): every class, id and attribute test the
 * key's own compound carries is on the rule's compound, in any order and
 * beside any others — `.ghost.notice-invite` is `.notice-invite`, and
 * `[data-role="list-first"]` is `[data-role='list-first']`. A rule matching
 * the exact string alone let a surface repainted under an extra class, or
 * with its quotes written the other way, through unlisted.
 */
function coversSurface(last: string, surface: string): boolean {
    const want = simpleSet(lastCompound(squash(surface)).last);
    if (want.size === 0) return false;
    const have = simpleSet(last);
    return [...want].every((part) => have.has(part));
}

/** The look classes of the looks that wear the rain; a rule scoped to any other look's class never paints under it. */
const RAIN_LOOK_CLASSES: ReadonlySet<string> = new Set(RAIN_LOOKS.map((id) => decodeTheme(id).sheetClass));

/**
 * Every rule in `sheets` that repaints a surface `table` lists in a state —
 * a `background` or its colour or image, under a selector whose last
 * compound carries `:hover`, `:focus`, `:focus-visible`, `:focus-within` or
 * `:active` and is, with those taken out, the surface's paint rule or the
 * surface as the outline rules name it — with the state as written. A rule
 * scoped to a look that does not wear the rain is not one.
 */
function statesOfListedSurfaces(
    sheets: readonly { path: string; css: string }[],
    table: Readonly<Record<string, OutlineGround>> = OUTLINE_GROUNDS,
): { path: string; selector: string; surface: string; state: string; elsewhere: string }[] {
    const out: { path: string; selector: string; surface: string; state: string; elsewhere: string }[] = [];
    for (const { path, css } of sheets) {
        for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            if (!declarationsOf(m[2]!).some((d) => /^background(?:-color|-image)?$/.test(d.prop))) continue;
            for (const selector of topLevel(m[1]!).map(squash)) {
                const looks = [...selector.matchAll(/\.(t-[a-z0-9]+)(?![\w-])/g)].map((l) => l[1]!);
                if (looks.some((cls) => !RAIN_LOOK_CLASSES.has(cls))) continue;
                const { base, last, state, elsewhere } = withoutStates(selector);
                if (state === '' && elsewhere === '') continue;
                for (const [surface, entry] of Object.entries(table)) {
                    if (base === entry.paint.rule || coversSurface(last, surface) || coversSurface(last, entry.paint.rule)) {
                        out.push({ path, selector, surface, state, elsewhere });
                    }
                }
            }
        }
    }
    return out;
}

/**
 * Every state that repaints a listed surface (`statesOfListedSurfaces`)
 * whose outline colour is not declared: the table must list that state for
 * the surface, painted by that very rule, and `stall` must give
 * `--rain-outline-ground` the listed colour under the surface with the
 * state on it — or the outline stays the resting wash's colour on a
 * different wash, and shows.
 */
function statesWithoutOutline(
    sheets: readonly { path: string; css: string }[],
    stall: string,
    table: Readonly<Record<string, OutlineGround>> = OUTLINE_GROUNDS,
): string[] {
    const declared = new Map<string, string[]>();
    for (const m of stall.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        for (const d of declarationsOf(m[2]!).filter((decl) => decl.prop === '--rain-outline-ground')) {
            for (const selector of topLevel(m[1]!).map(squash)) {
                declared.set(selector, [...(declared.get(selector) ?? []), squash(d.value)]);
            }
        }
    }
    const out: string[] = [];
    for (const { path, selector, surface, state, elsewhere } of statesOfListedSurfaces(sheets, table)) {
        const at = `${path}: ${selector} repaints ${surface}`;
        if (elsewhere !== '') {
            // The outline's colour is declared on the surface with its state
            // after it; a state on an ancestor or inside `:has()` cannot be
            // listed so, and is refused rather than let through unlisted.
            out.push(`${at} in a state on an ancestor or inside :has() (${elsewhere}); put the state on the surface, where its outline colour can be listed`);
            continue;
        }
        const listed = table[surface]?.states?.[state];
        if (listed === undefined) {
            out.push(`${at}, and OUTLINE_GROUNDS lists no outline colour for ${surface}${state}`);
            continue;
        }
        if (squash(listed.rule) !== selector) out.push(`${at}, and OUTLINE_GROUNDS holds ${surface}${state} to ${listed.rule}`);
        const values = declared.get(`${RAIN_SCOPE} ${surface}${state}`) ?? [];
        if (values.length === 0) out.push(`${at}, and stall.css declares no outline colour for ${surface}${state}`);
        if (values.some((value) => value !== squash(listed.colour))) {
            out.push(`${at}, and stall.css declares ${surface}${state}'s outline other than the listed ${listed.colour}`);
        }
    }
    return out;
}

describe('every-state-of-a-listed-surface-has-its-outline-colour', () => {
    /**
     * The critic's final merge, item 2. A surface the outline lists wears
     * its own resting paint as the outline's colour (option (b)); where a
     * pointer or a keyboard repaints that surface, the outline must follow,
     * or it shows as a ring of the resting wash on the new one — the notice
     * invite's 4% under its 9% hover was about 13 levels off. The probe reads
     * surfaces at rest only (`an-outline-that-shows-at-rest`), so the states
     * are held here, from source: every `:hover`, `:focus`,
     * `:focus-visible`, `:focus-within` or `:active` rule in a served sheet
     * that changes a listed surface's background carries a listed outline
     * colour, declared in `stall.css` on that surface in that state, and
     * held to that rule's paint (`outlineGroundMismatches`). A state on an
     * ancestor or inside `:has()` is a state too, and is refused: the
     * outline's colour cannot be listed on such a selector.
     */
    const sheets = SERVED.map((sheet) => ({ path: sheet.path, css: sheet.css }));
    const stall = readFileSync(join(UI_DIR, 'stall.css'), 'utf8');

    it('finds every state that repaints a listed surface, and each carries its listed colour', () => {
        expect(statesWithoutOutline(sheets, stall)).toEqual([]);
        // It reads something: the invite's hover is found, and the other
        // looks' hovers on the same surface are not the rain's.
        expect(statesOfListedSurfaces(sheets).map((s) => `${s.path} ${s.selector}`)).toEqual([
            'src/ui/theme-neo.css .t-neo .notice-invite:hover',
        ]);
    });

    it('goes red without the declaration, without the listing, and on a state nobody listed', () => {
        const without = stall.replace(/\.stall\.att-rainfall:not\(\.deck-stall\) \.notice-invite:hover \{[^}]*\}/, '');
        expect(without).not.toBe(stall);
        expect(statesWithoutOutline(sheets, without)).not.toEqual([]);
        const wrong = stall.replace(
            'color-mix(in srgb, var(--s-accent-2) 9%, var(--s-bg))',
            'color-mix(in srgb, var(--s-accent-2) 4%, var(--s-bg))',
        );
        expect(wrong).not.toBe(stall);
        expect(statesWithoutOutline(sheets, wrong)).not.toEqual([]);
        const { states: _unlisted, ...bare } = OUTLINE_GROUNDS['.notice-invite']!;
        expect(statesWithoutOutline(sheets, stall, { ...OUTLINE_GROUNDS, '.notice-invite': bare })).not.toEqual([]);
        for (const planted of [
            '.t-neo .cta:focus-visible { background: rgba(44, 233, 224, 0.3); }',
            '.event-txid:is(:hover, :focus-visible) { background-color: rgba(0, 0, 0, 0.2); }',
            '.t-neo .notice-invite:active { background: rgba(255, 77, 122, 0.2); }',
            '.t-neo .studio-browser:focus-within { background-image: linear-gradient(red, blue); }',
            // A state on an ancestor repaints the surface as surely as its
            // own, and so does one inside `:has()` (the critic, 2026-09-25,
            // item 9): this test pinned the first as silent, and read the
            // second as `:has()` with nothing in it.
            '.t-neo .stall-foot:hover .notice-invite { background: rgba(0, 0, 0, 0.2); }',
            '.t-neo .notice-invite:has(:focus-visible) { background: rgba(255, 77, 122, 0.2); }',
            '.t-neo .stall-foot:has(:hover) .notice-invite { background-color: rgba(0, 0, 0, 0.2); }',
            '.t-neo .notice:is(:hover, :focus-within) .notice-invite { background: rgba(0, 0, 0, 0.2); }',
            // The surface by its class set, not its string (CARRYOVER-2 item
            // 11): an extra class, another order, the other quotes.
            '.t-neo .ghost.notice-invite:hover { background: rgba(0, 0, 0, 0.2); }',
            '.t-neo .notice-invite.is-open:focus-visible { background-color: rgba(255, 77, 122, 0.2); }',
            '.t-neo [data-role="list-first"]:hover { background: rgba(44, 233, 224, 0.3); }',
            '.t-neo .cta.wide:active { background: rgba(44, 233, 224, 0.3); }',
        ]) {
            expect(statesWithoutOutline([...sheets, { path: 'planted', css: planted }], stall), planted).not.toEqual([]);
        }
        // Not a background, not a listed surface, or a look that does not
        // wear the rain: nothing to answer.
        for (const planted of [
            '.t-neo .cta:hover { box-shadow: 0 0 16px rgba(44, 233, 224, 0.35); }',
            '.t-modern .notice-invite:hover { background: #eee; }',
            '.t-neo .item:hover { background: rgba(0, 0, 0, 0.2); }',
            '.t-modern .stall-foot:hover .notice-invite { background: #eee; }',
            '.t-neo .notice-invite:has(.chip) { background: rgba(255, 77, 122, 0.04); }',
            // A look-alike class is not the surface.
            '.t-neo .notice-invite-x:hover { background: rgba(0, 0, 0, 0.2); }',
        ]) {
            expect(statesWithoutOutline([...sheets, { path: 'planted', css: planted }], stall), planted).toEqual([]);
        }
        // The colour a state lists is held to the paint it names, like a resting one's.
        const neo = (path: string): string => readFileSync(join(UI_DIR, '..', '..', path), 'utf8');
        const planted = (path: string): string =>
            path === 'src/ui/theme-neo.css' ? neo(path).replace('background: rgba(255, 77, 122, 0.09);', 'background: rgba(255, 77, 122, 0.14);') : neo(path);
        expect(neo('src/ui/theme-neo.css')).toContain('background: rgba(255, 77, 122, 0.09);');
        expect(outlineGroundMismatches(OUTLINE_GROUNDS, planted)).not.toEqual([]);
    });
});
