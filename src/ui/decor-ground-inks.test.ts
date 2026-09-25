/**
 * A root decoration is a ground the look's ink lands on.
 *
 * Rural's confetti and sunburst paint on the stall root, behind every
 * surface, and some lines of text sit straight on that root with no card
 * between: the section heads, the Wearing line, the face's back control, the
 * wall's payment plate. A browser pass samples those lines at one frozen
 * instant, so what it reads under a 26 s fall or a 70 s spin depends on
 * where the paper and the rays happened to be then. These two tests read the
 * decorations' colours from their source instead — the art's own fills and
 * the sheet's own gradient — and hold every ink the look can set on bare
 * ground against the worst of them, for Rural bare and for every mood Rural
 * ships, as `themeVars` paints them (after `legibleOn`).
 *
 * The floor is **3**, written as a literal and never `MIN_CONTRAST`, with no
 * margin: the fills are exact hex, opaque, and read as painted, so there is
 * no rounding for a margin to absorb.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVED_SHEETS } from '../../scripts/sheet-roles.mjs';

import {
    SHIPPED_ATTACHMENTS,
    attachmentsForTheme,
    withMood,
    type ShippedAttachment,
} from '../domain/attachments';
import { RURAL_THEME_ID, contrastRatio, decodeTheme, themeVars } from '../domain/theme';

type Rgb = { r: number; g: number; b: number };

const FLOOR = 3;
const INK_ROLES = ['--s-text', '--s-muted', '--s-accent', '--s-danger'] as const;

const UI_DIR = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

type Rule = { selector: string; body: string };

/** Every innermost rule in a sheet, media blocks and keyframe steps included. */
const rulesOf = (css: string): Rule[] =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((m) => ({
        selector: m[1]!.trim().replace(/\s+/g, ' '),
        body: m[2]!,
    }));

const RULES = rulesOf(CSS);

/** Every `@keyframes` block in a sheet, by name, as the steps' declarations run together. */
const keyframesOf = (css: string): Map<string, string> =>
    new Map(
        [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)].map(
            (m) => [m[1]!, m[2]!.replace(/[^{}]*\{|\}/g, ';')],
        ),
    );

const namesClass = (selector: string, cls: string): boolean =>
    new RegExp(`\\.${cls}(?![a-z0-9-])`).test(selector);

/** One declaration's value from a rule body, or undefined. */
const declared = (body: string, property: string): string | undefined =>
    new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]*)`)
        .exec(body)?.[1]
        ?.replace(/\s+/g, ' ')
        .trim();

/** `rgb(r, g, b)` exactly as `rgbCss` writes it; anything else throws. */
const parseRgb = (css: string, what: string): Rgb => {
    const m = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(css);
    if (m === null) {
        throw new Error(`${what}: "${css}" is not rgb(r, g, b)`);
    }
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
};

const fromHex = (fill: string): Rgb => ({
    r: parseInt(fill.slice(1, 3), 16),
    g: parseInt(fill.slice(3, 5), 16),
    b: parseInt(fill.slice(5, 7), 16),
});

const hex = (c: Rgb): string =>
    `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * Every palette Rural can paint: the look bare and the look under each of
 * its moods — read from the catalogue, never a copied list, so a second
 * Rural mood is held the day it ships.
 */
const RURAL_MOODS: readonly ShippedAttachment[] = attachmentsForTheme(RURAL_THEME_ID).filter(
    (row) => row.slot === 'mood',
);
const RURAL_PALETTES: readonly { label: string; vars: Record<string, string> }[] = [
    { label: 'Rural', vars: themeVars(decodeTheme(RURAL_THEME_ID)) },
    ...RURAL_MOODS.map((mood) => ({
        label: `Rural + ${mood.label}`,
        vars: themeVars(withMood(decodeTheme(RURAL_THEME_ID), [mood])),
    })),
];

