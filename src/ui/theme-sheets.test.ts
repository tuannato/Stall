/**
 * The stylesheet/table contract, in both directions — and the one rule of
 * mixing the review distilled.
 *
 * The same declaration is expressible in three places (the var table consumed
 * by stall.css, and the three per-look sheets), and the cascade decides
 * silently. `scripts/audit-shadowing.mjs` is the measuring tool for what
 * actually wins; these tests hold the two invariants a green audit relies on:
 * every emitted var is read somewhere, and every read var is emitted. Neither
 * direction alone was enough — the emit-side test stayed green while
 * `--s-card-sheen`'s only reader lived in theme-neo.css, and nothing at all
 * watched for a read of a var nobody emits, which is how a rename in the
 * table would quietly turn a working rule into `var(--s-nothing)`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SERVED_SHEETS, appSheets } from '../../scripts/sheet-roles.mjs';
import {
    DEFAULT_THEME_ID,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    decodeTheme,
    themeVars,
} from '../domain/theme';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/**
 * Every sheet this app serves — the base, the three looks and the
 * screen-owned sheets — from the one role table (`scripts/sheet-roles.mjs`,
 * held to the tree by `every-served-sheet-is-on-the-guard-list`), so a sheet
 * added to the app is a sheet these guards read. Everything but the base is
 * also what the ink-over-ground rule is measured on: the looks, and the
 * screen sheets that carry their own palette decisions.
 */
const SHEETS = appSheets().map((sheet) => sheet.path);
const NOT_BASE = appSheets()
    .filter((sheet) => sheet.role !== 'base')
    .map((sheet) => sheet.path);

const stripped = (file: string): string =>
    readFileSync(join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const allCss = (): string => SHEETS.map(stripped).join('\n');

/** The emitted key set is identical per look, but union anyway: an id that
 *  ever emitted a key the others do not must still have that key consumed. */
const emittedNames = (): Set<string> => {
    const names = new Set<string>();
    for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
        for (const key of Object.keys(themeVars(decodeTheme(id)))) names.add(key);
    }
    return names;
};

describe('every-theme-var-reaches-the-stylesheet', () => {
    /**
     * `--s-accent-2` was emitted on every paint and read by no rule, so
     * `accentTwo` in the shipped table painted nothing: a seller publishing a
     * two-colour look got one colour and no way to tell why. Widened by the
     * 2026-08-30 review from stall.css alone to every sheet in SHEETS — the pivot
     * moved some consumers into the theme files (`--s-card-sheen` lives in
     * theme-neo.css's background stack), and the one-file version would have
     * called every such var dead.
     */
    it('consumes every --s-* the table emits, in a sheet or another emitted value', () => {
        const css = allCss();
        // A var may also be consumed inside another emitted value —
        // --s-shade exists only inside the shadow strings the table itself
        // emits, and calling that dead would ban the pattern that lets a
        // mood re-ink elevation.
        const values = [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]
            .map((id) => Object.values(themeVars(decodeTheme(id))).join(' '))
            .join(' ');
        const emitted = emittedNames();
        expect(emitted.size).toBeGreaterThan(0);
        for (const name of emitted) {
            expect(
                css.includes(`var(${name})`) || values.includes(`var(${name})`),
                `${name} is emitted on every paint and read by no rule`,
            ).toBe(true);
        }
    });
});

