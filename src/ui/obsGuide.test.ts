// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StallView } from '../domain/state';
import type { StallHandlers } from './render';
import { identityOf } from './render';
import { stallPath } from '../domain/route';
import {
    OBS_STICKER_HEIGHT,
    OBS_STICKER_WIDTH,
    OBS_RAIL_STICKER_HEIGHT,
} from './obsSizes';
import {
    broadcastGuideUrl,
    paintObsGuide,
    resetObsGuideForTests,
    OBS_GUIDE_LEDE,
    OBS_GUIDE_TITLE,
    OBS_LINK_COPIED,
    OBS_RECIPE_CSS,
    OBS_RECIPE_POSITION,
    OBS_RECIPE_SIZE,
    OBS_RECIPE_SOURCE,
    OBS_RECIPE_STICKER,
    OBS_RECIPE_TOGGLES,
    OBS_RECIPE_URL,
    OBS_MODE_FIXED,
    OBS_MODE_RAIL,
    OBS_TRUTH_PHONE_VIEWERS,
    OBS_TRUTH_QR_SCAN,
    OBS_TRUTH_RAIL_RESTS,
    OBS_TRUTH_SIDE_RAIL_HAS_NO_PRICE,
    OBS_TRUTH_STALE_OVERLAY,
} from './obsGuide';

const UI_DIR = dirname(fileURLToPath(import.meta.url));

const PK = `03${'aa'.repeat(32)}`;
const ADDR = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';

function view(over: Partial<StallView> = {}): StallView {
    return {
        route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
        address: ADDR,
        stallName: 'Riverside Goods',
        ...over,
    };
}

function handlers(): StallHandlers {
    return {
        onBuy: vi.fn(),
        onRetry: vi.fn(),
        onCloseSheet: vi.fn(),
    };
}

// The module's picked preset/mode live in file scope (so a full repaint
// elsewhere does not reset a streamer's choice) — reset between tests for
// the same reason `resetIconsForTests` exists in render.test.ts.
beforeEach(() => {
    resetObsGuideForTests();
});

describe('the-obs-guide-url-carries-every-broadcast-param', () => {
    it('carries view, preset, mode and bg=transparent, path-first, and omits mode on rail', () => {
        const v = view();
        const path = stallPath(identityOf(v)!);
        for (const preset of ['corner', 'rail'] as const) {
            for (const mode of ['fixed', 'rail'] as const) {
                const url = broadcastGuideUrl(v, preset, mode);
                expect(url).toBeDefined();
                expect(url!.startsWith(`${location.origin}${path}`)).toBe(true);
                const search = new URL(url!).searchParams;
                expect(search.get('view')).toBe('broadcast');
                expect(search.get('preset')).toBe(preset);
                expect(search.get('bg')).toBe('transparent');
                if (preset === 'rail') {
                    expect(search.has('mode'), 'the parser ignores mode on rail').toBe(
                        false,
                    );
                } else {
                    expect(search.get('mode')).toBe(mode);
                }
            }
        }
    });
});

describe('the-rest-truth-follows-the-mode-not-the-preset', () => {
    /**
     * `OBS_TRUTH_RAIL_RESTS` is about Price display = Rest, then show a
     * price — not the Side rail preset, which never shows a price at all.
     */
    it('names the mode on the corner preset, and is omitted on side rail', () => {
        const section = document.createElement('section');
        paintObsGuide(section, view(), handlers());
        expect(OBS_TRUTH_RAIL_RESTS).toContain(OBS_MODE_RAIL);
        expect(OBS_TRUTH_RAIL_RESTS).toContain(OBS_MODE_FIXED);
        expect(OBS_TRUTH_RAIL_RESTS).not.toMatch(/side.?rail/i);
        expect(section.textContent).toContain(OBS_TRUTH_RAIL_RESTS);
        expect(section.textContent).not.toContain(OBS_TRUTH_SIDE_RAIL_HAS_NO_PRICE);

        const presetSelect = section.querySelector(
            '[data-role="obs-preset-picker"]',
        ) as HTMLSelectElement;
        presetSelect.value = 'rail';
        presetSelect.dispatchEvent(new Event('change'));
        expect(section.textContent).not.toContain(OBS_TRUTH_RAIL_RESTS);
        expect(section.textContent).toContain(OBS_TRUTH_SIDE_RAIL_HAS_NO_PRICE);
    });
});

describe('the-obs-guide-says-phone-viewers-need-the-link', () => {
    it('quotes the phone-viewers truth verbatim', () => {
        const section = document.createElement('section');
        paintObsGuide(section, view(), handlers());
        expect(section.textContent).toContain(OBS_TRUTH_PHONE_VIEWERS);
    });
});

describe('the-generated-url-never-carries-the-pages-own-search', () => {
    it('drops a ?m= settings hint sitting in the page location', () => {
        const before = window.location.href;
        window.history.replaceState({}, '', `/s/x?m=${'a'.repeat(64)}`);
        try {
            const url = broadcastGuideUrl(view(), 'corner', 'fixed')!;
            expect(new URL(url).searchParams.has('m')).toBe(false);
        } finally {
            window.history.replaceState({}, '', before);
        }
    });
});

describe('the-mode-choice-hides-when-the-preset-is-rail', () => {
    it('removes the mode picker from the DOM rather than merely disabling it', () => {
        const section = document.createElement('section');
        paintObsGuide(section, view(), handlers());
        expect(section.querySelector('[data-role="obs-mode-picker"]')).not.toBeNull();
        const presetSelect = section.querySelector(
            '[data-role="obs-preset-picker"]',
        ) as HTMLSelectElement;
        presetSelect.value = 'rail';
        presetSelect.dispatchEvent(new Event('change'));
        expect(section.querySelector('[data-role="obs-mode-picker"]')).toBeNull();
    });
});