const inksOf = (vars: Record<string, string>, label: string) =>
    INK_ROLES.map((role) => ({ role, ink: parseRgb(vars[role] ?? '', `${label} ${role}`) }));

/* ------------------------------------------------------------------ */
/* The confetti's art                                                  */
/* ------------------------------------------------------------------ */

const SVG_OPEN =
    /^<svg(?: (?:xmlns="http:\/\/www\.w3\.org\/2000\/svg"|viewBox="[0-9. ]+"|width="[0-9.]+"|height="[0-9.]+"))*>/;
const SVG_PATH = /^<path d="[MLHVCSQTAZmlhvcsqtaz0-9., -]+" fill="#([0-9a-fA-F]{6})"\/>/;

/**
 * The fills of one confetti tile, by an allow-list: an `<svg>` carrying only
 * its namespace and size, then `<path d fill="#rrggbb">` and nothing else.
 * Anything the list does not name — a group, a second shape, an opacity, a
 * style, a class, a transform, a named or short colour, a comment — throws,
 * because a fill read without it would not be the colour that paints.
 */
function confettiFills(svg: string, name: string): string[] {
    let rest = svg.trim();
    const open = SVG_OPEN.exec(rest);
    if (open === null) {
        throw new Error(`${name}: the <svg> element carries something this reader does not read`);
    }
    rest = rest.slice(open[0].length);
    const fills: string[] = [];
    for (let path = SVG_PATH.exec(rest); path !== null; path = SVG_PATH.exec(rest)) {
        fills.push(`#${path[1]!.toLowerCase()}`);
        rest = rest.slice(path[0].length);
    }
    if (rest !== '</svg>' || fills.length === 0) {
        throw new Error(
            `${name}: after ${fills.length} flat path(s), "${rest.slice(0, 40)}" is not a <path d fill="#rrggbb"/>`,
        );
    }
    return fills;
}

/** The tiles the confetti rules paint, read from the sheet itself. */
const confettiTiles = (): string[] => {
    const urls = new Set<string>();
    for (const rule of RULES.filter((r) => namesClass(r.selector, 'att-confetti'))) {
        for (const m of rule.body.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/g)) {
            urls.add(m[2]!);
        }
    }
    return [...urls].sort();
};

/**
 * What would make a scrap or a ray paint other than its colour: the root's
 * own opacity, a blend of the element or of its background layers, a
 * filter. Both ratios below read each colour as the colour on screen, which
 * is true only while no rule that reaches the root sets any of these — nor
 * a keyframe one of them runs.
 */
const CONFETTI_ALTERS = ['opacity', 'mix-blend-mode', 'background-blend-mode', 'filter', 'backdrop-filter'] as const;

/** Every served sheet, as the app and its pages load them (`SERVED_SHEETS`). */
const SERVED_CSS: readonly string[] = SERVED_SHEETS.map((sheet) =>
    readFileSync(join(UI_DIR, '..', '..', sheet.path), 'utf8'),
);

/**
 * Whether a rule reaches the stall root: it names the confetti, or its
 * subject — the last compound, `:not(…)` aside — is nothing but the root's
 * own classes (`stall`, a look's `t-*`, a worn `att-*`). The critic,
 * 2026-09-25, item 10: `.stall { opacity }` and `.stall.att-sunburst {
 * filter }` fade the paper the confetti and the rays are read over, and a
 * reader of the confetti's rules alone let both through.
 *
 * **Or its subject is one of the root's ancestors** (CARRYOVER-2 item 11):
 * opacity and a filter on an ancestor fade everything painted inside it,
 * the root included, so `body { opacity }` or `#app { filter }` fades the
 * paper as surely as `.stall { opacity }`. The ancestors, as the app mounts
 * the root (`renderStall`: `.stall` inside `.frame` inside `#app`): the
 * frame, the mount, `body`, `html` / `:root` — with any further classes or
 * states on them, as `html.bc-clear` — and `*`, which matches the root
 * itself.
 */
