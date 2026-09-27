// @vitest-environment happy-dom
/**
 * `every-anchor-the-app-builds-sets-its-own-colour` (step 5b; SAMPLER-STEP-PLAN
 * v2 item 9, CRITIC-SAMPLER-STEP item 10).
 *
 * An anchor with no colour of its own paints the browser's link blue — and
 * its `:visited` purple, which no pass can see: a browser never exposes a
 * visited link's colour to script, so the probe's pixels read the unvisited
 * one alone. The first-stall and Studio guide links shipped that way at
 * 2.15:1 on Neo (1.84 visited). So every `<a>` `renderStall` builds, on every
 * fixture screen under every shipped look, must carry a class that some
 * sheet the app loads gives a `color` of its own — a class rule applies to a link in
 * both states, so the visited colour is the class's colour.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderStall } from '../src/ui/render';
import { appSheets } from '../scripts/sheet-roles.mjs';
import { SCREENS, handlers } from './fixtures';
import { shippedLooks } from './looks';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every selector of a rule that declares `color`, in a sheet the app itself
 * loads (the base, the looks, the screen sheets — a document page's `a {…}`
 * never reaches the app), that applies to a link at rest: a state (`:hover`, `:focus…`, `:active`,
 * `:visited`, `:link`) or a pseudo-element colours something else.
 */
function colourSelectors(): string[] {
    const out: string[] = [];
    for (const sheet of appSheets()) {
        const css = readFileSync(join(ROOT, sheet.path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
            if (!/(?:^|;)\s*color\s*:/.test(m[2]!)) continue;
            for (const one of m[1]!.split(',')) {
                const sel = one.trim();
                if (sel === '' || sel.startsWith('@') || /::|:(?:hover|focus|focus-visible|focus-within|active|visited|link)\b/.test(sel)) continue;
                out.push(sel);
            }
        }
    }
    return out;
}

/** Whether a served rule declaring `color` matches this anchor itself. */
function colouredBy(a: Element, selectors: readonly string[]): string | undefined {
    return selectors.find((sel) => {
        try {
            return a.matches(sel);
        } catch {
            return false;
        }
    });
}

describe('every-anchor-the-app-builds-sets-its-own-colour', () => {
    it('finds, on every fixture screen and shipped look, no anchor without a colour of its own', () => {
        const selectors = colourSelectors();
        expect(selectors, 'the guide links’ dress sets a colour').toContain('.cashtab-link');
        const root = document.createElement('div');
        root.id = 'app';
        document.body.append(root);
        const bare: string[] = [];
        let anchors = 0;
        for (const [name, screen] of Object.entries(SCREENS)) {
            for (const look of shippedLooks()) {
                renderStall(root, { ...screen, theme: look.theme, worn: [] }, handlers);
                for (const a of root.querySelectorAll('a')) {
                    anchors += 1;
                    if (colouredBy(a, selectors) === undefined) {
                        bare.push(`${name} / ${look.label}: <a class="${a.className}" data-role="${a.getAttribute('data-role') ?? ''}">${(a.textContent ?? '').trim().slice(0, 30)}</a>`);
                    }
                }
            }
        }
        root.remove();
        expect(anchors, 'the fixtures build anchors to read').toBeGreaterThan(50);
        expect([...new Set(bare)]).toEqual([]);
    });

    it('counts a rule that colours the anchor itself, at rest, and nothing else', () => {
        const selectors = colourSelectors();
        const host = document.createElement('div');
        host.className = 'door-nav';
        const a = document.createElement('a');
        host.append(a);
        document.body.append(host);
        // `.door-nav a { color }` colours it; a hover rule, a background, or
        // the class on an ancestor alone does not.
        expect(colouredBy(a, selectors)).toBe('.door-nav a');
        expect(colouredBy(a, ['.door-nav a:hover'].filter((s) => selectors.includes(s)))).toBeUndefined();
        const bare = document.createElement('a');
        document.body.append(bare);
        expect(colouredBy(bare, selectors)).toBeUndefined();
        host.remove();
        bare.remove();
    });
});
