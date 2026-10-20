// @vitest-environment happy-dom
/**
 * The attribute values a look may match, against the screens the probe paints
 * (the lint-belts critic's fourth review, B3). A look sheet may match the
 * values in `STATE_ATTRIBUTES` and nothing else; the probe measures every
 * screen at rest, so a rule under a value no fixture paints is a rule no pass
 * measures. Each value is therefore one of three things:
 *
 * - **painted** by some probe screen, here with the staged states a press
 *   reaches (`STAGED`: `addr-shown` paints `data-copied='shown'`,
 *   `addr-copied` paints `data-copied='true'`), so a rule under it is read at
 *   rest;
 * - **a state**: the attribute is one the first-party belt fails closed on
 *   (`namesAState`), so a rule under it sets only what a state may;
 * - or on `UNPAINTED`, a stated gap with its reason, pinned by value so a
 *   value the fixtures start to paint, or a state the belt starts to name,
 *   makes the entry stale and turns this red.
 *
 * The paint is happy-dom's, on the default look: attributes the app writes
 * with `setAttribute` are there, and attributes written after a layout
 * measure are not (the name ladder's rungs, the marquee's arming).
 */
import { describe, expect, it } from 'vitest';
import { renderStall } from '../src/ui/render';
import { PRESENCE_ATTRIBUTES, STATE_ATTRIBUTES, namesAState } from '../scripts/workshop-css.mjs';
import { SCREENS, STAGED, handlers, stageScreen } from './fixtures';
import { measuredLooks, paintView } from './looks';

/** Every `name=value` and every `name` any probe screen paints on the default look, bare, with its staged state. */
function paintedAttributes(): Set<string> {
    const look = measuredLooks().find((l) => l.theme.sheetClass === 't-modern')!;
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);
    const seen = new Set<string>();
    for (const [screen, view] of Object.entries(SCREENS)) {
        renderStall(root, paintView(view, look, []), handlers);
        stageScreen(screen, root);
        for (const el of root.querySelectorAll('*')) {
            for (const name of el.getAttributeNames()) {
                seen.add(name);
                seen.add(`${name}=${el.getAttribute(name)}`);
            }
        }
    }
    root.remove();
    return seen;
}

/**
 * The values a look may match that no fixture paints and the belt does not
 * name, each with why. Pinned by value (`holds the gaps by value`). The first
 * two are painted by the probe in Chrome and by nothing in happy-dom; the
 * rest are fixtures the probe does not have, stated for the window.
 */
const UNPAINTED: Readonly<Record<string, string>> = Object.freeze({
    'data-name-tier=1': 'written after a layout measure (applyNameTiers), for a look that states --name-rungs: the tracked fixture look, in Chrome',
    'data-name-tier=2': 'as data-name-tier=1',
    'data-name-tier=3': 'as data-name-tier=1',
    'data-name-tier=4': 'as data-name-tier=1',
    'data-name-tier=5': 'as data-name-tier=1',
    'data-name-tier=6': 'as data-name-tier=1',
    'data-code=false': 'the shop window sheet with its pay code off: no fixture sets paycode=off',
    'data-format=square': "the poster sheet's format: the fixtures paint print and tag only",
    'data-format=story': 'as data-format=square',
    'data-format=stream': 'as data-format=square',
    'data-tier=2': "the stream card's price tier 2: the fixtures paint tiers 1 and 3",
});

describe('every-attribute-value-a-look-may-match-is-painted-or-is-a-state', () => {
    const painted = paintedAttributes();
    const matchable = Object.entries(STATE_ATTRIBUTES).flatMap(([name, values]) => values.map((value) => `${name}=${value}`));

    it('paints, or fails closed on, every value of STATE_ATTRIBUTES, and states the rest', () => {
        const missing: string[] = [];
        for (const key of matchable) {
            const [name, value] = [key.slice(0, key.indexOf('=')), key.slice(key.indexOf('=') + 1)];
            if (painted.has(key) || namesAState(`[${name}='${value}']`) || Object.hasOwn(UNPAINTED, key)) continue;
            missing.push(key);
        }
        expect(missing, 'a value a look may match that no screen paints and no belt names').toEqual([]);
    });

    it('holds the gaps by value, and none is stale: each is matchable, unpainted and not a state', () => {
        expect(Object.keys(UNPAINTED).sort()).toEqual([
            'data-code=false',
            'data-format=square',
            'data-format=story',
            'data-format=stream',
            'data-name-tier=1',
            'data-name-tier=2',
            'data-name-tier=3',
            'data-name-tier=4',
            'data-name-tier=5',
            'data-name-tier=6',
            'data-tier=2',
        ]);
        for (const key of Object.keys(UNPAINTED)) {
            const [name, value] = [key.slice(0, key.indexOf('=')), key.slice(key.indexOf('=') + 1)];
            expect(matchable, `${key} is a value STATE_ATTRIBUTES lists`).toContain(key);
            expect(painted.has(key), `${key} is painted now: take it off UNPAINTED`).toBe(false);
            expect(namesAState(`[${name}='${value}']`), `${key} is a belt state now: take it off UNPAINTED`).toBe(false);
        }
    });

    it('names the three states no fixture paints, and paints data-copied both ways (B3)', () => {
        for (const [name, value] of [
            ['data-state', 'stale'],
            ['aria-disabled', 'true'],
            ['data-over', 'true'],
        ]) {
            expect(painted.has(`${name}=${value}`), `no fixture paints [${name}='${value}']`).toBe(false);
            expect(namesAState(`[${name}='${value}']`), `[${name}='${value}'] is a state`).toBe(true);
            expect(namesAState(`.t-x:has([${name}])`), `[${name}] inside :has() is a state`).toBe(true);
        }
        // `data-copied` is painted both ways, so a rule under either is measured at rest and is not a state.
        for (const value of ['shown', 'true']) {
            expect(painted.has(`data-copied=${value}`), `a probe screen paints [data-copied='${value}']`).toBe(true);
            expect(namesAState(`[data-copied='${value}']`), `[data-copied='${value}'] is read at rest`).toBe(false);
        }
        expect(Object.keys(STAGED)).toEqual(expect.arrayContaining(['addr-shown', 'addr-copied']));
    });

    it('reads every presence attribute as painted, bar the marquee, which a layout measure arms', () => {
        const unpainted = (PRESENCE_ATTRIBUTES as readonly string[]).filter((name) => !painted.has(name) && !namesAState(`[${name}]`));
        expect(unpainted).toEqual(['data-marquee']);
    });
});