const ROOT_ANCESTOR = /^(?:html|:root|body|#app|\.frame|\*)(?:[.#:[].*)?$/;
const reachesRoot = (selector: string): boolean =>
    namesClass(selector, 'att-confetti') ||
    selector.split(',').some((one) => {
        const subject = one.trim().split(/\s*[\s>+~]\s*/).pop() ?? '';
        const bare = subject.replace(/:not\([^()]*\)/g, '');
        return /^(?:\.(?:stall|t-[a-z0-9]+|att-[a-z0-9-]+))+$/.test(bare) || ROOT_ANCESTOR.test(bare);
    });

/**
 * Every declaration in `sheets` that alters the paint of the confetti or
 * the wheel (`CONFETTI_ALTERS`): in every rule that reaches the stall root
 * (`reachesRoot`), in any served sheet, and in every keyframe such a rule
 * runs.
 */
const rootAlterations = (sheets: string | readonly string[] = SERVED_CSS): string[] => {
    const all = typeof sheets === 'string' ? [sheets] : sheets;
    const frames = new Map(all.flatMap((css) => [...keyframesOf(css)]));
    const out: string[] = [];
    for (const rule of all.flatMap(rulesOf).filter((r) => reachesRoot(r.selector))) {
        const run = ['animation', 'animation-name']
            .flatMap((property) => (declared(rule.body, property) ?? '').split(/[\s,]+/))
            .filter((word) => frames.has(word));
        for (const [where, body] of [[rule.selector, rule.body], ...run.map((name) => [`@keyframes ${name}`, frames.get(name)!])]) {
            for (const property of CONFETTI_ALTERS) {
                const value = declared(body!, property);
                if (value !== undefined) {
                    out.push(`${where}: ${property}: ${value}`);
                }
            }
        }
    }
    return out;
};

describe('every-confetti-scrap-clears-three-to-one-under-every-ground-ink', () => {
    it('reads every scrap the sheet paints against every ink Rural can set on bare ground', () => {
        const confetti = SHIPPED_ATTACHMENTS.find((row) => row.cls === 'att-confetti');
        expect(confetti?.themeId, 'the confetti is a Rural row').toBe(RURAL_THEME_ID);
        expect(RURAL_MOODS.length, 'Rural ships a mood, so the loop is not bare alone').toBeGreaterThan(0);

        const tiles = confettiTiles();
        expect(tiles.length, 'the confetti rules name their tiles').toBeGreaterThan(0);
        expect(rootAlterations(), 'a fill is the colour on screen: nothing fades, blends or filters the paper').toEqual([]);
        const scraps: { tile: string; fill: string }[] = [];
        for (const tile of tiles) {
            expect(tile, `${tile}: a confetti tile is drawn art in decor/`).toMatch(
                /^decor\/[a-z0-9-]+\.svg$/,
            );
            const svg = readFileSync(join(UI_DIR, tile), 'utf8');
            for (const fill of confettiFills(svg, tile)) {
                scraps.push({ tile, fill });
            }
        }

        const failures: string[] = [];
        let worst = { ratio: Infinity, what: '' };
        for (const { label, vars } of RURAL_PALETTES) {
            for (const { role, ink } of inksOf(vars, label)) {
                for (const { tile, fill } of scraps) {
                    const ratio = contrastRatio(ink, fromHex(fill));
                    const what = `${label} ${role} ${hex(ink)} over ${fill} (${tile}): ${ratio.toFixed(2)}:1`;
                    if (ratio < worst.ratio) {
                        worst = { ratio, what };
                    }
                    if (ratio < FLOOR) {
                        failures.push(what);
                    }
                }
            }
        }
        expect(failures, `worst: ${worst.what}`).toEqual([]);
    });

    it('refuses art it cannot read as flat opaque fills', () => {
        const head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">';
        const path = '<path d="M0 0L5 5Z" fill="#b0bca2"/>';
        expect(confettiFills(`${head}${path}</svg>\n`, 'plain')).toEqual(['#b0bca2']);
        const plants = [
            `${head}</svg>`,
            `${head}<g>${path}</g></svg>`,
            `${head}<path d="M0 0L5 5Z" fill="#b0bca2" fill-opacity="0.5"/></svg>`,
            `${head}<path d="M0 0L5 5Z" fill="#b0bca2" opacity="0.5"/></svg>`,
            `${head}<path d="M0 0L5 5Z" fill="#b0bca2" style="fill:#000"/></svg>`,
            `${head}<path class="x" d="M0 0L5 5Z" fill="#b0bca2"/></svg>`,
            `${head}<path d="M0 0L5 5Z" fill="#b0bca2" transform="scale(2)"/></svg>`,
            `${head}<path d="M0 0L5 5Z" fill="red"/></svg>`,
            `${head}<path d="M0 0L5 5Z" fill="#abc"/></svg>`,
            `${head}<circle cx="1" cy="1" r="1" fill="#b0bca2"/></svg>`,
            `${head}<!-- -->${path}</svg>`,
            `<svg opacity="0.5">${path}</svg>`,
            `<svg style="filter:invert(1)">${path}</svg>`,
            `<?xml version="1.0"?>${head}${path}</svg>`,
        ];
        for (const plant of plants) {
            expect(() => confettiFills(plant, 'plant'), plant).toThrow();
        }
    });

    it('refuses a confetti rule, or a keyframe one runs, that fades, blends or filters the paper', () => {
        const worn = '.stall.att-confetti { animation: att-confetti-fall 26s linear infinite; } @keyframes att-confetti-fall { to { background-position: 0 0; } }';
        expect(rootAlterations(worn)).toEqual([]);
        expect(rootAlterations('.stall.att-confetti, .stall.att-sunburst { animation: none; }')).toEqual([]);
        const plants = [
            '.stall.att-confetti { opacity: 0.85; }',
            '.stall.att-sunburst.att-confetti { mix-blend-mode: multiply; }',
            '.stall.att-confetti { background-blend-mode: multiply, normal; }',
            '@media (min-width: 680px) { .stall.att-confetti { filter: saturate(1.4); } }',
            '.stall.att-confetti { backdrop-filter: blur(2px); }',
            '.x, .stall.att-confetti { opacity: 0.5; }',
            '.stall.att-confetti { animation: wk-fade 26s linear infinite; } @keyframes wk-fade { from { opacity: 1; } to { opacity: 0.6; } }',
        ];
        for (const plant of plants) {
            expect(rootAlterations(plant), plant).not.toEqual([]);
        }
        // The real sheet with one of them added goes red too.
        expect(rootAlterations(`${CSS}\n.stall.att-confetti { opacity: 0.9; }`)).not.toEqual([]);
    });

    it('refuses a fade on the stall root itself, in any served sheet', () => {
        // The critic, 2026-09-25, item 10: a rule that never names the
        // confetti fades its paper just the same when its subject is the root.
        for (const plant of [
            '.stall { opacity: 0.9; }',
            '.stall.att-sunburst { filter: contrast(0.8); }',
            '.t-rural { mix-blend-mode: multiply; }',
            '.t-rural.stall:not(.deck-stall) { opacity: 0.95; }',
            '#app > .stall.att-confetti.t-rural { backdrop-filter: blur(1px); }',
            '.stall.att-sunburst { animation: wk-dim 9s infinite; } @keyframes wk-dim { to { filter: brightness(0.7); } }',
        ]) {
            expect(rootAlterations([...SERVED_CSS, plant]), plant).not.toEqual([]);
        }
        // It reads the served sheets and finds the root in them; a
        // descendant of the root, or another surface, is not the root.
        expect(SERVED_CSS.length).toBe(SERVED_SHEETS.length);
        expect(rulesOf(CSS).some((r) => r.selector === '.stall' && reachesRoot(r.selector))).toBe(true);
        for (const other of ['.stall .item { opacity: 0.5; }', '.t-rural .notice { filter: blur(1px); }', '.deck { opacity: 0.4; }']) {
            expect(rootAlterations([...SERVED_CSS, other]), other).toEqual([]);
        }
        // A fade on one of the root's ancestors fades the root with it
        // (CARRYOVER-2 item 11); a descendant of one, or a look-alike name,
        // is not an ancestor.
        for (const plant of [
            'body { opacity: 0.9; }',
            '#app { filter: brightness(0.8); }',
            'html.bc-clear { mix-blend-mode: multiply; }',
            ':root { opacity: 0.95; }',
            '.frame { backdrop-filter: blur(1px); }',
            'html, body, #app { filter: saturate(0.5); }',
            '* { opacity: 0.99; }',
            'body { animation: wk-fade 9s infinite; } @keyframes wk-fade { to { opacity: 0.6; } }',
        ]) {
            expect(rootAlterations([...SERVED_CSS, plant]), plant).not.toEqual([]);
        }
        for (const other of ['.frame .item { opacity: 0.5; }', '.frame-x { opacity: 0.5; }', 'body .deck { opacity: 0.4; }', '#appendix { filter: blur(1px); }']) {
            expect(rootAlterations([...SERVED_CSS, other]), other).toEqual([]);
        }
    });
});

/* ------------------------------------------------------------------ */
/* The sunburst's rays                                                 */
/* ------------------------------------------------------------------ */

/** The argument of the first `fn(` in `text`, balanced; undefined if absent. */
const argsOf = (text: string, fn: string): string | undefined => {
    const at = text.indexOf(`${fn}(`);
    if (at < 0) {
        return undefined;
    }
    let depth = 0;
    for (let i = at + fn.length; i < text.length; i += 1) {
        if (text[i] === '(') {
            depth += 1;
        } else if (text[i] === ')') {
            depth -= 1;
            if (depth === 0) {
                return text.slice(at + fn.length + 1, i);
            }
        }
    }
    return undefined;
};

/** Split on commas at paren depth 0. */
const topLevel = (list: string): string[] => {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < list.length; i += 1) {
        if (list[i] === '(') {
            depth += 1;
        } else if (list[i] === ')') {
            depth -= 1;
        } else if (list[i] === ',' && depth === 0) {
            out.push(list.slice(start, i).trim());
            start = i + 1;
        }
    }
    out.push(list.slice(start).trim());
    return out;
};

