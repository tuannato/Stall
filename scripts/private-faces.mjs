/**
 * Three static guards over a private look's own faces, read from the look's
 * sheet and its `art/` as git holds them (the 8g-pre row of the step-8 plan,
 * "by recommendation"; the critic's P3-14; the third from the 8g0 critic's
 * P3-3). Each is a shipped faces' check (`scripts/served-faces.mjs`,
 * `scripts/served-faces.test.mjs`) applied to the faces a private look
 * declares:
 *
 * **1. A private face's `unicode-range` claims no code point its own file
 * lacks** (`rangeProblems`, the `DECLARED_NOT_HELD` check). A browser asked
 * for a character a range names fetches the face for it, finds no glyph and
 * goes on to the next family of the stack — a wasted fetch, and the character
 * drawn by whatever follows. Read on the range's own tokens, **not on the
 * merged pairs** the shipped check reads (`rangePairs` merges
 * `U+20B9, U+20BA` into one span, which that check cannot call a single
 * code point): every token that names one code point on its own is held to
 * the file's `cmap`. **Strict, with no pinned exceptions**: a range
 * published with a family (Fontsource's, Google's) names singles its subset
 * lacks — `U+0329`, `U+FFFD`, `U+2215` are on the shipped check's pin list —
 * and is refused as published; the remedy is cheap (remove the token, or cut
 * the glyph in). A span (`U+0-FF`) or a wildcard is not walked: it names
 * control characters and unassigned points no file holds, and what a span
 * claims of the app's text is decided by the second check from range and
 * `cmap` together; its only cost is a fetch for nothing. A token a browser
 * would not accept — not `U+hex`, `U+lo-hi` or `U+hex??`, or past `U+10FFFF`
 * — makes it drop the whole descriptor, and the face then claims every
 * character: it is a refusal with a sentence, never an exception.
 *
 * **2. A private look's stacks end in a served face, and leave nothing the
 * app prints to the machine** (`stackReport`). For each font stack the sheet
 * uses — every `font-family`, the family list of every `font` shorthand,
 * every `--s-font…` value:
 *
 * - **structure**: the first family that is not one of the look's own is a
 *   served family (`servedFamilies`, `stall.css`'s `SERVED_FAMILIES`). A
 *   stack that reaches a system name, a generic or a name nothing declares
 *   before any served face is refused, whatever the look's own face draws:
 *   a seller's words and an item's name are not in the app's literals, and
 *   a served face after the look's own is what keeps a Latin or Vietnamese
 *   letter the own face lacks off the reader's machine;
 * - **characters**: each code point the app prints (`printedCodePoints`: its
 *   own literals, the sheets' `content` and `GENERATED_TEXT`, printable
 *   ASCII) and **its upper and lower case forms** (a look may uppercase a
 *   line: `đ` is printed, `Đ` is painted) is walked as a browser walks it,
 *   one character at a time: a family draws it when one of its faces'
 *   `unicode-range` names it and the file's `cmap` holds it (own families
 *   from the sheet's `@font-face` rules, served ones from `stall.css`,
 *   where a segment — a rule in a served family's name over Inter's file —
 *   is one more face of that family, `servedFaceSets`); a
 *   family that does not goes on to the next. It must be drawn by an own or
 *   a served face **before** the walk meets a family the machine supplies,
 *   or runs out of list — after which it is drawn per OS, and a private look
 *   that drops `'Stall Serif'` from its stack sends `≈` on the rate line, a
 *   money node, there.
 *
 * What stays per-OS on the shipped looks stays per-OS here, stated: a
 * character on the pinned list (`PRINTED_NOT_HELD`, `scripts/served-faces
 * .test.mjs`) is excused **for a served family the stack names whose every
 * face lacks it** — the shipped situation exactly.
 *
 * **What the walk cannot decide, it refuses** (a sentence, never a guess):
 * a family list set through a `var()` other than the theme's `--s-font…`, a
 * `--s-font…` the sheet and the theme leave undefined and give no fallback, a
 * custom property that refers to itself, a `font` shorthand whose family it
 * cannot read, an `all` other than `inherit` or `unset` (it resets
 * `font-family` to the browser's default and writes no list), more than
 * `MAX_STACK_VARIANTS` readings of one list, and a face whose file the art
 * does not hold or whose `cmap` it cannot read.
 * `var(--s-font…)` is read as every value the sheet gives the property
 * **and** the theme's own (`FONT_STACKS[fontIndex]` of the look's row) for
 * `--s-font` itself: the root's value is set inline by the theme and a sheet
 * cannot override it on the same element, so a restatement reaches only the
 * elements below it. Any other `--s-font-x` with a fallback reads the
 * fallback as one more reading **even when a rule defines it**: the elements
 * outside that rule's subtree take the fallback.
 *
 * **Read optimistically, stated** (not measured in a browser): a variant
 * draws a character when any of its faces names and holds it. CSS Fonts
 * orders overlapping faces of one variant last-defined-first and says that a
 * matched face without the glyph passes to the next family; whether a
 * browser first tries the other overlapping faces of the variant is
 * believed, not measured. No look today overlaps two own faces in one
 * variant.
 *
 * **One named pin, and nothing else is excused** (`PINNED_STACKS`): the
 * canary's own tagline stack, which names its one face and no served family.
 * A pin is a look class, **the look's packed tree** (`CANARY_TREE`, the
 * tree a deploy pins, read by the merged list through `packedTreeOf`), a
 * property, a selector, a stack and the reason, public like the canary's CSS
 * it names. It is held by the hash and not by the names (the re-review's
 * R-2): `t-canary` is reserved nowhere, so a look whose index names the
 * class over other bytes — another face under the canary's file name, one
 * file more — is another look, and walked. It is live or it is a failure: a
 * pin that matches no stack of its look, or a stack that passes, is a
 * problem in the same run, and the test that reads the canary rebuilt from
 * public bytes (`canaryFiles`) fails if the stack no longer fails without
 * the pin. Every other stack of every look — a private look's tagline stack
 * included — is walked like any other.
 *
 * **3. A private face's `unicode-range` names only letters of its subset's
 * script** (`scriptReport`, `a-private-face-range-never-takes-one-letter-of-another-script`;
 * the 8g0 critic's P3-3). The shipped rule
 * (`a-face-range-never-takes-one-letter-of-another-script`) reads
 * `stall.css`'s faces alone, so a re-cut of a private look's face that put
 * `р` (U+0440) in a Latin range — the glyph re-subset's own first cut — passed
 * every guard: a seller's Cyrillic word drawn with that one letter in the
 * look's face and the rest in a font of the reader's machine. The same
 * reading (`lettersOfAnotherScript`: a letter belongs when its
 * `Script_Extensions` hold the subset's script, or are Common or Inherited)
 * over every face the sheet declares, and the same refusal of a face with no
 * range (or one past `MAX_RANGE_CODE_POINTS`, or one naming nothing): such a
 * face is asked for every character of every script. **The subset is the
 * look's own word**, `fonts.json`'s (`files: { "<face>.woff2": "<subset>" }`),
 * read case-blind through `SUBSET_SCRIPTS`; a face `fonts.json` does not
 * name, a `fonts.json` this reader cannot read and a subset the table does
 * not name are each a sentence, never a pass — a Cyrillic or Greek subset is
 * added to `SUBSET_SCRIPTS` with its own script, on purpose, and so is a CJK
 * one (a table that gives each subset one script has no row for a subset
 * whose range holds Han, kana and Hangul at once; that is the owner's to
 * decide when a look serves one). **One named pin** (`PINNED_RANGELESS_FACES`):
 * the canary's one face states no range, and the canary is public bytes
 * fixed by a hash; the pin is held as `PINNED_STACKS` is — the look's class
 * and packed tree, the face's family and file — and is live or a failure.
 *
 * Pure over strings and buffers, and the shipped faces' readers. The tests
 * that drive it over every private look a run reads, over planted
 * repositories and over the canary built from public bytes are in
 * `scripts/served-faces.test.mjs`.
 */
