/**
 * `the-money-set-is-every-protected-contrast-target`, its static half (the
 * browser half is the probe rule of the same name, on every geometry pass).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONEY, MONEY_OUTSIDE_PROTECTED, MONEY_SET } from './moneySet';

const PROBE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'probe.ts'), 'utf8');

/** The single-quoted selector literals of one `const NAME = [ … ].join(', ')` in probe.ts. */
function listOf(name: string): string[] {
    const at = PROBE.indexOf(`const ${name} = [`);
    expect(at, `probe.ts declares ${name}`).toBeGreaterThanOrEqual(0);
    const end = PROBE.indexOf("].join(', ')", at);
    const body = PROBE.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

describe('the-money-set-is-every-protected-contrast-target', () => {
    it('pins the set by value', () => {
        expect(MONEY_SET).toEqual([
            '[data-role="price"]',
            '.row.big dd',
            '.buy',
            '.addr-short',
            '.addr-full',
            '[data-role="publish-hex"]',
            '[data-role="describe-hex"]',
            '[data-role="fiat"]',
            '[data-role="rate"]',
            '[data-role="receipt-amount"]',
            '[data-role="seller-price"]',
            '[data-role="pay-surcharge"]',
            '[data-role="quote-surcharge"]',
            '[data-role="selection-total"]',
            '[data-role="pay-lines"]',
            '[data-role="pay-total"]',
            '[data-role="pay-cashtab"]',
            '[data-role="pay-wallet"]',
            '[data-role="selection-figure"]',
            '[data-role="window-pay"]',
            '.sw-pay-v',
            '.sw-pay-s',
        ]);
        expect(MONEY).toBe(MONEY_SET.join(', '));
        expect(MONEY_SET).toContain(MONEY_OUTSIDE_PROTECTED);
    });

    it('holds every selector that is protected and a contrast target, and names only contrast targets', () => {
        const protectedList = listOf('PROTECTED');
        const contrast = listOf('CONTRAST_TEXT');
        expect(protectedList.length).toBeGreaterThan(10);
        expect(contrast.length).toBeGreaterThan(50);
        const both = protectedList.filter((sel) => contrast.includes(sel));
        expect(both.length, 'the two lists share the money selectors').toBeGreaterThan(5);
        expect(both.filter((sel) => !MONEY_SET.includes(sel)), 'protected, a contrast target, and not money').toEqual([]);
        // Every money selector is a contrast target by its own string, or —
        // the two pay controls — a role of a class that is one: the Cashtab
        // road is a `.buy`, the other wallet's road a `.mini` (`paySheet`).
        const byRole: Record<string, string> = {
            '[data-role="pay-cashtab"]': '.buy',
            '[data-role="pay-wallet"]': '.mini:not(.sw-switch)',
        };
        for (const sel of MONEY_SET) {
            expect(contrast.includes(sel) || contrast.includes(byRole[sel] ?? '\0'), `${sel} is a contrast target`).toBe(true);
        }
    });

    it('is the set the probe reads whole-box, and the sampler takes it from here', () => {
        expect(PROBE).toContain("from './moneySet'");
        expect(PROBE).toMatch(/node\.matches\(MONEY\)/);
    });
});
