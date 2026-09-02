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
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    DEFAULT_THEME_ID,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    decodeTheme,
    themeVars,
} from '../domain/theme';

const UI_DIR = dirname(fileURLToPath(import.meta.url));
const SHEETS = [
    'stall.css',
    'theme-modern.css',
    'theme-neo.css',
    'theme-rural.css',
    'broadcast.css',
];

const stripped = (file: string): string =>
    readFileSync(join(UI_DIR, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

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
        for (const file of SHEETS.slice(1)) {
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
