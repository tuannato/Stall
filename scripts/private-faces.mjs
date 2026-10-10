/**
 * Two static guards over a private look's own faces, read from the look's
 * sheet and its `art/` as git holds them (the 8g-pre row of the step-8 plan,
 * "by recommendation"; the critic's P3-14). Both are the shipped faces'
 * checks (`scripts/served-faces.mjs`, `scripts/served-faces.test.mjs`)
 * applied to the faces a private look declares:
 *
 * **1. A private face's `unicode-range` claims no code point its own file
 * lacks** (`rangeProblems`, the `DECLARED_NOT_HELD` check). A browser asked
 * for a character a range names fetches the face, finds no glyph and draws
 * the character from another font — a `.notdef` or the reader's machine's,
 * differently on every OS. Read on the range's own tokens, **not on the
 * merged pairs** the shipped check reads (`rangePairs` merges
 * `U+20B9, U+20BA` into one span, which that check cannot call a single
 * code point): every token that names one code point on its own is held to
 * the file's `cmap`. A span (`U+0-FF`) or a wildcard is not walked — it
 * names control characters and unassigned points no file holds and no page
 * prints; what it claims of the app's own text is read by the second check.
 *
 * **2. A private look's stack names a served face after its own, for every
 * code point the app prints that its faces lack** (`stackReport`). For each
 * font stack the sheet uses — every `font-family`, the family list of every
 * `font` shorthand, every `--s-font…` value — and each code point the app
 * prints (`printedCodePoints`: its own literals, the sheets' `content` and
 * `GENERATED_TEXT`, printable ASCII), the stack is walked as a browser walks
 * it, one character at a time: a family draws the character when one of its
 * faces' `unicode-range` names it and the file's `cmap` holds it (own
 * families read from the sheet's `@font-face` rules, served ones from
 * `stall.css`); a family that does not goes on to the next. The character
 * must be drawn by an own or a served face **before** the walk meets a
 * family the machine supplies (a system name, a generic, a name nothing
 * declares) or runs out of list — after which it is drawn per OS, and a
 * private look that drops `'Stall Serif'` from its stack sends `≈` on the
 * rate line, a money node, there.
 *
 * What stays per-OS on the shipped looks stays per-OS here, stated: a
 * character on the pinned list (`PRINTED_NOT_HELD`, `scripts/served-faces
 * .test.mjs`) is excused **for a served family the stack names whose every
 * face lacks it** — the shipped situation exactly. A stack that names no
 * served family has no such excuse; it is told to name one.
 *
 * **What the walk cannot decide, it refuses** (a sentence, never a guess):
 * a family list set through a `var()` other than the theme's `--s-font…`, a
 * `--s-font…` the sheet and the theme leave undefined, a custom property
 * that refers to itself, a `font` shorthand whose family it cannot read, more
 * than `MAX_STACK_VARIANTS` readings of one list, and a face whose file the
 * art does not hold or whose `cmap` it cannot read.
 * `var(--s-font…)` is read as every value the sheet gives the property
 * **and** the theme's own (`FONT_STACKS[fontIndex]` of the look's row): the
 * root's `--s-font` is set inline by the theme and a sheet cannot override it
 * on the same element, so a restatement reaches only the elements below it.
 *
 * **One scope is not walked** (`SELLER_WORDS_ONLY`): a rule whose every
 * selector ends in `.stall-tagline` and names no pseudo-element sets the face
 * of a line that holds the seller's own words and none of the app's —
 * `header()` writes it from the seller's tagline alone, and no served sheet
 * prints generated text on it (`the-tagline-line-holds-only-the-sellers-words`;
 * a sheet that does, `generatedTextOn`, loses the exemption). That is the
 * canary's only stack, on a face of its own with no served face after it.
 *
 * Pure over strings and buffers, and the shipped faces' readers. The tests
 * that drive it over every private look a run reads, over planted
 * repositories and over the canary built from public bytes are in
 * `scripts/served-faces.test.mjs`.
 */
import { woff2CodePoints } from './look-faces.mjs';
import { rangePairs } from './probe-faces.mjs';
import { NO_GLYPH, cpName, servedFaceSets } from './served-faces.mjs';
import { declarationsOf, echo, firstFamily, parseSheet, shorthandFamilies, splitTopLevel } from './workshop-css.mjs';

/** The most readings of one family list this reader walks; past it, it refuses. */
export const MAX_STACK_VARIANTS = 16;