import { parseLookFonts, woff2CodePoints } from './look-faces.mjs';
import { rangePairs } from './probe-faces.mjs';
import { CANARY_TREE } from './private-looks.mjs';
import { MAX_RANGE_CODE_POINTS, NO_GLYPH, SUBSET_SCRIPTS, cpName, lettersOfAnotherScript, scriptOfSubset, servedFaceSets } from './served-faces.mjs';
import { declarationsOf, echo, firstFamily, parseSheet, shorthandFamilies, splitTopLevel } from './workshop-css.mjs';

/** The most readings of one family list this reader walks; past it, it refuses. */
export const MAX_STACK_VARIANTS = 16;

/** The most code points one sentence names; the rest are counted (`gaps` of the report lists them all). */
const MAX_SHOWN_GAPS = 12;

/** The last code point; a `unicode-range` token past it makes a browser drop the descriptor. */
const MAX_CODE_POINT = 0x10ffff;

/**
 * The stacks excused by name, each live or a failure (`stackReport`,
 * `stackMatchesPin`): a look class and its packed tree, the property, the
 * one rule's selector, the stack as written, and why. The canary's tagline
 * stack names `t-canary-mono` alone — a JetBrains Mono Latin subset from
 * before the glyph re-subset, which lacks `≈ ₽ đ ồ` and every letter with a
 * mark under or above it — so **the pin excuses everything that face lacks
 * on whatever that line paints; today, the seller's marked letters**, drawn
 * per OS (the re-review's R-3; the canary test holds that the canary's
 * sheet prints no generated text). The canary is preview-only (a try-on
 * reaches it) and public bytes (`canaryFiles`). Fixing it moves
 * `CANARY_TREE`, `CANARY_COMMIT`, the pin and the recipe, and an owner commit
 * in the private repository; the stack that does it is
 * `t-canary-mono, 'JetBrains Mono'`, and the pin leaves in the same diff
 * (its tripwire forces it).
 */
