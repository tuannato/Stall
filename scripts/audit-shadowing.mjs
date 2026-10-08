#!/usr/bin/env node
/*
 * Shadowing audit: the evidence a deletion from the var layer must cite.
 *
 * The same CSS declaration is expressible in three places (shape/chrome vars
 * consumed by the base sheets, and the three per-look stylesheets), and the
 * cascade decides silently. This script parses the base sheets and the three
 * looks into (selector, property) pairs and answers, per emitted --s-*
 * variable:
 *
 *   SHADOWED  every base-sheet consumer of the var is overridden by all three
 *             theme files (same element under the .t-<look> class, same
 *             property or a shorthand that cancels it, outside any @media) —
 *             the var paints nothing anywhere and is a deletion candidate.
 *   PARTIAL   some look or some consumer still reads it.
 *   CLEAN     no theme file touches any of its consumers.
 *
 * A var consumed by a theme file itself (e.g. --s-card-sheen inside
 * theme-neo.css's background stack) is load-bearing no matter what and is
 * marked THEME-READ. Assumption stated once: a theme selector carries
 * .t-<look>, so it always out-specifies the base selector with the same tail;
 * import order (stall.css first) makes equal-specificity cases theme-won too.
 *
 * **A private look a build carries is a look here too** (step 8e1): the
 * sheets are the ones a run serves (`servedSheets`,
 * `scripts/served-sheets.mjs`) — the role table's, and the private looks the
 * environment's selection carries — so a var Ink wash still reads, or a
 * consumer its sheet does not override, is never reported as a deletion
 * candidate. The report names the private looks it read, and says when it
 * read none: a var SHADOWED over the shipped looks alone may be read by a
 * private look that was not selected. **And a worn-only look wins ties a
 * bundled one loses** (CRITIC-STEP-6 item 9): a worn sheet lands after
 * `broadcast.css`, so the overlay's rules it restates at equal specificity
 * are its — listed per worn look under WORN-OVER-BROADCAST.
 *
 * Informational: exits 0. The guards that fail builds live in
 * theme-sheets.test.ts; this is the measuring tool they lean on.
 * `shadowingReport` is the pure half, held by
 * `the-audit-counts-a-private-look-as-a-look` (`scripts/served-sheets.test.mjs`).
 */
import { basename } from 'node:path';
import { runAsScript } from './run-as-script.mjs';
import { servedSheets } from './served-sheets.mjs';

/**
 * The look-agnostic sheets whose var reads are the ones a theme file can
 * shadow: the role table's `shadowedByLooks` sheets — the base, and every
 * screen sheet that reads the shared table and carries no `.t-<look>` rule
 * of its own (`obsGuide.css`, whose only surviving consumer of a var must not
 * be reported as a deletion candidate; `window.css`, scoped to
 * `.stall.shop-window`). `broadcast.css` is not one: the overlay carries its
 * own `.t-<look>` rules in that same file, so the base/theme split this
 * script measures does not describe it. The flag is held to each sheet's
 * selectors by `every-served-sheet-is-on-the-guard-list`.
 */

/** Longhands a shorthand silently cancels — the --s-sign-rule lesson. */
const SHORTHAND_COVERS = {
    background: [
        'background-image', 'background-color', 'background-size',
        'background-position', 'background-repeat', 'background-attachment',
        'background-origin', 'background-clip',
    ],
    border: [
        'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-width', 'border-style', 'border-color',
    ],
    'border-top': ['border-top-width', 'border-top-style', 'border-top-color'],
    'border-right': ['border-right-width', 'border-right-style', 'border-right-color'],
    'border-bottom': ['border-bottom-width', 'border-bottom-style', 'border-bottom-color'],
    'border-left': ['border-left-width', 'border-left-style', 'border-left-color'],
    font: ['font-family', 'font-size', 'font-style', 'font-variant', 'font-weight', 'line-height'],
    animation: [
        'animation-name', 'animation-duration', 'animation-timing-function',
        'animation-delay', 'animation-iteration-count', 'animation-direction',
        'animation-fill-mode', 'animation-play-state',
    ],
    transition: ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
    margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
    padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
    'border-radius': [
        'border-top-left-radius', 'border-top-right-radius',
        'border-bottom-right-radius', 'border-bottom-left-radius',
    ],
    inset: ['top', 'right', 'bottom', 'left'],
    flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
    gap: ['row-gap', 'column-gap'],
};