describe('no-stylesheet-reads-a-var-nobody-emits', () => {
    /**
     * The reverse direction. A read with no emitter resolves to nothing and
     * the declaration silently falls back or dies — which is a repaint of the
     * `--s-accent-2` failure with the files swapped, and exactly what a table
     * rename leaves behind.
     */
    it('finds an emitter for every --s-* any sheet reads', () => {
        const css = allCss();
        const emitted = emittedNames();
        // A sheet may define its own custom property and read it back; none
        // do today, but a local definition is a legal emitter.
        const local = new Set(
            [...css.matchAll(/(--s-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
        );
        const reads = new Set(
            [...css.matchAll(/var\(\s*(--s-[a-z0-9-]+)/g)].map((m) => m[1]),
        );
        expect(reads.size).toBeGreaterThan(0);
        for (const name of reads) {
            expect(
                emitted.has(name) || local.has(name),
                `${name} is read by a rule and emitted by nothing`,
            ).toBe(true);
        }
    });
});

describe('a-var-read-at-rest-resolves-at-rest', () => {
    /**
     * The general form of the test above, for every custom property and not
     * just the `--s-*` table — with the one exclusion that makes it a guard:
     * a declaration inside `@keyframes` does not count. `--att-sun-angle`
     * lived only in its keyframe, which left `var()` guaranteed-invalid at
     * rest, which made the whole Sunburst `background-image` stack —
     * `--s-backdrop` included — invalid at computed-value time. The
     * decoration shipped painting nothing, and the billboard guard counted
     * the removed paint as "a change".
     *
     * A legal resolver is one of: the `themeVars` table, a declaration in a
     * real rule (keyframe steps excluded — `parseRules` already skips
     * at-rule bodies), or an `@property` registration that carries an
     * `initial-value` (registration without one changes nothing at rest).
     */
    it('every var() read has a value outside @keyframes', () => {
        const css = allCss();
        const emitted = emittedNames();
        const rules = parseRules(css);
        const atRest = new Set<string>();
        for (const rule of rules) {
            for (const m of rule.body.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
                atRest.add(m[1]!);
            }
        }
        const registered = new Set<string>();
        for (const m of css.matchAll(/@property\s+(--[a-z0-9-]+)\s*\{([^}]*)\}/g)) {
            if (/initial-value\s*:/.test(m[2]!)) registered.add(m[1]!);
        }
        const reads = new Set<string>();
        for (const rule of rules) {
            for (const m of rule.body.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
                reads.add(m[1]!);
            }
        }
        expect(reads.size).toBeGreaterThan(0);
        for (const name of reads) {
            expect(
                emitted.has(name) || atRest.has(name) || registered.has(name),
                `${name} is read at rest and has no value at rest — ` +
                    'a keyframe-only declaration leaves it guaranteed-invalid',
            ).toBe(true);
        }
    });
});

/** Flatten a sheet into rules; descend @media, skip other at-rule bodies
 *  (keyframe steps declare no ink-over-ground pairing worth policing). */
function parseRules(css: string): { selector: string; body: string }[] {
    const out: { selector: string; body: string }[] = [];
    const walk = (text: string): void => {
        let k = 0;
        while (k < text.length) {
            const open = text.indexOf('{', k);
            if (open === -1) return;
            const selector = text.slice(k, open).trim();
            let depth = 1;
            let j = open + 1;
            while (j < text.length && depth > 0) {
                if (text[j] === '{') depth += 1;
                else if (text[j] === '}') depth -= 1;
                j += 1;
            }
            const body = text.slice(open + 1, j - 1);
            if (selector.startsWith('@media')) walk(body);
            else if (!selector.startsWith('@')) out.push({ selector, body });
            k = j;
        }
    };
    walk(css);
    return out;
}

type InkKind = 'token' | 'literal' | undefined;

const kindOf = (value: string | undefined): InkKind => {
    if (value === undefined) return undefined;
    if (/var\(\s*--s-/.test(value)) return 'token';
    if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|color\(/i.test(value)) return 'literal';
    // transparent / none / inherit: no ground (or ink) is being asserted.
    return undefined;
};

const lastDecl = (body: string, props: string[]): string | undefined => {
    let found: string | undefined;
    for (const part of body.split(';')) {
        const k = part.indexOf(':');
        if (k === -1) continue;
        const prop = part.slice(0, k).trim().toLowerCase();
        if (props.includes(prop)) found = part.slice(k + 1).trim();
    }
    return found;
};

describe('the-second-accent-is-ornament-and-never-ink', () => {
    /**
     * `themeVars` emits `--s-accent-2` **raw**, where every other colour role
     * goes through `legibleOn` — and `legibleOn` answers with a shipped INK.
     * Asking it about a colour nothing paints as text cost Rural its harvest
     * gold for 23 days: the ribbon documented as "Gold as the ribbon's
     * border" wore a hard black outline, and the price tag documented as "a
     * bg/gold mix" was grey, with the pixel pass and the ink/ground rule both
     * agreeing (2026-09-22).
     *
     * This is the condition that made removing the fence safe, so this is
     * where the argument happens the day somebody writes `color:
     * var(--s-accent-2)`: either use a token that is fenced, or put a fence
     * back. A border, a gradient stop and a `color-mix` ground are all fine —
     * the figure sitting on that ground is sampled by the contrast pass.
     */
    it('is never painted as text in any sheet', () => {
        const offences: string[] = [];
        for (const file of SHEETS) {
            const css = stripped(file);
            // `color:` but not `background-color:`/`border-color:`/`--x-color:`
            for (const match of css.matchAll(/(^|[;{\s])color\s*:\s*([^;}]+)/g)) {
                if (match[2]!.includes('--s-accent-2')) {
                    offences.push(`${file}: color: ${match[2]!.trim()}`);
                }
            }
        }
        expect(offences).toEqual([]);
    });

    it('reaches the stylesheet as the table wrote it, fence or no fence', () => {
        // Rural's gold is the case: 2.64 against its own cream, which the ink
        // fence refused. It is a border and a mix, so it paints as written.
        const rural = themeVars(decodeTheme(RURAL_THEME_ID));
        expect(rural['--s-accent-2']).toBe('rgb(201, 138, 44)');
    });
});

describe('a-theme-rule-never-pairs-a-literal-ink-with-a-token-ground', () => {
    /**
     * The rule the .mini defect taught (2.31:1 under After hours): when one
     * rule declares both the ink and the ground, they must move together
     * under a mood — both tokens, or both literals (the wood sign's
     * cream-on-plank is deliberate and stays legal). A literal over a token
     * is a colour that holds still while its ground is repainted; a token
     * over a literal is the same failure upside down. `background-image` is
     * layered art, not the ground, and is not policed here.
     */
    it('every theme rule declaring both keeps ink and ground in one world', () => {
        const offences: string[] = [];
        for (const file of NOT_BASE) {
            for (const { selector, body } of parseRules(stripped(file))) {
                const ink = kindOf(lastDecl(body, ['color']));
                const ground = kindOf(lastDecl(body, ['background', 'background-color']));
                if (ink === undefined || ground === undefined) continue;
                if (ink !== ground) {
                    offences.push(`${file}: ${selector} pairs ${ink} ink with ${ground} ground`);
                }
            }
        }
        expect(offences, offences.join('\n')).toEqual([]);
    });
});

describe('the-reduce-block-is-the-last-rule-in-its-sheet', () => {
    /**
     * PROBE-RULES: a sheet's reduced-motion block must be its last rule, or
     * a same-specificity mover appended below it re-wins and runs for every
     * reduced-motion visitor. stall.css's block said "STAYS LAST" and had
     * 470 lines after it when the marquee landed (2026-09-09) — nothing
     * moving among them, which is luck. Enforced now, for every served sheet
     * that declares one — the kit's and the static pages' too, read from the
     * role table.
     */
    it('ends every sheet that has a reduce block with that block', () => {
        expect(SERVED_SHEETS.length).toBeGreaterThan(SHEETS.length);
        for (const { path: sheet } of SERVED_SHEETS) {
            const css = readFileSync(join(ROOT, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
            const at = css.lastIndexOf('@media (prefers-reduced-motion: reduce)');
            if (at < 0) {
                continue;
            }
            // Walk the block's braces to its end; only whitespace may follow.
            let depth = 0;
            let i = css.indexOf('{', at);
            for (; i < css.length; i += 1) {
                if (css[i] === '{') depth += 1;
                if (css[i] === '}') {
                    depth -= 1;
                    if (depth === 0) break;
                }
            }
            expect(css.slice(i + 1).trim(), `${sheet}: rules after its reduce block`).toBe('');
        }
    });
});

describe('a-container-rule-is-not-out-ranked-by-a-later-base-rule', () => {
    /**
     * A declaration inside a `@container` or `@media` block loses to the SAME
     * selector declaring the same property later in the sheet outside any
     * block: equal specificity, and source order decides. The counter
     * tablet's step-down for the wall's payment band sat in exactly that
     * shape until 2026-09-24 — lines 18px, total 19, figure 34 written for
     * the short-portrait wall and 21 / 23 / 36 painted, because the band's
     * base rules came later (the critic's item 8). Reduced-motion blocks are
     * not read: they state kills, and a kill that loses is the reduce test's
     * to find. **What this cannot see** (the critic's P3, 2026-09-24), each
     * a place the shape can come back green:
     *
     * - a different selector of equal specificity matching the same element
     *   later — the cascade, not the text, decides that;
     * - a shorthand against its longhand — property names are compared
     *   literally, so a later base `font: …` taking back a conditional
     *   `font-size` (or `margin` taking back `margin-top`) is not seen;
     * - another sheet — each is read alone, so a base rule in a sheet the
     *   bundle imports later (a look's, or `window.css` after `stall.css`)
     *   out-ranking a conditional one in an earlier sheet is not seen;
     * - a selector written two ways (`.a.b` against `.b.a`, or a comment
     *   inside the selector list) — the text is compared after collapsing
     *   whitespace and nothing else.
     *
     * Only the probe, which measures what painted, sees those.
     */
    type Rule = { selectors: string[]; props: string[]; cond: string; n: number };
    const rulesOf = (css: string): Rule[] => {
        const out: Rule[] = [];
        const stack: string[] = [];
        let start = 0;
        let n = 0;
        for (let i = 0; i < css.length; i += 1) {
            if (css[i] === '{') {
                stack.push(css.slice(start, i).trim());
                start = i + 1;
            } else if (css[i] === '}') {
                const head = stack.pop();
                if (head !== undefined && !head.startsWith('@') && !/^(from|to|[\d.]+%)/.test(head)) {
                    out.push({
                        selectors: head.split(',').map((x) => x.trim().replace(/\s+/g, ' ')),
                        props: [...css.slice(start, i).matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)].map((m) => m[1]!),
                        cond: stack.filter((h) => h.startsWith('@')).join(' '),
                        n: (n += 1),
                    });
                }
                start = i + 1;
            }
        }
        return out;
    };

    it('finds no conditional declaration a later unconditional rule of the same selector takes back', () => {
        const dead: string[] = [];
        let conditional = 0;
        for (const sheet of SHEETS) {
            const rules = rulesOf(stripped(sheet));
            for (const r of rules) {
                if (r.cond === '' || /prefers-reduced-motion|keyframes/.test(r.cond)) continue;
                conditional += 1;
                for (const u of rules) {
                    if (u.n <= r.n || u.cond !== '') continue;
                    const selectors = r.selectors.filter((x) => u.selectors.includes(x));
                    const props = r.props.filter((p) => u.props.includes(p));
                    if (selectors.length > 0 && props.length > 0) {
                        dead.push(`${sheet}: ${r.cond} ${selectors.join(', ')} { ${props.join(', ')} }`);
                    }
                }
            }
        }
        expect(conditional, 'the test read no conditional rule at all').toBeGreaterThan(50);
        expect(dead).toEqual([]);
    });
});

describe('the-raised-small-text-stays-at-eleven-px', () => {
    /**
     * The owner's Q16 (2026-09-24, F1 and F2): shipped text under 11px rose
     * to 11 in its own sheet — the looks' "from", units, rail labels, chips,
     * rate, fiat and lowest-of lines, section counts, sign sub-lines and
     * wearing lines, the Activity tile's letters and the brand strip. The
     * probe's `small-text-is-at-least-11px` holds what a fixture paints;
     * this holds the declarations themselves, so a class no fixture paints
     * (the notice invite's `.ghost-chip`, a seller prompt) is held too:
     * **no pixel size under 11 anywhere in a served sheet** — a `font-size`
     * or the size inside a `font` shorthand — but the one exception the
     * owner's rule makes, text inside an aria-hidden subtree: the sparse
     * motif's caption (`EXCEPT`). A new exception is a decision, not an
     * edit to this list. What it cannot see: a size computed from `em`,
     * `rem` or `calc()`, which the probe measures on what it paints.
     *
     * **Every served sheet, not only the app's** (the critic's P3,
     * 2026-09-24): the static pages' sheets under `public/` (`/guide`,
     * `/stream`, the 404 — served as they are, outside the bundle) and the
     * workshop kit's look sheet, which a creator edits and the kit ships as
     * a look. They are read from the directory, so a sheet added there is
     * read the day it lands.
     */
    const EXCEPT = ['src/ui/theme-neo.css: .t-neo .sm-cap'];
    const EXTRA = [
        ...readdirSync(join(ROOT, 'public'))
            .filter((file) => file.endsWith('.css'))
            .map((file) => `public/${file}`),
        ...readdirSync(join(ROOT, 'workshop'))
            .filter((file) => file.endsWith('.css'))
            .map((file) => `workshop/${file}`),
    ];

    it('reads the static pages’ sheets and the kit’s as well as the app’s', () => {
        expect(EXTRA).toEqual(expect.arrayContaining(['public/guide.css', 'public/stream.css', 'workshop/theme-workshop.css']));
    });

    it('declares no pixel size under 11 in any served sheet, but the aria-hidden caption', () => {
        const offenders: string[] = [];
        let read = 0;
        for (const sheet of [...SHEETS, ...EXTRA]) {
            for (const m of stripped(sheet).matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
                const body = m[2]!;
                const sizes = [
                    ...[...body.matchAll(/(?:^|;)\s*font-size:\s*([0-9.]+)px/g)].map((x) => x[1]!),
                    ...[...body.matchAll(/(?:^|;)\s*font:\s*[^;]*?([0-9.]+)px/g)].map((x) => x[1]!),
                ];
                for (const px of sizes) {
                    read += 1;
                    const where = `${sheet}: ${m[1]!.trim().replace(/\s+/g, ' ')}`;
                    if (Number(px) < 11 && !EXCEPT.includes(where)) {
                        offenders.push(`${where} at ${px}px`);
                    }
                }
            }
        }
        expect(read, 'the test read no size at all').toBeGreaterThan(100);
        expect(offenders).toEqual([]);
    });
});
