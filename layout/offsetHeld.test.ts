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

/** `offsetDressFaults`'s body, comments out and whitespace flattened to one space: the loops are pinned on it. */
function offsetReadBody(): string {
    const start = PROBE.indexOf('function offsetDressFaults(');
    expect(start, 'layout/probe.ts declares offsetDressFaults').toBeGreaterThanOrEqual(0);
    const end = PROBE.indexOf('\n}\n', start);
    return PROBE.slice(start, end)
        .split('\n')
        .map((line) => line.replace(/^\s*\/\/.*$/, ''))
        .join('\n')
        .replace(/\s+/g, ' ');
}

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
 * `the-ground-signature-names-every-longhand-the-ground-read-reads`: the
 * offset read reads a figure's ground again only where a seek changed a
 * longhand of `GROUND_SIGNATURE` on its walk (or moved its text,
 * `inkSignature`), so a longhand the ground read reads (`boxPaintsOf`, and
 * `borderImageReach`, the one helper it hands its style to) and the
 * signature leaves out is a ground a keyframe can change unread — the sixth
 * review's PGatt3, `background-attachment: fixed` in a keyframe on Modern's
 * quote figure over a tile of the page's ground, seeked and never read
 * again. Every longhand it reads of any box is held to the part a box above
 * is compared on (before `GROUND_ABOVE`, which is pinned), and every one it
 * reads of a figure's own elements alone to the whole list. No longhand is
 * left out today; one left out is named in `GROUND_EXCLUDED` with its
 * reason, and an exclusion the read does not read fails.
 */
const GROUND_EXCLUDED: Record<string, string> = {};

describe('the-ground-signature-names-every-longhand-the-ground-read-reads', () => {
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

    it('asks every longhand of OFFSET_HELD_OWN, BOX_HELD and the rest at each offset: the loops are pinned whole, not only the lists', () => {
        // The fifth review's item 8: a loop over `OFFSET_HELD_OWN.filter(p => p !== 'font-size-adjust' && p !== 'text-indent')`
        // left the definition the test held and read neither longhand. The loops that ask the lists are held here as written.
        const body = offsetReadBody();
        for (const loop of [
            'for (const prop of OFFSET_HELD_OWN) { const why = dressHeldFault(prop, cs.getPropertyValue(prop), cs); if (why !== undefined) found.push(`${elName}: ${why}, ${at}`); }',
            'for (const prop of dressReadList().rest) { const value = cs.getPropertyValue(prop); if (value !== (ref.get(prop) ?? \'\')) found.push(',
            'for (const prop of BOX_HELD) { const why = boxHeldFault(prop, cs.getPropertyValue(prop), box); if (why !== undefined) found.push(`${describe(box)} above it: ${why}, ${at}`); }',
        ]) {
            expect(body, loop).toContain(loop);
        }
        // Each list is asked in the read exactly once, and only through its pinned loop.
        for (const list of ['OFFSET_HELD_OWN', 'BOX_HELD', 'dressReadList()']) {
            expect(body.split(list).length - 1, list).toBe(1);
        }
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