export const PINNED_STACKS = Object.freeze([
    Object.freeze({
        cls: 't-canary',
        tree: CANARY_TREE,
        prop: 'font-family',
        selector: '.t-canary .stall-tagline',
        stack: 't-canary-mono',
        why: "the canary's one stack: its own Latin face and no served face after it, so whatever that line paints and the face lacks — today the seller's marked letters — draws per OS; preview-only public bytes, kept until the next canary change",
    }),
]);

const normal = (text) => String(text).replace(/\s+/g, ' ').trim();

/** True when `stack` (`{ prop, selectors, raw }`) is the rule a pin names — its property, its one selector, its stack — in whatever look. */
function namesPinnedRule(pin, stack) {
    return stack.prop === pin.prop && stack.selectors?.length === 1 && normal(stack.selectors[0]) === normal(pin.selector) && normal(stack.raw) === normal(pin.stack);
}

/** True when a pin is for this look (`{ cls, tree }`): its class and its packed tree, so the class over other bytes is another look. */
const pinIsFor = (pin, look) => pin.cls === look.cls && pin.tree === look.tree;

/** True when `stack` is exactly the rule a pin names, in the look the pin is for (`{ cls, tree }`, the look's class and packed tree). */
export function stackMatchesPin(pin, look, stack) {
    return pinIsFor(pin, look) && namesPinnedRule(pin, stack);
}

/** The rules, `@font-face` blocks and keyframe stops of a sheet, each with its line; a keyframe stop has no selectors. */
export function sheetParts(css) {
    const { text, nodes } = parseSheet(css);
    const line = (at) => text.slice(0, at).split('\n').length;
    const rules = [];
    const faces = [];
    const visit = (list) => {
        for (const node of list) {
            if (node.kind === 'rule') {
                rules.push({ line: line(node.start), selectors: splitTopLevel(node.prelude, ','), decls: declarationsOf(node.body) });
            } else if (node.name === 'font-face') {
                if (!node.statement) faces.push({ line: line(node.start), decls: declarationsOf(node.body ?? '') });
            } else if (node.name === 'keyframes') {
                for (const stop of parseSheet(node.body ?? '').nodes) {
                    if (stop.kind === 'rule') rules.push({ line: line(node.start), selectors: undefined, decls: declarationsOf(stop.body) });
                }
            } else if (node.children !== undefined) {
                visit(node.children);
            }
        }
    };
    visit(nodes);
    return { rules, faces };
}

