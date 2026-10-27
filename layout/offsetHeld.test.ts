/**
 * `the-keyframe-offset-read-holds-every-held-longhand-the-value-decides`:
 * the static half of the dress rule's read at every keyframe offset
 * (`offsetDressFaults` in `layout/probe.ts`; before 8g2, the fourth review's
 * item 1). The read holds a figure's own elements on `OFFSET_HELD_OWN`, which
 * is `DRESS_HELD` less the reads that need the geometry (`OFFSET_GEOMETRY`).
 * It was a list of 17 copied by hand, and left out `font-size-adjust`,
 * `text-indent`, `word-spacing`, `direction`, `writing-mode`,
 * `text-emphasis-style` and the lines drawn through a figure from a box
 * above: the critic's PFA, a keyframe `font-size-adjust: 0.05` on Rural's
 * quote `.item-a`, passed the whole runner. Here the lists are parsed out of
 * the probe strictly, and `OFFSET_GEOMETRY` is held to exactly the held
 * longhands `dressHeldFault` answers nothing for — so a held longhand with a
 * reader of its own value is read at the offsets the day it is held, and one
 * whose read needs the geometry is named for it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROBE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'probe.ts'), 'utf8');

/** The single-quoted members of `const NAME … = new Set([ … ])`, parsed strictly: anything but a single-quoted string fails. */
function setOf(name: string): string[] {
    const m = new RegExp(`const ${name}\\b[^=]*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`).exec(PROBE);
    expect(m, `layout/probe.ts states ${name} as a list`).not.toBeNull();
    const items = m![1]!
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');
    for (const item of items) expect(item, `${name} holds ${item}, which this parse cannot read`).toMatch(/^'[^'\\\n]+'$/);
    return items.map((item) => item.slice(1, -1));
}

/** `dressHeldFault`'s cases, by group: the labels of each run of `case` lines and the body under them, comments out. */
function heldCases(): { labels: string[]; body: string }[] {
    const start = PROBE.indexOf('function dressHeldFault(');
    expect(start, 'layout/probe.ts declares dressHeldFault').toBeGreaterThanOrEqual(0);
    const end = PROBE.indexOf('\n}\n', start);
    const lines = PROBE.slice(start, end).split('\n');
    const groups: { labels: string[]; body: string }[] = [];
    let current: { labels: string[]; body: string } | undefined;
    let inBody = false;
    for (const line of lines) {
        const label = /^ {8}case '([^']+)':(?:\s*\{)?$/.exec(line);
        if (label !== null) {
            if (current === undefined || inBody) {
                current = { labels: [], body: '' };
                groups.push(current);
                inBody = false;
            }
            current.labels.push(label[1]!);
            continue;
        }
        if (/^ {8}default:/.test(line)) break;
        if (current === undefined) continue;
        const code = line.replace(/\/\/.*$/, '').trim();
        if (code === '') continue;
        inBody = true;
        current.body += `${code}\n`;
    }
    return groups;
}

/** A function's body in the probe, comments out and whitespace flattened to one space: the loops are pinned on it. */
function flatBody(name: string): string {
    const start = PROBE.indexOf(`function ${name}(`);
    expect(start, `layout/probe.ts declares ${name}`).toBeGreaterThanOrEqual(0);
    const end = PROBE.indexOf('\n}\n', start);
    return PROBE.slice(start, end)
        .split('\n')
        .map((line) => line.replace(/^\s*\/\/.*$/, ''))
        .join('\n')
        .replace(/\s+/g, ' ');
}
const offsetReadBody = (): string => flatBody('offsetDressFaults');

/** A function's body in the probe, by name, from its head to its closing line. */
function bodyOf(name: string): string {
    const start = PROBE.indexOf(`function ${name}(`);
    expect(start, `layout/probe.ts declares ${name}`).toBeGreaterThanOrEqual(0);
    return PROBE.slice(start, PROBE.indexOf('\n}\n', start));
}

/** The span of `body` from `head` to the brace that closes the block it opens. */
function blockOf(body: string, head: string): string {
    const start = body.indexOf(head);
    expect(start, `the body holds ${head}`).toBeGreaterThanOrEqual(0);
    let depth = 0;
    for (let i = body.indexOf('{', start); i < body.length; i += 1) {
        if (body[i] === '{') depth += 1;
        else if (body[i] === '}') {
            depth -= 1;
            if (depth === 0) return body.slice(start, i + 1);
        }
    }
    throw new Error(`the block ${head} does not close`);
}

