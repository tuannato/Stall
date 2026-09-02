// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StallView } from '../domain/state';
import type { StallHandlers } from './render';
import { identityOf } from './render';
import { stallPath } from '../domain/route';
import {
    broadcastGuideUrl,
    paintObsGuide,
    resetObsGuideForTests,
    OBS_LINK_COPIED,
    OBS_RECIPE_CSS,
    OBS_RECIPE_POSITION,
    OBS_RECIPE_SIZE,
    OBS_RECIPE_SOURCE,
    OBS_RECIPE_TOGGLES,
    OBS_RECIPE_URL,
    OBS_TRUTH_PHONE_VIEWERS,
    OBS_TRUTH_QR_SCAN,
    OBS_TRUTH_RAIL_RESTS,
    OBS_TRUTH_STALE_OVERLAY,
} from './obsGuide';

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
    it('carries view, preset, mode and bg=transparent, path-first, for every combination', () => {
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
                expect(search.get('mode')).toBe(mode);
                expect(search.get('bg')).toBe('transparent');
            }
        }
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