/** The most code points one sentence names; the rest are counted (`gaps` of the report lists them all). */
const MAX_SHOWN_GAPS = 12;

/**
 * The subjects whose font the app writes no string of its own in: a rule
 * whose every selector's last compound is one of these (and names no
 * pseudo-element, whose generated text is the app's) is not walked.
 * `the-tagline-line-holds-only-the-sellers-words` holds each to the source.
 */
export const SELLER_WORDS_ONLY = Object.freeze([
    {
        subject: 'stall-tagline',
        why: "the sign's tagline line: `header()` writes it from the seller's tagline alone, never from a string of the app's",
    },
]);

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
        const ranges = rangePairs(declared);
        if (ranges === undefined) {
            problems.push(`${where}: unicode-range "${echo(declared)}" is not one this reader parses`);
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
            if (pairs === undefined) {
                out.push(`line ${face.line}: ${face.file}: unicode-range token "${echo(text)}" is not one this reader parses`);
                continue;
            }
            for (const [lo, hi] of pairs) {
                if (lo === hi && !face.held.has(lo) && !NO_GLYPH.test(String.fromCodePoint(lo)) && !claimed.includes(lo)) claimed.push(lo);
            }
        }
        if (claimed.length > 0) {
            out.push(
                `line ${face.line}: ${face.file}: unicode-range names ${claimed.map(cpName).join(', ')} on ${claimed.length === 1 ? 'its' : 'their'} own and the file holds no glyph for ${claimed.length === 1 ? 'it' : 'them'} — ` +
                    'the browser fetches the face for the character and draws it from a font of the reader\'s machine (a-private-face-claims-only-what-its-file-draws)',
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

/** A selector's last compound, with strings and everything inside `()` and `[]` turned into `_`, so a combinator inside them splits nothing. */
function lastCompound(selector) {
    let flat = '';
    let depth = 0;
    let quote;
    for (const ch of selector) {
        if (quote !== undefined) {
            if (ch === quote) quote = undefined;
            flat += '_';
        } else if (ch === '"' || ch === "'") {
            quote = ch;
            flat += '_';
        } else if (ch === '(' || ch === '[') {
            depth += 1;
            flat += ch;
        } else if (ch === ')' || ch === ']') {
            depth -= 1;
            flat += ch;
        } else {
            flat += depth > 0 ? '_' : ch;
        }
    }
    return flat.trim().split(/[\s>+~]+/).pop() ?? '';
}

const PSEUDO_ELEMENT = /::|:(?:before|after|first-line|first-letter)(?![\w-])/i;
const namesSubject = (compound, subject) => new RegExp(`(?:^|[^\\w-])\\.${subject}(?![\\w-])`).test(compound);

/**
 * The subjects of `SELLER_WORDS_ONLY` that a sheet puts generated text on: a
 * pseudo-element of the line with a `content` other than `none` or `normal`
 * prints a string of the app's in the line's own font, so the line is no
 * longer the seller's words alone and its stacks are walked.
 */
export function generatedTextOn(css) {
    const out = new Set();
    for (const rule of sheetParts(css).rules) {
        const printing = rule.decls.some((decl) => decl.prop === 'content' && !/^(?:none|normal)$/i.test(decl.value.replace(/\s*!\s*important\s*$/i, '').trim()));
        if (!printing) continue;
        for (const selector of rule.selectors ?? []) {
            const compound = lastCompound(selector);
            if (!PSEUDO_ELEMENT.test(compound)) continue;
            for (const { subject } of SELLER_WORDS_ONLY) if (namesSubject(compound, subject)) out.add(subject);
        }
    }
    return out;
}

/**
 * A selector whose subject the app writes no string of its own in
 * (`SELLER_WORDS_ONLY`): its last compound names the subject and no
 * pseudo-element (whose generated text is the app's), and `voided` — the
 * subjects `generatedTextOn` found in the sheet — does not hold it.
 */
export function sellerWordsOnly(selector, voided = new Set()) {
    const compound = lastCompound(selector);
    if (PSEUDO_ELEMENT.test(compound) || /:(?:is|where|not|has|matches)(?![\w-])/i.test(compound)) return false;
    return SELLER_WORDS_ONLY.some(({ subject }) => !voided.has(subject) && namesSubject(compound, subject));
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
            if (rootStack === undefined) return { refusal: "var(--s-font) is the theme's, and this look's row names no stack this reader can read" };
            sources.push(rootStack);
        } else if (sources.length === 0) {
            if (fallback === undefined) return { refusal: `var(${prop}) is set by no rule of the sheet and no theme variable` };
            sources.push(fallback.trim());
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

/** The stacks a sheet sets, each as `{ line, prop, list, raw, exempt }`; `list` undefined for a `font` shorthand this reader cannot read. */
function stacksOf(css, voided) {
    const out = [];
    for (const rule of sheetParts(css).rules) {
        const exempt = rule.selectors !== undefined && rule.selectors.length > 0 && rule.selectors.every((selector) => sellerWordsOnly(selector, voided));
        for (const { prop, value } of rule.decls) {
            const clean = value.replace(/\s*!\s*important\s*$/i, '').trim();
            if (clean.toLowerCase() === 'inherit') continue;
            if (prop === 'font-family' || /^--s-font[\w-]*$/.test(prop)) {
                out.push({ line: rule.line, prop, list: clean, raw: clean, exempt });
            } else if (prop === 'font') {
                out.push({ line: rule.line, prop, list: shorthandFamilies(clean), raw: clean, exempt });
            }
        }
    }
    return out;
}

/**
 * Guard 2 (`a-private-stack-falls-to-a-served-face-for-what-its-faces-lack`).
 * `printed` is `printedCodePoints`' map; `pinned` the pinned list as a map
 * from code point to `{ faces }` (the set names that lack it); `rootStack`
 * the theme's `--s-font` for the look's row. Answers `{ problems, read,
 * exempt, walked, gaps, voided }`: the stacks the sheet sets, those a
 * seller-words-only rule sets (not walked), the distinct readings walked,
 * for each that leaves code points to the machine `{ line, prop, names,
 * cps }`, and the seller-words-only subjects the sheet itself prints
 * generated text on (`generatedTextOn`), whose stacks are walked after all.
 */
export function stackReport({ path = 'sheet.css', css, art, rootStack, printed, pinned, served = servedFamilies() }) {
    const faces = ownFaceSet({ css, art });
    const problems = [...faces.problems];
    const own = ownFamilies(faces.faces);
    const voided = generatedTextOn(css);
    const stacks = stacksOf(css, voided);
    const defs = new Map();
    for (const stack of stacks) {
        if (stack.exempt || stack.list === undefined || !/^--s-font[\w-]*$/.test(stack.prop)) continue;
        if (!defs.has(stack.prop)) defs.set(stack.prop, []);
        if (!defs.get(stack.prop).includes(stack.list)) defs.get(stack.prop).push(stack.list);
    }
    const cps = [...printed.keys()].sort((a, b) => a - b);
    const seen = new Set();
    const found = [];
    let exempt = 0;
    let walked = 0;
    for (const stack of stacks) {
        if (stack.exempt) {
            exempt += 1;
            continue;
        }
        const shown = `${stack.prop}: ${echo(stack.raw, 60)}`;
        if (stack.list === undefined) {
            problems.push(`${path}: line ${stack.line}: ${shown} — a font shorthand whose family this reader cannot read; write the family in font-family`);
            continue;
        }
        const read = readings(stack.list, { defs, rootStack });
        if (read.refusal !== undefined) {
            problems.push(`${path}: line ${stack.line}: ${shown} — cannot decide: ${read.refusal}`);
            continue;
        }
        for (const names of read.lists) {
            const key = names.join('\u0000').toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            walked += 1;
            const gaps = cps.filter((cp) => {
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
            if (gaps.length > 0) {
                found.push({ line: stack.line, prop: stack.prop, names, cps: gaps });
                const shownCps = gaps.slice(0, MAX_SHOWN_GAPS).map((cp) => `${cpName(cp)} (${[...printed.get(cp)].slice(0, 2).join(', ')})`);
                problems.push(
                    `${path}: line ${stack.line}: ${shown}${names.join(', ') === stack.raw ? '' : ` [read as ${echo(names.join(', '), 80)}]`} leaves ${shownCps.join('; ')}${gaps.length > MAX_SHOWN_GAPS ? ` and ${gaps.length - MAX_SHOWN_GAPS} more` : ''} ` +
                        "to a font of the reader's machine: no face it names draws them before a family the machine supplies, and no served face it names is known to lack them — " +
                        "name a served face ('Stall Serif') right after the look's own, before any system family (a-private-stack-falls-to-a-served-face-for-what-its-faces-lack)",
                );
            }
        }
    }
    return { problems, gaps: found, read: stacks.length, exempt, walked, voided: [...voided] };
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
