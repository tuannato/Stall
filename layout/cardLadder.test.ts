import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CARD_LADDER_LAST_STEP } from './cardLadder';

describe('the-ladders-last-step-is-the-sheets-floor', () => {
    /**
     * The probe's exemption (`CARD_LADDER_LAST_STEP`) is stall.css's phone
     * floor at its last tier, read here from the sheet. Red with the face's
     * floor planted at 17px, or "You pay"'s at 14.
     */
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/ui/stall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const phone = [...css.matchAll(/@media \(max-width: 679\.98px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]!).join('\n');
    const sizeFor = (selector: string): number | undefined => {
        for (const m of phone.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            const selectors = m[1]!.split(',').map((sel) => sel.trim());
            if (!selectors.includes(selector)) continue;
            const size = /font-size:\s*(?:min\()?(\d+(?:\.\d+)?)px/.exec(m[2]!);
            if (size !== null) return Number(size[1]);
        }
        return undefined;
    };

    it('reads the face, the pay figure and "You pay" at their last tier', () => {
        const face = sizeFor(".face-x:where([data-price-tier='3']) .x");
        const pay = sizeFor(".pay-x:where([data-price-tier='3']) .pay-x-n");
        const paid = sizeFor(".row.big:where([data-price-tier='3']) dd");
        expect([face, pay, paid]).not.toContain(undefined);
        expect(CARD_LADDER_LAST_STEP).toEqual({
            'face:price': face,
            'face:seller-price': face,
            'paid:figure': paid,
            'pay:price': pay,
        });
    });
});