/** Flatten a stylesheet into rules; descend @media, skip other at-bodies. */
function parseRules(css, media = '') {
    const out = [];
    const clean = media === '' ? css.replace(/\/\*[\s\S]*?\*\//g, '') : css;
    let i = 0;
    while (i < clean.length) {
        const open = clean.indexOf('{', i);
        if (open === -1) break;
        const selector = clean.slice(i, open).trim();
        let depth = 1;
        let j = open + 1;
        while (j < clean.length && depth > 0) {
            if (clean[j] === '{') depth++;
            else if (clean[j] === '}') depth--;
            j++;
        }
        const body = clean.slice(open + 1, j - 1);
        if (selector.startsWith('@media')) {
            out.push(...parseRules(body, selector));
        } else if (!selector.startsWith('@')) {
            const decls = [];
            for (const part of body.split(';')) {
                const k = part.indexOf(':');
                if (k === -1) continue;
                const prop = part.slice(0, k).trim().toLowerCase();
                const value = part.slice(k + 1).trim();
                if (prop) decls.push({ prop, value });
            }
            for (const sel of selector.split(',')) {
                out.push({ selector: sel.trim().replace(/\s+/g, ' '), media, decls });
            }
        }
        i = j;
    }
    return out;
}

/**
 * The report, from the sheets themselves — pure. `sheets`: a merged list
 * (`servedSheets`), each `{ path, role, css, lookClass?, load?,
 * shadowedByLooks? }`. The base is the `shadowedByLooks` sheets; the looks
 * are the shipped looks' sheets (`role: 'look'`) and every private look's
 * (`role: 'private'`). Answers `{ looks, SHADOWED, PARTIAL, CLEAN,
 * wornOverBroadcast }`: each verdict a list of `{ name, read, notes }`, and
 * per worn look the `broadcast.css` (selector, property) pairs it restates.
 */
export function shadowingReport(sheets) {
    const looks = sheets.filter((sheet) => sheet.role === 'look' || sheet.role === 'private');
    const themes = looks.map((sheet) => sheet.path);
    const lookClass = new RegExp(`\\.(${looks.map((sheet) => sheet.lookClass).join('|')})(?![\\w-])`, 'g');
    const norm = (sel) => sel.replace(lookClass, '').replace(/\s+/g, ' ').trim() || '.stall';
    /** A look sheet's short name for the report: `neo` for `src/ui/theme-neo.css`. */
    const lookName = (path) => looks.find((sheet) => sheet.path === path).lookClass.replace(/^t-/, '');

    const base = sheets.filter((sheet) => sheet.shadowedByLooks).flatMap((sheet) => parseRules(sheet.css));
    const themeRules = new Map(looks.map((sheet) => [sheet.path, parseRules(sheet.css)]));

    // Every base-sheet consumer of every --s-* var.
    const consumers = new Map(); // var -> [{selector, prop, media}]
    for (const rule of base) {
        for (const { prop, value } of rule.decls) {
            for (const m of value.matchAll(/var\(\s*(--s-[a-z0-9-]+)/g)) {
                const list = consumers.get(m[1]) ?? [];
                list.push({ selector: rule.selector, prop, media: rule.media });
                consumers.set(m[1], list);
            }
        }
    }

    // Vars a theme file reads itself: load-bearing however shadowed elsewhere.
    const themeReads = new Map(); // var -> [file]
    for (const [file, rules] of themeRules) {
        for (const rule of rules) {
            for (const { value } of rule.decls) {
                for (const m of value.matchAll(/var\(\s*(--s-[a-z0-9-]+)/g)) {
                    const list = themeReads.get(m[1]) ?? [];
                    if (!list.includes(basename(file))) list.push(basename(file));
                    themeReads.set(m[1], list);
                }
            }
        }
    }

    // Per theme: which (normalized selector, property) pairs it declares at
    // base media, expanding shorthands to what they cancel.
    const overrides = new Map();
    for (const [file, rules] of themeRules) {
        const set = new Set();
        for (const rule of rules) {
            if (rule.media !== '') continue; // media-only overrides count as partial
            const tail = norm(rule.selector);
            for (const { prop } of rule.decls) {
                set.add(`${tail} ${prop}`);
                for (const covered of SHORTHAND_COVERS[prop] ?? []) {
                    set.add(`${tail} ${covered}`);
                }
            }
        }
        overrides.set(file, set);
    }

    const report = { looks: looks.map((sheet) => ({ path: sheet.path, lookClass: sheet.lookClass, role: sheet.role })), SHADOWED: [], PARTIAL: [], CLEAN: [] };
    for (const [name, list] of [...consumers.entries()].sort()) {
        const notes = [];
        let allShadowed = true;
        for (const c of list) {
            const missing = themes.filter((f) => !overrides.get(f).has(`${norm(c.selector)} ${c.prop}`));
            if (missing.length > 0) allShadowed = false;
            notes.push(
                `    ${c.selector} { ${c.prop} }${c.media ? ` [${c.media}]` : ''}` +
                    (missing.length === 0
                        ? ' — overridden by ALL themes'
                        : missing.length === themes.length
                          ? ''
                          : ` — still read under: ${missing.map(lookName).join(', ')}`),
            );
        }
        const anyShadowed = notes.some((n) => n.includes('overridden by ALL'));
        const read = themeReads.get(name);
        const verdict = read ? 'CLEAN' : allShadowed ? 'SHADOWED' : anyShadowed ? 'PARTIAL' : 'CLEAN';
        report[verdict].push({ name, read, notes });
    }

    // A worn sheet lands after broadcast.css: what it restates there at the
    // overlay's own (normalised) selector is its, where a bundled look's is not.
    const broadcast = sheets.find((sheet) => sheet.path === BROADCAST);
    const overlay = broadcast === undefined ? [] : parseRules(broadcast.css).filter((rule) => rule.media === '');
    report.wornOverBroadcast = looks
        .filter((sheet) => sheet.load === 'worn')
        .map((sheet) => {
            const own = overrides.get(sheet.path);
            const pairs = [];
            for (const rule of overlay) {
                for (const { prop } of rule.decls) {
                    const key = `${norm(rule.selector)} ${prop}`;
                    if (own.has(key) && !pairs.includes(key)) pairs.push(key);
                }
            }
            return { path: sheet.path, pairs };
        });
    return report;
}

/** The overlay's sheet, the one a worn look lands after. */
const BROADCAST = 'src/ui/broadcast.css';

/** The report as the command prints it. */
export function formatReport(report) {
    const out = [];
    const privateLooks = report.looks.filter((look) => look.role === 'private');
    out.push(
        privateLooks.length === 0
            ? 'Private looks read: none — a var SHADOWED here may still be read by a private look; run with its selection (STALL_LOOKS_TARGET, STALL_LOOKS_DIR) to count it.'
            : `Private looks read: ${privateLooks.map((look) => look.lookClass).join(', ')}.`,
    );
    for (const verdict of ['SHADOWED', 'PARTIAL', 'CLEAN']) {
        out.push(`\n== ${verdict} (${report[verdict].length}) ==`);
        for (const entry of report[verdict]) {
            out.push(`  ${entry.name}${entry.read ? `  [THEME-READ by ${entry.read.join(', ')}]` : ''}\n${entry.notes.join('\n')}`);
        }
    }
    if (report.wornOverBroadcast.length > 0) {
        out.push(`\n== WORN-OVER-BROADCAST (${report.wornOverBroadcast.length}) ==`);
        for (const look of report.wornOverBroadcast) {
            out.push(`  ${look.path}${look.pairs.length === 0 ? ': restates nothing broadcast.css declares' : ''}`);
            for (const pair of look.pairs) out.push(`    ${pair}`);
        }
    }
    out.push(
        '\nSHADOWED = deletion candidate with this output as the cited proof.',
        '\nPARTIAL/CLEAN = load-bearing; a deletion needs a design decision, not a cleanup.',
    );
    return out;
}

if (runAsScript(import.meta.url)) {
    // What a build serves: the role table's sheets and the private looks the
    // environment selects — never the tracked fixture, which no build serves
    // unless a run selects it.
    const report = shadowingReport(await servedSheets());
    const [privateLine, ...rest] = formatReport(report);
    for (const line of rest.slice(0, -2)) console.log(line);
    console.log(rest[rest.length - 2], rest[rest.length - 1]);
    console.log(`\n${privateLine}`);
}