/** The longhands a body reads off `cs`: a `cs.camelCase` property (never a method), and a `cs.getPropertyValue('…')`, a `border-${side}-…` template read over the four sides. */
function readsOf(body: string): Set<string> {
    const out = new Set<string>();
    for (const m of body.matchAll(/\bcs\.([a-zA-Z]+)\b(?!\s*\()/g)) out.add(m[1]!.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
    for (const m of body.matchAll(/\bcs\.getPropertyValue\((['`])([^'`]+)\1\)/g)) {
        const value = m[2]!;
        if (value.includes('${side}')) for (const side of ['top', 'right', 'bottom', 'left']) out.add(value.replace('${side}', side));
        else out.add(value);
    }
    return out;
}

/**
 * `the-ground-signature-names-every-longhand-boxPaintsOf-and-borderImageReach-read`:
 * the offset read reads a figure's ground again only where a seek changed a
 * longhand of `GROUND_SIGNATURE` on its walk (or moved its text,
 * `inkSignature`), so a longhand the paint read reads — `boxPaintsOf`, and
 * `borderImageReach`, the one helper it hands its style to — that the
 * signature leaves out is a ground a keyframe can change unread: the sixth
 * review's PGatt3, `background-attachment: fixed` in a keyframe on Modern's
 * quote figure over a tile of the page's ground, seeked and never read
 * again. Every longhand those two read of any box is held to the part a box
 * above is compared on (before `GROUND_ABOVE`, which is pinned), and every
 * one they read of a figure's own elements alone to the whole list. No
 * longhand is left out today; one left out is named in `GROUND_EXCLUDED`
 * with its reason, and an exclusion they do not read fails. **What this
 * does not parse, stated** (the seventh review's P3): `groundStackFault`,
 * the ground read itself, also reads a box's `overflow-x`, `overflow-y` and
 * `contain` (where a box clips the ink it reads under) and the ink's own
 * lines; a clip only narrows what is read, and where the glyphs stand is
 * `inkSignature`'s.
 */
const GROUND_EXCLUDED: Record<string, string> = {};

describe('the-ground-signature-names-every-longhand-boxPaintsOf-and-borderImageReach-read', () => {
    const signature = setOf('GROUND_SIGNATURE');
    const paints = bodyOf('boxPaintsOf');
    const ownBlock = blockOf(paints, "if (own && cs.backgroundImage !== 'none') {");

    it('hands its style to no helper but borderImageReach, and reads that one too', () => {
        const helpers = new Set([...paints.matchAll(/\b(\w+)\((?:[^()]*,\s*)?cs\s*[,)]/g)].map((m) => m[1]!));
        expect([...helpers].sort()).toEqual(['borderImageReach']);
    });

    it('names every longhand the ground read reads of any box before GROUND_ABOVE, and of a figure’s own elements in the list', () => {
        expect(PROBE).toContain("const GROUND_ABOVE = GROUND_SIGNATURE.indexOf('background-image');");
        expect(PROBE).toContain('(own ? GROUND_SIGNATURE : GROUND_SIGNATURE.slice(0, GROUND_ABOVE))');
        const above = signature.slice(0, signature.indexOf('background-image'));
        const ownOnly = readsOf(ownBlock);
        const any = readsOf(paints.replace(ownBlock, ''));
        for (const prop of readsOf(bodyOf('borderImageReach'))) any.add(prop);
        // The parse reads what it should: the longhands the sixth review found left out among them.
        for (const prop of ['color', 'box-shadow', 'padding-top', 'border-image-outset']) expect(any, prop).toContain(prop);
        for (const prop of ['background-image', 'background-attachment', 'background-position-x']) expect(ownOnly, prop).toContain(prop);
        for (const prop of any) {
            if (prop in GROUND_EXCLUDED) continue;
            expect(above, `boxPaintsOf reads ${prop} of a box above, and GROUND_SIGNATURE does not name it before GROUND_ABOVE`).toContain(prop);
        }
        for (const prop of ownOnly) {
            if (prop in GROUND_EXCLUDED) continue;
            expect(signature, `boxPaintsOf reads ${prop} of a figure's own element, and GROUND_SIGNATURE does not name it`).toContain(prop);
        }
        for (const prop of Object.keys(GROUND_EXCLUDED)) expect(new Set([...any, ...ownOnly]), `GROUND_EXCLUDED names ${prop}, which the ground read does not read`).toContain(prop);
    });
});

describe('the-keyframe-offset-read-holds-every-held-longhand-the-value-decides', () => {
    const held = setOf('DRESS_HELD');
    const geometry = setOf('OFFSET_GEOMETRY');
    const cases = heldCases();

    it('parses the probe whole', () => {
        expect(held.length).toBeGreaterThan(40);
        expect(geometry.length).toBeGreaterThan(5);
        expect(cases.length).toBeGreaterThan(30);
    });

    it('derives OFFSET_HELD_OWN from DRESS_HELD in code, never as a list of its own', () => {
        expect(PROBE).toMatch(/const OFFSET_HELD_OWN: readonly string\[\] = \[\.\.\.DRESS_HELD\]\.filter\(\(prop\) => !OFFSET_GEOMETRY\.has\(prop\)\);/);
        expect(PROBE.match(/const OFFSET_HELD_OWN\b/g)).toHaveLength(1);
    });

    it('gives every held longhand a case of dressHeldFault', () => {
        const labelled = new Set(cases.flatMap((c) => c.labels));
        for (const prop of held) expect(labelled.has(prop), `DRESS_HELD names ${prop}, which dressHeldFault has no case for`).toBe(true);
    });

    it('names in OFFSET_GEOMETRY exactly the held longhands dressHeldFault answers nothing for', () => {
        for (const prop of geometry) expect(held, `OFFSET_GEOMETRY names ${prop}, which DRESS_HELD does not hold`).toContain(prop);
        const nothing = cases.filter((c) => c.body.trim() === 'return undefined;').flatMap((c) => c.labels);
        expect([...geometry].sort()).toEqual([...nothing].sort());
    });

    /*
     * The fifth review's item 8: a loop over `OFFSET_HELD_OWN.filter(p => p !==
     * 'font-size-adjust' && p !== 'text-indent')` left the definition the test
     * held and read neither longhand; and the sixth review's three mutations
     * of the guards around the loops (m1: the own-element guard `el !== target
     * && !target.contains(el)` cut to `el !== target`, which reads no own
     * element under the animated box; m2: the held loop's style read off the
     * stall, `getComputedStyle(r.stall)`; m3: the box loop started at the
     * target, which skips every box between the figure and it) left all six
     * tests green. So each block is pinned whole, from its loop head to the
     * end of the reads it makes, guards and style reads included; and, since
     * the seventh review's mutations m10–m16 (each left this file green), so
     * are the lines that decide which animations reach the reads — the guard
     * that takes a pseudo-element's animation in (m12: put back to skip
     * pseudo-elements, PSQ2p, the pay figure squeezed by a margin on
     * `.pay-x::before`, read 0), the walk's own pseudo-element test, the
     * off-walk gate (m10), the moves cache (m11) — and `inkSignature` (m13),
     * the gather of the figures the dress rule does not read (m16) and their
     * report (m14), below. **The limit, stated**: these pin text, not which
     * animations on a figure's walk reach the reads by `seekNeedless`,
     * `outerShadowOnly`, `groundOnly` or the timing set for the seek, nor
     * the helpers the reads call (`dressHeldFault`, `boxHeldFault`,
     * `selfClipSentences`, `groundStackFault`); a mutation of those is caught
     * only where a red proof of `layout/PROBE-RULES.md` exercises the branch
     * it breaks, and not every branch has one. An equivalent rewrite fails
     * the pin, and the pin is rewritten with it.
     */
    it('asks every longhand of OFFSET_HELD_OWN, BOX_HELD and the rest at each offset: the blocks are pinned whole, guards included', () => {
        const body = offsetReadBody();
        for (const block of [
            // The figure's own elements under the animated box: the held longhands, then the rest against the reference.
            'for (const el of r.own) { if (el !== target && !target.contains(el)) continue; const cs = getComputedStyle(el); const elName = el === r.node ? \'it\' : describe(el); ' +
                'for (const prop of OFFSET_HELD_OWN) { const why = dressHeldFault(prop, cs.getPropertyValue(prop), cs); if (why !== undefined) found.push(`${elName}: ${why}, ${at}`); } ' +
                'const ref = dressReference(r.stall); for (const prop of dressReadList().rest) { const value = cs.getPropertyValue(prop); if (value !== (ref.get(prop) ?? \'\')) found.push(',
            // Every box from the figure's parent up to the animated box.
            'if (target !== r.node && target.contains(r.node)) { for (let box = r.node.parentElement; box !== null; box = box.parentElement) { const cs = getComputedStyle(box); ' +
                'for (const prop of BOX_HELD) { const why = boxHeldFault(prop, cs.getPropertyValue(prop), box); if (why !== undefined) found.push(`${describe(box)} above it: ${why}, ${at}`); } ' +
                'if (box === target) break; } }',
            // The self-clip read: whose figures, and the read at each offset.
            "const clipped: [HTMLElement, string[]][] = movesOthers ? figuresOnThePaint() : (reads ?? []).filter((r) => !onlyGround && r.node.matches(MONEY_FIGURES)).map((r) => [r.node, r.clip]);",
            'for (const [node, list] of clipped) { if (list.length > 0 || selfClipCutNow.has(node) || !selfClipReads(node)) continue; dressSeek.clips += 1; const cut = selfClipSentences(node); if (cut.length > 0) { list.push(`${cut[0]}, ${at}`); dressSeek.faults += 1; } }',
        ]) {
            expect(body, block).toContain(block);
        }
        // Which animations reach the reads (the seventh review's m10–m12): every animation with a target is
        // taken in, a pseudo-element's included, in the decision and in the read; the walk is an element's
        // alone; and an animation off every walk is read for the self-clip read only where it can move another box.
        const guard = 'if (!(effect instanceof KeyframeEffect) || effect.target === null) continue;';
        expect(body.split(guard).length - 1, 'the guard, in the decision and in the read').toBe(2);
        expect(body, 'no animation is skipped for running on a pseudo-element').not.toMatch(/pseudoElement\s*!==\s*null[^;{]*\)\s*continue/);
        for (const block of [
            'const walk = effect.pseudoElement === null ? reach.get(target) : undefined;',
            'if (reads === undefined && (!movesOthers || figuresOnThePaint().length === 0)) continue;',
            'if (movesByName.key !== sheets) movesByName = { key: sheets, byName: new Map() };',
            'let moves = anim instanceof CSSAnimation ? movesByName.byName.get(anim.animationName) : undefined; if (moves === undefined) { moves = movesOtherBoxes(anim, effect); if (anim instanceof CSSAnimation) movesByName.byName.set(anim.animationName, moves); }',
            // The figures the self-clip read reads off the walk (m16), each the dress subject's list or one of its own, answered to the caller.
            'for (const r of read) if (r.node.matches(MONEY_FIGURES) && selfClipReads(r.node)) lists.set(r.node, r.clip); for (const node of document.querySelectorAll<HTMLElement>(`#app :is(${MONEY_FIGURES})`)) { if (lists.has(node) || !selfClipReads(node)) continue; const list: string[] = []; lists.set(node, list); unread.set(node, list); }',
            'restInk = new Map();',
            'if (!restInk.has(r.node)) restInk.set(r.node, inkSignature(r.node));',
        ]) {
            expect(body, block).toContain(block);
        }
        // Where a figure's text stands (m13), and the report of the figures the dress rule does not read (m14).
        // Whole, so a line added in front of the read (`return '';`, m13) fails too.
        expect(flatBody('inkSignature').trim()).toBe(
            'function inkSignature(node: Element): string { const range = document.createRange(); range.selectNodeContents(node); return [...range.getClientRects()] .filter((r) => r.width > 0 && r.height > 0) .map((r) => `${r.left.toFixed(2)},${r.top.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)}`) .join(\';\');',
        );
        expect(flatBody('moneyDressFaults')).toContain(
            'const unread = offsetDressFaults(read); for (const [node, clip] of unread) { for (const detail of clip) { out.push({ screen, theme: label, check: SELF_CLIP_CHECK, detail:',
        );
        // Each list is asked in the read exactly once, and only through its pinned block.
        for (const list of ['OFFSET_HELD_OWN', 'BOX_HELD', 'dressReadList()', 'selfClipSentences(']) {
            expect(body.split(list).length - 1, list).toBe(1);
        }
        // And the ground read at an offset: its trigger (a signature changed on the walk, or the text moved) and the own elements it reads.
        const ground = flatBody('offsetGroundFaults');
        for (const block of [
            'const inkMoved = inkSignature(r.node) !== restInk.get(r.node); if (!inkMoved && !groundWalk(r, target).some(([el, own]) => groundSignature(el, own) !== restGround.get(groundKey(el, own)))) return [];',
            'for (const el of r.own) { if (el !== target && !target.contains(el)) continue; const why = groundStackFault(el, getComputedStyle(el), r.stall, () => inkLines(el));',
        ]) {
            expect(ground, block).toContain(block);
        }
    });

    /*
     * The sixth review's PSQ2 (a sibling's keyframe margin cut the pay
     * figure, and nothing off the figure's walk was seeked) and the seventh
     * review's B1: `MOVES_NO_OTHER_BOX` held `visibility` (a table row's
     * `collapse` to `visible` moves the next row, PVC) and said a transform
     * or an offset moves only the animated box and what it holds (a box
     * placed by `anchor()` follows its anchor's, PAN). The list holds no
     * longhand that moves another box with no anchor to follow it; the ones
     * an anchored box follows are `ANCHOR_FOLLOWED`, and each of them counts
     * as moving another box where an anchor can follow it.
     */
    it('seeks for the self-clip read every keyframe that can move another box: no layout longhand or visibility on the still list, and a transform or an offset where an anchor can follow it', () => {
        // The two small helpers whole, so a line added in front of what they read fails too.
        expect(flatBody('movesOtherBoxes').trim()).toBe(
            'function movesOtherBoxes(anim: Animation, effect: KeyframeEffect): { others: boolean; follows: boolean } { const props = keyframeProps(anim, effect); if (props === undefined) return { others: true, follows: true }; return { others: ![...props].every((prop) => MOVES_NO_OTHER_BOX.has(prop)), follows: [...props].some((prop) => ANCHOR_FOLLOWED.has(prop)) };',
        );
        const body = offsetReadBody();
        for (const block of [
            'moves = movesOtherBoxes(anim, effect);',
            'const anchored = !moves.others && moves.follows && anchorCanFollow(effect.target, effect.pseudoElement, pageAnchors); if (anchored) dressSeek.anchored += 1; movesOf.set(anim, moves.others || anchored);',
            "const pageAnchors = sheetFacts().anchors || animations.some((a) => a.effect instanceof KeyframeEffect && !(a instanceof CSSAnimation) && (keyframeProps(a, a.effect)?.has('anchor-name') ?? false));",
            'const movesOthers = movesOf.get(anim) ?? true;',
        ]) {
            expect(body, block).toContain(block);
        }
        // An anchor can follow: a sheet that declares it or cannot be read, an animation that sets it, or one the animated box or a box under it computes.
        expect(flatBody('anchorCanFollow').trim()).toBe(
            "function anchorCanFollow(target: Element, pseudo: string | null, pageAnchors: boolean): boolean { if (pageAnchors) return true; if (getComputedStyle(target, pseudo).getPropertyValue('anchor-name') !== 'none') return true; if (pseudo !== null) return false; for (const el of target.querySelectorAll('*')) if (getComputedStyle(el).getPropertyValue('anchor-name') !== 'none') return true; return false;",
        );
        const facts = flatBody('sheetFacts');
        for (const block of [
            "const value = style.getPropertyValue('anchor-name').trim(); if (value !== '' && value !== 'none') anchors = true;",
            'names(style); for (let i = 0; i < style.length; i += 1) props.add(style.item(i));',
            "if ('style' in rule && (rule as CSSStyleRule).style instanceof CSSStyleDeclaration) names((rule as CSSStyleRule).style);",
            'if (rule instanceof CSSImportRule) { try { if (rule.styleSheet !== null) walk(rule.styleSheet.cssRules); } catch { anchors = true; } }',
            "if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);",
            'try { walk(sheet.cssRules); } catch { anchors = true; }',
        ]) {
            expect(facts, block).toContain(block);
        }
        const still = setOf('MOVES_NO_OTHER_BOX');
        expect(still.length).toBeGreaterThan(60);
        const layout = [
            ...setOf('KEYFRAME_SIZES_LIST'),
            ...['top', 'right', 'bottom', 'left'].flatMap((side) => [`margin-${side}`, `padding-${side}`, `border-${side}-width`, `border-${side}-style`]),
            ...['margin', 'padding'].flatMap((box) => ['block-start', 'block-end', 'inline-start', 'inline-end'].map((side) => `${box}-${side}`)),
            'font-size', 'font-family', 'font-weight', 'font-style', 'font-stretch', 'font-size-adjust', 'font-variation-settings', 'font-feature-settings',
            'letter-spacing', 'word-spacing', 'text-indent', 'line-height', 'white-space', 'text-transform', 'writing-mode', 'direction',
            'display', 'position', 'float', 'zoom', 'content-visibility', 'contain', 'order', 'flex-grow', 'flex-shrink', 'grid-area', 'gap', 'row-gap', 'column-gap',
            'box-sizing', 'aspect-ratio', 'overflow-x', 'overflow-y', 'justify-content', 'align-items', 'align-self', 'flex-direction', 'flex-wrap', 'content',
            // The seventh review's PVC: a table row's visibility moves the next row.
            'visibility',
            // And anchor positioning's own longhands, which move the anchored box.
            'anchor-name', 'anchor-scope', 'position-anchor', 'position-area', 'inset-area', 'position-try', 'position-try-fallbacks', 'position-try-order', 'position-visibility',
        ];
        for (const prop of layout) expect(still, `MOVES_NO_OTHER_BOX names ${prop}, which can move another box, as still`).not.toContain(prop);
        for (const prop of still) expect(prop.startsWith('--'), `MOVES_NO_OTHER_BOX names ${prop}, a custom property, which can feed any longhand`).toBe(false);
        // Every transform, motion-path and offset longhand of the still list is one an anchored box is counted as following (measured in Chrome 156).
        const followed = setOf('ANCHOR_FOLLOWED');
        for (const prop of followed) expect(still, `ANCHOR_FOLLOWED names ${prop}, which MOVES_NO_OTHER_BOX does not`).toContain(prop);
        const moving = still.filter((prop) => /^(?:transform|rotate|scale|translate|perspective|offset-|left$|top$|right$|bottom$|inset-)/.test(prop));
        expect([...moving].sort()).toEqual([...followed].sort());
    });

    it('reads at the offsets every longhand the fourth review found left out, PFA among them', () => {
        const own = held.filter((prop) => !geometry.includes(prop));
        for (const prop of [
            'font-size-adjust',
            'text-indent',
            'word-spacing',
            'direction',
            'unicode-bidi',
            'writing-mode',
            '-webkit-writing-mode',
            'text-emphasis-style',
            '-webkit-text-decorations-in-effect',
            'content-visibility',
            'display',
            'content',
            'text-overflow',
            'line-clamp',
            'background-clip',
        ]) {
            expect(own, prop).toContain(prop);
        }
        // And the 17 it held before stay held.
        for (const prop of [
            'color',
            '-webkit-text-fill-color',
            '-webkit-text-stroke-width',
            'opacity',
            'visibility',
            'filter',
            'mix-blend-mode',
            'transform',
            'rotate',
            'scale',
            'translate',
            'zoom',
            'clip-path',
            'mask-image',
            '-webkit-mask-image',
            'text-shadow',
        ]) {
            expect(own, prop).toContain(prop);
        }
    });
});

/**
 * `the-code-hold-reads-where-a-codes-modules-land`, its static half (before
 * 8g2, the seventh review's m15): the code hold (`qrColourFault` in
 * `layout/probe.ts`, `a-code-is-drawn-black-on-white`) ends in the place
 * read (`qrPlaceFault`), which holds a code's modules to the matrix its
 * viewBox and `qrSvg`'s quiet zone make. No whole-runner red proof reaches
 * the place read alone — the critic's PQP, an `offset-path` on the path, is
 * refused first by `QR_NONE` — so unwired it left every proof red and the
 * runner as it was; the call is pinned here, and so is the list's
 * `offset-path`. The place read alone was proved by quick reads (PQP and
 * PQPs with `offset-path` out of `QR_NONE`, `layout/PROBE-RULES.md`).
 */
describe('the-code-hold-reads-where-a-codes-modules-land', () => {
    it('ends the hold in the place read, and holds a motion path among the none longhands', () => {
        const hold = flatBody('qrColourFault');
        expect(hold.trim().endsWith('return qrPlaceFault(svg as SVGSVGElement, path, Number(size), modules);'), 'qrColourFault returns the place read last').toBe(true);
        expect(hold.split('qrPlaceFault(').length - 1).toBe(1);
        expect(setOf('QR_NONE')).toContain('offset-path');
        // The place read derives the matrix from qrSvg's own quiet zone.
        expect(flatBody('qrPlaceFault')).toContain('const q = QR_SVG_QUIET_MODULES;');
    });
});