describe('changing-the-preset-changes-the-generated-url', () => {
    it('re-renders the copy field to match the newly picked preset', () => {
        const section = document.createElement('section');
        paintObsGuide(section, view(), handlers());
        const field = () => section.querySelector('.share-url') as HTMLInputElement;
        expect(field().value).toContain('preset=corner');
        const presetSelect = section.querySelector(
            '[data-role="obs-preset-picker"]',
        ) as HTMLSelectElement;
        presetSelect.value = 'rail';
        presetSelect.dispatchEvent(new Event('change'));
        expect(field().value).toContain('preset=rail');
    });
});

describe('the-copy-button-copies-the-generated-url', () => {
    it('writes the current link to the clipboard and says so', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        try {
            const section = document.createElement('section');
            paintObsGuide(section, view(), handlers());
            const btn = section.querySelector(
                '[data-role="obs-copy-link"] button',
            ) as HTMLButtonElement;
            btn.click();
            await Promise.resolve();
            await Promise.resolve();
            expect(writeText).toHaveBeenCalledWith(expect.stringContaining('view=broadcast'));
            expect(btn.textContent).toBe(OBS_LINK_COPIED);
        } finally {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: undefined,
            });
        }
    });
});

describe('the-obs-guide-paints-the-recipe-and-every-truth', () => {
    it('renders every OBS Browser Source step and every truth', () => {
        const section = document.createElement('section');
        paintObsGuide(section, view(), handlers());
        const text = section.textContent ?? '';
        for (const step of [
            OBS_RECIPE_SOURCE,
            OBS_RECIPE_URL,
            OBS_RECIPE_SIZE,
            OBS_RECIPE_STICKER,
            OBS_RECIPE_CSS,
            OBS_RECIPE_TOGGLES,
            OBS_RECIPE_POSITION,
        ]) {
            expect(text).toContain(step);
        }
        for (const truth of [
            OBS_TRUTH_PHONE_VIEWERS,
            OBS_TRUTH_QR_SCAN,
            OBS_TRUTH_RAIL_RESTS,
            OBS_TRUTH_STALE_OVERLAY,
        ]) {
            expect(text).toContain(truth);
        }
    });
});

describe('the-recipe-offers-both-source-sizes', () => {
    /**
     * Width is the one number the overlay sheet implies (plate + both
     * insets). Height is owned by `obsSizes` and quoted, never retyped.
     */
    it('paints drop-in and sticker lines, and derives sticker width from broadcast.css', () => {
        const css = readFileSync(join(UI_DIR, 'broadcast.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
        const bodyOf = (want: string): string => {
            const hit = rules.find(([, sel]) => sel!.trim() === want);
            expect(hit, want).toBeDefined();
            return hit![2]!;
        };
        const plate = bodyOf('.stall.broadcast .bc');
        const corner = bodyOf(".stall.broadcast .bc[data-preset='corner']");
        const widthPx = Number(/width:\s*(\d+)px/.exec(plate)?.[1]);
        const insetPx = Number(/right:\s*(\d+)px/.exec(corner)?.[1]);
        expect(Number.isFinite(widthPx), 'plate width from .bc').toBe(true);
        expect(Number.isFinite(insetPx), 'corner right inset').toBe(true);
        expect(OBS_STICKER_WIDTH).toBe(widthPx + insetPx + insetPx);

        const section = document.createElement('section');
        paintObsGuide(section, view(), handlers());
        const text = section.textContent ?? '';
        expect(text).toContain('1920');
        expect(text).toContain('1080');
        expect(text).toContain(String(OBS_STICKER_WIDTH));
        expect(text).toContain(String(OBS_STICKER_HEIGHT));
        expect(text).toContain(String(OBS_RAIL_STICKER_HEIGHT));

        expect(OBS_GUIDE_TITLE).toBe('Stream overlay');
        expect(OBS_GUIDE_LEDE).not.toMatch(/saved on this device/i);
        expect(text).toContain(OBS_GUIDE_LEDE);

        expect(text).toMatch(/bottom-right/);
        expect(text).toMatch(/mid-right/);
        expect(text).toMatch(/above and below/);
        expect(text).toMatch(/vertical stream/i);
        expect(OBS_RECIPE_POSITION).toMatch(/QR scales/i);

        expect(OBS_TRUTH_QR_SCAN).toMatch(/204/);
        expect(OBS_TRUTH_QR_SCAN).toMatch(/1\s*[×x]/);
        expect(OBS_TRUTH_QR_SCAN).toMatch(/not measured/);
        expect(OBS_TRUTH_QR_SCAN).not.toMatch(/floor we measured/i);

        const src = readFileSync(join(UI_DIR, 'obsGuide.ts'), 'utf8');
        expect(src).toMatch(/OBS_STICKER_WIDTH/);
        expect(src).toMatch(/OBS_STICKER_HEIGHT/);
        expect(src).toMatch(/OBS_RAIL_STICKER_HEIGHT/);
        for (const n of [OBS_STICKER_WIDTH, OBS_STICKER_HEIGHT, OBS_RAIL_STICKER_HEIGHT]) {
            expect(src).not.toMatch(new RegExp(`\\b${String(n)}\\b`));
        }
    });
});