const unquote = (value) => value.trim().replace(/^(["'])([\s\S]*)\1$/, '$2').trim();

/** `normal` and `bold` as the numbers a weight descends from, every run of space as one. */
const weightOf = (value) =>
    value
        .trim()
        .split(/\s+/)
        .map((part) => ({ normal: '400', bold: '700' })[part.toLowerCase()] ?? part)
        .join(' ');

/** Why one `unicode-range` token is not one a browser accepts, or undefined (an empty token is skipped, as `rangePairs` skips it). */
function rangeTokenProblem(token) {
    if (token === '') return undefined;
    const shown = `token "${echo(token)}"`;
    if (!/^u\+(?:[0-9a-f]{1,6}(?:-[0-9a-f]{1,6})?|[0-9a-f]{0,5}\?{1,6})$/i.test(token) || (token.includes('?') && token.length > 8)) {
        return `${shown} is not one this reader parses (U+hex, U+lo-hi or U+hex??)`;
    }
    const pairs = rangePairs(token);
    if (pairs === undefined) return `${shown} is not one this reader parses`;
    const [lo, hi] = pairs[0];
    if (lo > MAX_CODE_POINT || hi > MAX_CODE_POINT) return `${shown} names a code point past U+10FFFF`;
    if (lo > hi) return `${shown} ends before it starts`;
    return undefined;
}

/**
 * Every face a private look's sheet declares, with the code points its file
 * holds: `{ faces, problems }`, `faces` as `{ family, variant, file, line,
 * declared, ranges, held }`. `art` is the look's plain files as `{ name,
 * bytes }`. A face whose file is not there, is not read as a WOFF2 or has a
 * range this reader cannot parse is a problem and is left out of `faces`.
 */
export function ownFaceSet({ css, art }) {
    const faces = [];
    const problems = [];
    const byName = new Map(art.map((file) => [file.name, file]));
    for (const rule of sheetParts(css).faces) {
        const get = (prop) => rule.decls.find((decl) => decl.prop === prop)?.value;
        const family = unquote(get('font-family') ?? '');
        const where = `line ${rule.line}: @font-face "${echo(family)}"`;
        const src = /url\(\s*(['"]?)([^'")]+)\1\s*\)/.exec(get('src') ?? '')?.[2] ?? '';
        const name = /^(?:\.\/)?art\/([^/]+)$/.exec(src)?.[1];
        if (name === undefined) {
            problems.push(`${where}: src "${echo(src)}" is not a file in the look's art/ — this reader cannot tell what the face holds`);
            continue;
        }
        const file = byName.get(name);
        if (file === undefined) {
            problems.push(`${where}: art/${name} is not there`);
            continue;
        }
        let held;
        try {
            held = woff2CodePoints(file.bytes);
        } catch (error) {
            problems.push(`${where}: art/${name}: its cmap cannot be read (${error.message}) — this reader cannot tell what the face holds`);
            continue;
        }
        const declared = get('unicode-range') ?? '';
        const refused = declared
            .split(',')
            .map((token) => rangeTokenProblem(token.trim()))
            .find((why) => why !== undefined);
        const ranges = refused === undefined ? rangePairs(declared) : undefined;
        if (ranges === undefined) {
            problems.push(`${where}: unicode-range ${refused ?? `"${echo(declared)}" is not one this reader parses`} — a browser drops the whole descriptor, and the face then claims every character`);
            continue;
        }
        const variant = `${(get('font-style') ?? 'normal').trim().toLowerCase()} ${weightOf(get('font-weight') ?? 'normal')}`;
        faces.push({ family, variant, file: `art/${name}`, line: rule.line, declared, ranges, held });
    }
    return { faces, problems };
}

/**
 * Guard 1 (`a-private-face-claims-only-what-its-file-draws`): every code
 * point a face's `unicode-range` names on its own, one token at a time, that
 * its file holds no glyph for. Sentences, with the faces that could not be
 * read first; empty when the look claims only what its files draw.
 */
export function rangeProblems(read) {
    const out = [...read.problems];
    for (const face of read.faces) {
        const claimed = [];
        for (const token of face.declared.split(',')) {
            const text = token.trim();
            if (text === '') continue;
            const pairs = rangePairs(text);
            for (const [lo, hi] of pairs ?? []) {
                if (lo === hi && lo <= MAX_CODE_POINT && !face.held.has(lo) && !NO_GLYPH.test(String.fromCodePoint(lo)) && !claimed.includes(lo)) claimed.push(lo);
            }
        }
        if (claimed.length > 0) {
            out.push(
                `line ${face.line}: ${face.file}: unicode-range names ${claimed.map(cpName).join(', ')} on ${claimed.length === 1 ? 'its' : 'their'} own and the file holds no glyph for ${claimed.length === 1 ? 'it' : 'them'} — ` +
                    `the browser fetches this face for ${claimed.length === 1 ? 'it' : 'them'} and goes on to the next family: remove the token, or cut the glyph in (a-private-face-claims-only-what-its-file-draws)`,
            );
        }
    }
    return out;
}

/** Families by lower-cased name, each as `{ name, variants: [{ label, faces }] }`: a family draws a character when every variant does. */
function familiesOf(faces, labelOf) {
    const out = new Map();
    for (const face of faces) {
        const key = face.family.toLowerCase();
        if (!out.has(key)) out.set(key, { name: face.family, variants: new Map() });
        const variants = out.get(key).variants;
        const label = labelOf(face);
        if (!variants.has(label)) variants.set(label, { label, faces: [] });
        variants.get(label).faces.push(face);
    }
    return new Map([...out].map(([key, family]) => [key, { name: family.name, variants: [...family.variants.values()] }]));
}

/** The families `stall.css` serves, from the face sets it declares (`Stall Serif` and `Stall Serif italic` are two variants of one family). */
export function servedFamilies(sets = servedFaceSets()) {
    const faces = sets.flatMap((set) => set.faces.map((face) => ({ ...face, family: set.name.replace(/ italic$/, ''), set: set.name })));
    return familiesOf(faces, (face) => face.set);
}

/** A look's own families, from `ownFaceSet`'s faces. */
export function ownFamilies(faces) {
    return familiesOf(faces, (face) => face.variant);
}

const inRanges = (ranges, cp) => ranges.some(([lo, hi]) => cp >= lo && cp <= hi);
const familyDraws = (family, cp) => family.variants.every((variant) => variant.faces.some((face) => inRanges(face.ranges, cp) && face.held.has(cp)));

/**
 * Who draws `cp` in a list of family names, walked as a browser walks it:
 * `own` or `served` for the first face that names and holds it, `machine`
 * when the walk meets a family it does not know first, or runs out.
 */
export function drawnBy(names, cp, own, served) {
    for (const name of names) {
        const key = name.toLowerCase();
        const ours = own.get(key);
        const family = ours ?? served.get(key);
        if (family === undefined) return 'machine';
        if (familyDraws(family, cp)) return ours === undefined ? 'served' : 'own';
    }
    return 'machine';
}

const VAR = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/i;

/**
 * The readings of a family list: every list of names it can stand for, or a
 * refusal. `defs` maps each `--s-font…` the sheet sets to the values it gives
 * it; `rootStack` is the theme's `--s-font` (undefined when the row cannot be
 * read); `seen` the properties being expanded, so a cycle is a refusal.
 */
function readings(list, { defs, rootStack }, seen = new Set()) {
    let options = [[]];
    for (const token of splitTopLevel(list, ',')) {
        const m = VAR.exec(token);
        if (m === null) {
            const name = firstFamily(token);
            options = options.map((names) => [...names, name]);
            continue;
        }
        const [, prop, fallback] = m;
        if (!/^--s-font[\w-]*$/.test(prop)) {
            return { refusal: `var(${prop}) sets part of a family list, and only the theme's --s-font… is resolved here — write the families in the list` };
        }
        if (seen.has(prop)) return { refusal: `${prop} refers to itself` };
        const sources = [...(defs.get(prop) ?? [])];
        if (prop === '--s-font') {
            // The theme sets it inline on the root, so it is always defined and a fallback never reads.
            if (rootStack === undefined) return { refusal: "var(--s-font) is the theme's, and this look's row names no stack this reader can read" };
            sources.push(rootStack);
        } else {
            // A rule defines it only below its own selector: everywhere else the fallback is the value.
            if (fallback !== undefined) sources.push(fallback.trim());
            if (sources.length === 0) return { refusal: `var(${prop}) is set by no rule of the sheet and no theme variable` };
        }
        const expansions = [];
        for (const source of sources) {
            const inner = readings(source, { defs, rootStack }, new Set([...seen, prop]));
            if (inner.refusal !== undefined) return inner;
            expansions.push(...inner.lists);
        }
        options = options.flatMap((names) => expansions.map((more) => [...names, ...more]));
        if (options.length > MAX_STACK_VARIANTS) {
            return { refusal: `a family list with more than ${MAX_STACK_VARIANTS} readings through var(${prop}) — this reader does not walk that many` };
        }
    }
    return { lists: options };
}

/**
 * The stacks a sheet sets, each as `{ line, prop, list, raw, selectors,
 * refusal }`; `list` undefined, and `refusal` the sentence, for a `font`
 * shorthand this reader cannot read and for an `all` that resets
 * `font-family` (anything but `inherit` or `unset`: `all: initial` sets the
 * browser's default family, a machine font, with no list to read — the
 * re-review's R-1, refused here as the look rules refuse it, so this guard
 * does not lean on them); `selectors` undefined in a keyframe stop.
 */
function stacksOf(css) {
    const out = [];
    for (const rule of sheetParts(css).rules) {
        for (const { prop, value } of rule.decls) {
            const clean = value.replace(/\s*!\s*important\s*$/i, '').trim();
            if (clean.toLowerCase() === 'inherit') continue;
            const at = { line: rule.line, prop, raw: clean, selectors: rule.selectors };
            if (prop === 'font-family' || /^--s-font[\w-]*$/.test(prop)) {
                out.push({ ...at, list: clean });
            } else if (prop === 'font') {
                const list = shorthandFamilies(clean);
                out.push({ ...at, list, refusal: list === undefined ? 'a font shorthand whose family this reader cannot read; write the family in font-family' : undefined });
            } else if (prop === 'all' && clean.toLowerCase() !== 'unset') {
                out.push({ ...at, list: undefined, refusal: "resets font-family to the browser's default, a font of the reader's machine; write all only as inherit or unset, and the family in font-family" });
            }
        }
    }
    return out;
}

/** Every code point to walk: what the app prints, with where, and the upper and lower case forms of each (`text-transform` paints those). */
function walkedCodePoints(printed) {
    const out = new Map();
    for (const [cp, where] of printed) out.set(cp, [...where].slice(0, 2).join(', '));
    for (const [cp] of printed) {
        const ch = String.fromCodePoint(cp);
        for (const form of [ch.toUpperCase(), ch.toLowerCase()]) {
            for (const c of form) {
                const k = c.codePointAt(0);
                if (!out.has(k) && !NO_GLYPH.test(c)) out.set(k, `case form of ${cpName(cp)}`);
            }
        }
    }
    return out;
}

/** True when the first family of the list that is not one of the look's own is a served family. */
function servedBeforeMachine(names, own, served) {
    for (const name of names) {
        const key = name.toLowerCase();
        if (own.has(key)) continue;
        return served.has(key);
    }
    return false;
}

/**
 * Guard 2 (`a-private-stack-falls-to-a-served-face-for-what-its-faces-lack`).
 * `printed` is `printedCodePoints`' map; `pinned` the pinned list as a map
 * from code point to `{ faces }` (the set names that lack it); `rootStack`
 * the theme's `--s-font` for the look's row; `cls` the look's class,
 * `tree` its packed tree (the merged list's `look.packedTree`; a pin
 * excuses nothing in a look without one) and `pins` the named stacks
 * excused (`PINNED_STACKS`). Answers `{ problems,
 * failures, excused, read, walked }`: the sentences of every stack that
 * fails and is not pinned (and of a pin that is not live), every stack that
 * fails as `{ line, prop, raw, selectors, problems, gaps, pin }` (`pin` set
 * when a pin excuses it, which is how the canary's pin is held live), those
 * excused, the stacks the sheet sets and the distinct readings walked.
 * `gaps` are `{ line, prop, names, structure, cps }`.
 */
export function stackReport({ path = 'sheet.css', css, art, rootStack, printed, pinned, served = servedFamilies(), cls, tree, pins = PINNED_STACKS }) {
    const look = { cls, tree };
    const faces = ownFaceSet({ css, art });
    const problems = [...faces.problems];
    const own = ownFamilies(faces.faces);
    const stacks = stacksOf(css);
    const defs = new Map();
    for (const stack of stacks) {
        if (stack.list === undefined || !/^--s-font[\w-]*$/.test(stack.prop)) continue;
        if (!defs.has(stack.prop)) defs.set(stack.prop, []);
        if (!defs.get(stack.prop).includes(stack.list)) defs.get(stack.prop).push(stack.list);
    }
    const walk = walkedCodePoints(printed);
    const cps = [...walk.keys()].sort((a, b) => a - b);
    const seen = new Set();
    const gaps = [];
    const failures = [];
    const excused = [];
    const live = new Set();
    let walked = 0;
    for (const stack of stacks) {
        const shown = `${stack.prop}: ${echo(stack.raw, 60)}`;
        const where = `${path}: line ${stack.line}: ${shown}`;
        const mine = [];
        const mineGaps = [];
        if (stack.list === undefined) {
            mine.push(`${where} — ${stack.refusal}`);
        } else {
            const read = readings(stack.list, { defs, rootStack });
            if (read.refusal !== undefined) {
                mine.push(`${where} — cannot decide: ${read.refusal}`);
            } else {
                for (const names of read.lists) {
                    const key = names.join('\u0000').toLowerCase();
                    const first = !seen.has(key);
                    seen.add(key);
                    if (first) walked += 1;
                    const structure = !servedBeforeMachine(names, own, served);
                    const missing = cps.filter((cp) => {
                        if (drawnBy(names, cp, own, served) !== 'machine') return false;
                        const entry = pinned.get(cp);
                        return !(
                            entry !== undefined &&
                            names.some((name) => {
                                const family = served.get(name.toLowerCase());
                                return family !== undefined && family.variants.every((variant) => entry.faces.includes(variant.label));
                            })
                        );
                    });
                    if (!structure && missing.length === 0) continue;
                    const record = { line: stack.line, prop: stack.prop, names, structure, cps: missing };
                    mineGaps.push(record);
                    const parts = [];
                    if (structure) {
                        parts.push("names no served family before a family the machine supplies, so a letter its own face lacks, a seller's included, is drawn per OS");
                    }
                    if (missing.length > 0) {
                        const shownCps = missing.slice(0, MAX_SHOWN_GAPS).map((cp) => `${cpName(cp)} (${walk.get(cp)})`);
                        parts.push(
                            `leaves ${shownCps.join('; ')}${missing.length > MAX_SHOWN_GAPS ? ` and ${missing.length - MAX_SHOWN_GAPS} more` : ''} to a font of the reader's machine: no face it names draws them before a family the machine supplies, and no served face it names is known to lack them`,
                        );
                    }
                    mine.push(
                        `${where}${names.join(', ') === stack.raw ? '' : ` [read as ${echo(names.join(', '), 80)}]`} ${parts.join('; and ')} — ` +
                            "end the stack in a served face ('Stall Serif') right after the look's own, before any system family (a-private-stack-falls-to-a-served-face-for-what-its-faces-lack)",
                    );
                }
            }
        }
        const pin = pins.find((candidate) => stackMatchesPin(candidate, look, stack));
        if (pin !== undefined) live.add(pin);
        // The pinned rule in a look of the pin's class whose packed tree is not the pin's: said, so the walk is not read as the pin having gone.
        const other = pin === undefined ? pins.find((candidate) => candidate.cls === cls && candidate.tree !== tree && namesPinnedRule(candidate, stack)) : undefined;
        const said = other === undefined ? mine : mine.map((line) => `${line} [the pin for this rule excuses it only in the canary's packed tree ${other.tree.slice(0, 12)}, and this look's is ${tree === undefined ? 'not given' : tree.slice(0, 12)}]`);
        if (mine.length > 0) {
            failures.push({ line: stack.line, prop: stack.prop, raw: stack.raw, selectors: stack.selectors, problems: said, gaps: mineGaps, pin });
        }
        if (pin === undefined) {
            problems.push(...said);
            gaps.push(...mineGaps);
        } else if (mine.length > 0) {
            excused.push({ pin, line: stack.line, problems: mine });
        } else {
            problems.push(`${where} — the pin for ${pin.selector} { ${pin.prop}: ${pin.stack} } excuses a stack that passes; remove the pin (${pin.why})`);
        }
    }
    for (const pin of pins) {
        if (pinIsFor(pin, look) && !live.has(pin)) {
            problems.push(`${path}: the pin for ${pin.selector} { ${pin.prop}: ${pin.stack} } matches no stack of this sheet; the stack changed or went, so remove the pin (${pin.why})`);
        }
    }
    return { problems, gaps, failures, excused, read: stacks.length, walked };
}

/**
 * The faces excused from the refusal of a face with no range, by name, each
 * live or a failure (`scriptReport`): a look class and its packed tree, the
 * face's family and its file, and why. The canary's one face
 * (`t-canary-mono`, the tracked JetBrains Mono Latin subset with one byte
 * changed) states no `unicode-range`; the canary is preview-only public
 * bytes held by a hash (`CANARY_TREE`), and a range is a change to those
 * bytes — a new canary commit in the private repository, a new pin and
 * `CANARY_TREE` — that is the owner's, not this guard's. The pin excuses the
 * refusal of the missing range and nothing else: the face is still asked
 * for every character. It leaves in the same diff as the range comes
 * (its tripwire forces it).
 */
export const PINNED_RANGELESS_FACES = Object.freeze([
    Object.freeze({
        cls: 't-canary',
        tree: CANARY_TREE,
        family: 't-canary-mono',
        file: 'art/jetbrains-mono-latin.woff2',
        why: "the canary's one face states no unicode-range, and the canary is preview-only public bytes held by a hash; a range is a new canary commit, which is the owner's",
    }),
]);

/** What a face's range does not state, as a sentence part, or undefined when it states a range this reader walks. */
function rangeNotStated(face) {
    if (face.declared.trim() === '') return 'is not declared, so the face is asked for every character';
    if (face.ranges.length === 0) return 'names no code point (a browser drops a descriptor it cannot read, and the face is then asked for every character)';
    const size = face.ranges.reduce((n, [lo, hi]) => n + hi - lo + 1, 0);
    if (size > MAX_RANGE_CODE_POINTS) return `names ${size} code points, more than the ${MAX_RANGE_CODE_POINTS} this reader walks, so the face is asked for nearly every character`;
    return undefined;
}

/**
 * Guard 3 (`a-private-face-range-never-takes-one-letter-of-another-script`).
 * `read` is `ownFaceSet`'s answer for the look's sheet and art, `fontsText`
 * its `fonts.json` (undefined when it has none), `cls` the look's class,
 * `tree` its packed tree and `pins` the faces excused (`PINNED_RANGELESS_FACES`).
 * Answers `{ problems, excused, faces, count }`: the sentences (the faces
 * `ownFaceSet` could not read first, then one per face that fails and per
 * pin that is not live), the faces a pin excused as `{ pin, face }`, how many
 * faces were read and how many code points were walked.
 */
export function scriptReport({ path = 'sheet.css', read, fontsText, cls, tree, pins = PINNED_RANGELESS_FACES }) {
    const look = { cls, tree };
    const problems = [...read.problems];
    const excused = [];
    const subsets = new Map();
    let fontsWhy;
    if (fontsText === undefined) {
        fontsWhy = 'the look has no fonts.json';
    } else {
        const { fonts, problems: shape } = parseLookFonts(fontsText);
        if (fonts === undefined) {
            fontsWhy = `fonts.json cannot be read (${shape.map((why) => echo(why, 80)).join('; ')})`;
        } else {
            for (const font of fonts) {
                for (const [file, subset] of Object.entries(font.files)) if (!subsets.has(file)) subsets.set(file, subset);
            }
        }
    }
    const live = new Set();
    let count = 0;
    for (const face of read.faces) {
        const name = face.file.replace(/^art\//, '');
        const where = `${path}: line ${face.line}: ${face.file} ("${echo(face.family)}")`;
        const subset = subsets.get(name);
        if (subset === undefined) {
            problems.push(
                `${where}: ${fontsWhy ?? 'fonts.json names no subset for it'} — this reader cannot tell which script the face is cut for, so which letters its unicode-range may name (a-private-face-range-never-takes-one-letter-of-another-script)`,
            );
            continue;
        }
        const script = scriptOfSubset(subset.toLowerCase());
        if (script === undefined) {
            problems.push(
                `${where}: its subset "${echo(subset)}" in fonts.json is one whose script SUBSET_SCRIPTS does not name (${Object.keys(SUBSET_SCRIPTS).join(', ')}) — a subset is added there with its own script, on purpose (a-private-face-range-never-takes-one-letter-of-another-script)`,
            );
            continue;
        }
        const pin = pins.find((candidate) => pinIsFor(candidate, look) && candidate.family === face.family && candidate.file === face.file);
        if (pin !== undefined) live.add(pin);
        const missing = rangeNotStated(face);
        if (missing !== undefined) {
            if (pin !== undefined && face.declared.trim() === '') {
                excused.push({ pin, face });
            } else {
                problems.push(
                    `${where}: unicode-range ${missing} — a seller's words in another script would draw whatever letters the file holds here and the rest in a font of the reader's machine: state the range of the ${echo(subset)} subset ` +
                        `(a-private-face-range-never-takes-one-letter-of-another-script)${pin === undefined ? '' : ' [the pin for this face excuses only a face that declares no unicode-range at all]'}`,
                );
            }
            continue;
        }
        if (pin !== undefined) {
            problems.push(`${where}: the pin for ${pin.file} excuses a face that states a range; remove the pin (${pin.why})`);
        }
        const result = lettersOfAnotherScript([{ name: face.family, faces: [{ file: face.file, ranges: face.ranges, script }] }]);
        count += result.count;
        if (result.letters.length > 0) {
            const shown = result.letters.slice(0, MAX_SHOWN_GAPS).map(({ cp }) => cpName(cp));
            problems.push(
                `${where}: unicode-range names ${shown.join(', ')}${result.letters.length > MAX_SHOWN_GAPS ? ` and ${result.letters.length - MAX_SHOWN_GAPS} more` : ''}, letters of another script than its ${echo(subset)} subset's ${script} — ` +
                    "a seller's word in that script would draw those letters in this face and the rest in a font of the reader's machine: remove the tokens (a-private-face-range-never-takes-one-letter-of-another-script)",
            );
        }
    }
    for (const pin of pins) {
        if (pinIsFor(pin, look) && !live.has(pin)) {
            problems.push(`${path}: the pin for ${pin.file} (${pin.family}) matches no face of this sheet that fonts.json names a subset for; the face changed or went, so remove the pin (${pin.why})`);
        }
    }
    return { problems, excused, faces: read.faces.length, count };
}

/**
 * The theme's `--s-font` for a look's row: `FONT_STACKS[fontIndex]`, the
 * index the look states or its base row's. `theme` is `src/domain/theme.ts`
 * (Node's type stripping reads it: it imports nothing). Undefined when the
 * look names no base the theme table has.
 */
export function rootStackOf(look, theme) {
    const ids = { modern: theme.DEFAULT_THEME_ID, neo: theme.NEO_CITY_THEME_ID, rural: theme.RURAL_THEME_ID };
    const id = Object.hasOwn(ids, look?.base) ? ids[look.base] : undefined;
    if (id === undefined) return undefined;
    const index = Number.isInteger(look.fontIndex) ? look.fontIndex : theme.decodeTheme(id).fontIndex;
    return theme.FONT_STACKS[index];
}

/**
 * The line the two guards say what they read with, on stderr: each look,
 * where it came from, how many faces and stacks it gave them (`note` adds a
 * word, such as the stacks left unwalked) — and, when no look served a face
 * or set a stack, that there was nothing of the kind to read (a guard that
 * read nothing says so rather than passing quietly).
 */
export function privateFacesLine(guard, reads, noun) {
    const parts = reads.map((read) => `${read.cls} (${read.source}: ${read.count} ${noun}${read.count === 1 ? '' : 's'}${read.note === undefined ? '' : `, ${read.note}`})`);
    const none = reads.every((read) => read.count === 0);
    return `${guard} read private looks: ${parts.length === 0 ? 'none' : parts.join(', ')}${none ? ` — none of them has a ${noun}, so there was nothing to read here` : ''}\n`;
}