/**
 * `color-mix(in srgb, var(--token) P%, transparent)` at the head of a stop:
 * CSS Color 5 mixes in premultiplied alpha, and transparent is transparent
 * black, so the result is the token's own colour at alpha P/100.
 */
const TINT = /^color-mix\(in srgb, var\((--s-[a-z0-9-]+)\) (\d+(?:\.\d+)?)%, transparent\)/;

type Tint = { token: string; alpha: number };

const tintOf = (stop: string, what: string): Tint => {
    const m = TINT.exec(stop);
    if (m === null) {
        throw new Error(`${what}: "${stop}" is not a translucent token stop; re-derive this test`);
    }
    return { token: m[1]!, alpha: Number(m[2]) / 100 };
};

/** Source-over in gamma-encoded sRGB, which is how a browser composites layers. */
const over = (bottom: Rgb, top: Rgb, alpha: number): Rgb => ({
    r: top.r * alpha + bottom.r * (1 - alpha),
    g: top.g * alpha + bottom.g * (1 - alpha),
    b: top.b * alpha + bottom.b * (1 - alpha),
});

const darkerEverywhere = (a: Rgb, b: Rgb): boolean => a.r <= b.r && a.g <= b.g && a.b <= b.b;

/** The rules that draw the wheel. */
const wheelRules = (rules: readonly Rule[]): Rule[] =>
    rules.filter((r) => namesClass(r.selector, 'att-sunburst') && /repeating-conic-gradient\(/.test(r.body));

/** The root's ground, `.stall { background-color: var(--s-*) }`: the token, or undefined. */
const paperOf = (rules: readonly Rule[]): string | undefined => {
    const root = rules.find((r) => r.selector === '.stall' && declared(r.body, 'background-color') !== undefined);
    return /^var\((--s-[a-z0-9-]+)\)$/.exec(declared(root?.body ?? '', 'background-color') ?? '')?.[1];
};

/**
 * A radial gradient's leading shape, size or position: `circle`, `ellipse`,
 * an extent keyword, a length, or `at …`. Anything else in `args[0]` is a
 * colour stop.
 */
const RADIAL_DESCRIPTOR = /^(?:circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner|at\s|-?\d)/;

/** A `radial-gradient(…)` layer's colour stops, its descriptor (if any) dropped. */
const falloffStops = (layer: string): string[] => {
    const args = topLevel(argsOf(layer, 'radial-gradient') ?? '');
    return RADIAL_DESCRIPTOR.test(args[0] ?? '') ? args.slice(1) : args;
};

/**
 * Every falloff stop, other than the transparent centre, that is not the
 * root's paper token or a token lighter than it on every channel under
 * every Rural palette. The ray is read at full tint at the wheel's centre;
 * that it is the darkest the wheel paints anywhere also rests on the
 * falloff only ever lifting the ray toward the paper as it spreads — a stop
 * in anything darker would lay its own dark over the ray, and a stop in
 * anything this reader cannot resolve is refused rather than trusted.
 */
const falloffOffences = (rules: readonly Rule[] = RULES): string[] => {
    const paper = paperOf(rules);
    const out: string[] = [];
    if (paper === undefined) {
        return ["the root's ground is not one token, so no falloff stop can be held to it"];
    }
    for (const rule of wheelRules(rules)) {
        const layers = topLevel(declared(rule.body, 'background-image') ?? '');
        const at = layers.findIndex((l) => l.startsWith('repeating-conic-gradient('));
        for (const layer of layers.slice(0, at).filter((l) => l.startsWith('radial-gradient('))) {
            // The first stop is read as the transparent centre only where it
            // IS the first stop: a gradient with no shape descriptor has its
            // first colour in `args[0]`, which a fixed `.slice(2)` skipped
            // (the critic, 2026-09-25, item 10).
            const [centre, ...stops] = falloffStops(layer);
            if (!/^transparent 0 [1-9]\d*%$/.test(centre ?? '')) {
                out.push(`${rule.selector}: the falloff's first stop "${centre ?? ''}" is not its transparent centre`);
            }
            for (const stop of stops) {
                const token = /^var\((--s-[a-z0-9-]+)\)(?: -?\d+(?:\.\d+)?(?:%|px))*$/.exec(stop)?.[1];
                if (token === undefined) {
                    out.push(`${rule.selector}: the falloff stop "${stop}" is not a token of the look`);
                    continue;
                }
                for (const { label, vars } of RURAL_PALETTES) {
                    const colour = parseRgb(vars[token] ?? '', `${label} ${token}`);
                    const ground = parseRgb(vars[paper] ?? '', `${label} ${paper}`);
                    if (token !== paper && !darkerEverywhere(ground, colour)) {
                        out.push(`${rule.selector}: the falloff stop "${stop}" is darker than ${paper} on ${label}`);
                    }
                }
            }
        }
    }
    return out;
};

/**
 * The ray, as `stall.css` paints it, read out of every rule that draws the
 * wheel: which layers sit above it, what the ray's stop is, and what lies
 * under it. Throws on any shape this derivation does not cover.
 */
const sunburstLayers = () => {
    const rules = wheelRules(RULES);
    if (rules.length === 0) {
        throw new Error('no rule draws the sunburst');
    }
    const shapes = rules.map((rule) => {
        const image = declared(rule.body, 'background-image');
        if (image === undefined) {
            throw new Error(`${rule.selector}: the wheel is not in background-image`);
        }
        const layers = topLevel(image);
        const at = layers.findIndex((l) => l.startsWith('repeating-conic-gradient('));
        /* Above the ray: the confetti's opaque scraps (the other test's
           ground) and the falloff, which must paint nothing at its centre
           for a ray to stand at full strength there. */
        for (const layer of layers.slice(0, at)) {
            if (/^url\(\s*'decor\/confetti-[a-z]+\.svg'\s*\)$/.test(layer)) {
                continue;
            }
            const centre = layer.startsWith('radial-gradient(') ? falloffStops(layer)[0] : undefined;
            if (centre !== undefined && /^transparent 0 [1-9]\d*%$/.test(centre)) {
                continue;
            }
            throw new Error(`${rule.selector}: "${layer.slice(0, 60)}" sits over the ray; re-derive this test`);
        }
        const below = layers.slice(at + 1);
        if (below.join(',') !== 'var(--s-backdrop)') {
            throw new Error(`${rule.selector}: under the ray is "${below.join(', ')}", not the look's backdrop`);
        }
        const stops = topLevel(argsOf(layers[at]!, 'repeating-conic-gradient')!);
        if (stops.length !== 3 || !/^from /.test(stops[0]!) || !/^transparent /.test(stops[2]!)) {
            throw new Error(`${rule.selector}: the wheel is no longer one ray stop and one gap`);
        }
        return tintOf(stops[1]!, `${rule.selector} ray`);
    });
    const ray = shapes[0]!;
    for (const other of shapes) {
        expect(other, 'every rule that draws the wheel draws the same ray').toEqual(ray);
    }
    return ray;
};

/** The look's weave, from the backdrop `themeVars` emits: one tint per line layer. */
const weaveOf = (backdrop: string, label: string): Tint[] =>
    topLevel(backdrop).map((layer) => {
        const args = argsOf(layer, 'repeating-linear-gradient');
        const stops = args === undefined ? [] : topLevel(args);
        if (
            !layer.startsWith('repeating-linear-gradient(') ||
            stops.length !== 3 ||
            !/^-?\d+deg$/.test(stops[0]!) ||
            !/^transparent /.test(stops[2]!)
        ) {
            throw new Error(`${label} backdrop: "${layer.slice(0, 60)}" is not a line of the weave`);
        }
        return tintOf(stops[1]!, `${label} weave`);
    });

describe('every-sunburst-ray-clears-three-to-one-under-every-ground-ink', () => {
    it('reads the ray at full strength over a weave crossing against every ink Rural can set on bare ground', () => {
        /*
         * The stack, bottom to top: the root's `background-color`, the two
         * weave layers of the look's backdrop (the last listed paints
         * lowest), the ray, and the falloff — transparent at the wheel's
         * centre, so a ray there stands at its full tint. Where both weave
         * lines cross, every translucent layer lands on one pixel: the
         * darkest pixel the wheel paints, provided each layer darkens every
         * channel it covers, which is asserted rather than assumed.
         */
        const sunburst = SHIPPED_ATTACHMENTS.find((row) => row.cls === 'att-sunburst');
        expect(sunburst?.themeId, 'the sunburst is a Rural row').toBe(RURAL_THEME_ID);
        const ray = sunburstLayers();
        const paper = paperOf(RULES);
        expect(paper, "the root's ground is one token").toBeDefined();
        expect(falloffOffences(), 'the falloff only lifts the ray toward the paper').toEqual([]);
        expect(rootAlterations(), 'a ray is the colour on screen: nothing fades, blends or filters the root').toEqual([]);

        const failures: string[] = [];
        let worst = { ratio: Infinity, what: '' };
        for (const { label, vars } of RURAL_PALETTES) {
            const token = (name: string): Rgb => parseRgb(vars[name] ?? '', `${label} ${name}`);
            const bg = token(paper!);
            const weave = weaveOf(vars['--s-backdrop'] ?? '', label);
            expect(weave.length, `${label}: the weave crosses itself`).toBeGreaterThanOrEqual(2);
            let pixel = bg;
            for (const line of [...weave].reverse()) {
                expect(darkerEverywhere(token(line.token), bg), `${label}: a weave line darkens`).toBe(true);
                pixel = over(pixel, token(line.token), line.alpha);
            }
            expect(darkerEverywhere(token(ray.token), bg), `${label}: the ray darkens`).toBe(true);
            pixel = over(pixel, token(ray.token), ray.alpha);

            for (const { role, ink } of inksOf(vars, label)) {
                expect(
                    darkerEverywhere(ink, pixel),
                    `${label} ${role}: the ink is darker than the darkest ray, so that ray is its worst ground`,
                ).toBe(true);
                const ratio = contrastRatio(ink, pixel);
                const what = `${label} ${role} ${hex(ink)} over the ray at a crossing ${hex(pixel)}: ${ratio.toFixed(2)}:1`;
                if (ratio < worst.ratio) {
                    worst = { ratio, what };
                }
                if (ratio < FLOOR) {
                    failures.push(what);
                }
            }
        }
        expect(failures, `worst: ${worst.what}`).toEqual([]);
    });

    it('refuses a falloff stop that is not the paper or lighter', () => {
        const wheel = (falloff: string): Rule[] =>
            rulesOf(`.stall { background-color: var(--s-bg); }
                .stall.att-sunburst { background-image: radial-gradient(circle 620px at 50% 110px, ${falloff}),
                    repeating-conic-gradient(from 0deg at 50% 110px, color-mix(in srgb, var(--s-accent-2) 17%, transparent) 0 9deg, transparent 9deg 18deg),
                    var(--s-backdrop); }`);
        expect(falloffOffences(wheel('transparent 0 30%, var(--s-bg) 64%'))).toEqual([]);
        const plants = [
            // A darker token at the edge, as a second stop, and as the last.
            'transparent 0 30%, var(--s-text) 64%',
            'transparent 0 30%, var(--s-muted) 50%, var(--s-bg) 64%',
            'transparent 0 30%, var(--s-bg) 50%, var(--s-accent) 80%',
            // Anything this reader does not resolve: a literal, a tint, transparent.
            'transparent 0 30%, #000 64%',
            'transparent 0 30%, color-mix(in srgb, var(--s-text) 40%, transparent) 64%',
            'transparent 0 30%, transparent 64%',
        ];
        for (const plant of plants) {
            expect(falloffOffences(wheel(plant)), plant).not.toEqual([]);
        }
        // No shape descriptor: the first colour is `args[0]`, and it is read
        // as a stop, never skipped (the critic, 2026-09-25, item 10).
        const bare = (falloff: string): Rule[] =>
            rulesOf(`.stall { background-color: var(--s-bg); }
                .stall.att-sunburst { background-image: radial-gradient(${falloff}),
                    repeating-conic-gradient(from 0deg at 50% 110px, color-mix(in srgb, var(--s-accent-2) 17%, transparent) 0 9deg, transparent 9deg 18deg),
                    var(--s-backdrop); }`);
        expect(falloffOffences(bare('transparent 0 30%, var(--s-bg) 64%')), 'a bare falloff that is right is right').toEqual([]);
        for (const plant of [
            'var(--s-text) 0 30%, var(--s-bg) 64%',
            'transparent 0 30%, var(--s-muted) 50%, var(--s-bg) 64%',
            'var(--s-muted) 30%, var(--s-bg) 64%',
        ]) {
            expect(falloffOffences(bare(plant)), `no descriptor: ${plant}`).not.toEqual([]);
        }
        // The real sheet with its falloff's paper stop moved to the ink goes red too.
        expect(CSS).toContain('var(--s-bg) 64%');
        expect(falloffOffences(rulesOf(CSS.replaceAll('var(--s-bg) 64%', 'var(--s-muted) 64%')))).not.toEqual([]);
    });
});
