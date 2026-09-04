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
    OBS_GUIDE_MORE_LINK,
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
    OBS_STEP_CHOOSE,
    OBS_STEP_COPY,
    OBS_STEP_SOURCE,
    OBS_TRUTHS_TITLE,
    OBS_TRUTH_PHONE_VIEWERS,
    OBS_TRUTH_QR_SCAN,
    OBS_TRUTH_QUOTE_CARDS,
    OBS_TRUTH_RAIL_RESTS,
    OBS_TRUTH_SIDE_RAIL_HAS_NO_PRICE,
    OBS_TRUTH_STALE_OVERLAY,
} from './obsGuide';

const UI_DIR = dirname(fileURLToPath(import.meta.url));

/** The guide's own sheet, comments stripped — a comment cannot paint. */
const guideCss = (): string =>
    readFileSync(join(UI_DIR, 'obsGuide.css'), 'utf8').replace(
        /\/\*[\s\S]*?\*\//g,
        '',
    );

function painted(): HTMLElement {
    const section = document.createElement('section');
    paintObsGuide(section, view(), handlers());
    return section;
}

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
            // The corner preset gained a fifth truth with the quote cards:
            // the switch is a link option a streamer can only learn here.
            OBS_TRUTH_QUOTE_CARDS,
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

describe('the-obs-guide-paints-three-steps-in-order', () => {
    /**
     * Three numbered steps and then the truths, in the DOM order a phone
     * reads top to bottom (the desktop two-column block re-places them, and
     * a grid area is not a reading order). `.section-head` stays the
     * section's own h2 — `the-studio-groups-its-tools` pins that a studio
     * head carries no data-role, and the guide must not mint a second one.
     */
    it('heads the steps, then the truths, and mints no section head', () => {
        const section = painted();
        expect(
            [...section.querySelectorAll('h3.obs-h')].map((h) => h.textContent),
        ).toEqual([OBS_STEP_CHOOSE, OBS_STEP_COPY, OBS_STEP_SOURCE, OBS_TRUTHS_TITLE]);
        expect(section.querySelector('.section-head')).toBeNull();
        // The step badge has its own class, so `.obs-n` stays the recipe's
        // alone and the count below means what it says.
        expect(
            [...section.querySelectorAll('.obs-sn')].map((n) => n.textContent),
        ).toEqual(['1', '2', '3']);
    });
});

describe('the-recipe-numbers-are-nodes-not-pseudos', () => {
    /**
     * The design numbered the recipe with `li::before { position: absolute }`
     * and the layout probe refuses a positioned pseudo-element outright: it
     * is not in the DOM, so neither the box check nor the hit test can see
     * it (PROBE-RULES, "Geometry rules"). Real spans instead — and the sheet
     * carries no `content:` at all, so the rule cannot come back by a side
     * door.
     */
    it('paints 01…07 as real spans and the sheet generates no content', () => {
        const section = painted();
        expect(
            [
                ...section.querySelectorAll('[data-role="obs-recipe"] .obs-n'),
            ].map((n) => n.textContent),
        ).toEqual(['01', '02', '03', '04', '05', '06', '07']);
        expect(section.querySelectorAll('.obs-n').length).toBe(7);
        const css = guideCss();
        // A property, not a substring: `align-content:` is not generated
        // content and a rule that reads as one would send the next author
        // hunting for a defect that is not there.
        expect(css).not.toMatch(/(?:^|[;{}\s])content\s*:/);
        expect(css).not.toMatch(/::(before|after)/);
    });
});

describe('the-diagram-follows-the-picker', () => {
    /**
     * The schematic is the picker's answer drawn: where the card sits, and
     * whether a price is on it. A resting card and the side rail both mount
     * NO price node — dimming one would leave a price on a card that never
     * shows one, which is the same lie `renderBroadcastView` refuses by not
     * mounting `.bc-ext` at rest (PROBE-RULES, "A rested card mounts no
     * price"). `data-mode` is dropped on the rail exactly as the generated
     * URL drops `mode`: the parser ignores it there.
     */
    it('tracks both pickers and mounts no price line at rest or on the rail', () => {
        const section = painted();
        const dia = (): Element =>
            section.querySelector('[data-role="obs-diagram"]')!;
        const price = (): Element | null =>
            section.querySelector('[data-role="obs-diagram"] .d-price');

        // The shipped default is the corner, resting.
        expect(dia().getAttribute('data-preset')).toBe('corner');
        expect(dia().getAttribute('data-mode')).toBe('rail');
        expect(price()).toBeNull();
        // No words, and nothing a money rule would have to protect.
        expect(dia().textContent).toBe('');
        expect(dia().querySelector('[data-role="price"]')).toBeNull();

        const modeSelect = section.querySelector(
            '[data-role="obs-mode-picker"]',
        ) as HTMLSelectElement;
        modeSelect.value = 'fixed';
        modeSelect.dispatchEvent(new Event('change'));
        expect(dia().getAttribute('data-mode')).toBe('fixed');
        expect(price()).not.toBeNull();

        const presetSelect = section.querySelector(
            '[data-role="obs-preset-picker"]',
        ) as HTMLSelectElement;
        presetSelect.value = 'rail';
        presetSelect.dispatchEvent(new Event('change'));
        expect(dia().getAttribute('data-preset')).toBe('rail');
        expect(dia().getAttribute('data-mode')).toBeNull();
        expect(price()).toBeNull();
    });
});

describe('the-toggle-line-names-both-toggles-in-strong', () => {
    /**
     * The two OBS toggles are the line a streamer skims past, so they are
     * bolded — by SLICING the constant at its quote characters. Retyping
     * them would put a second copy of pinned copy in this module, and
     * `the-obs-guide-paints-the-recipe-and-every-truth` would go on passing
     * while the two drifted apart.
     */
    it('bolds the two quoted names without retyping a byte', () => {
        const section = painted();
        const items = [...section.querySelectorAll('[data-role="obs-recipe"] li')];
        expect(items.length).toBe(7);
        const line = items[5]!;
        expect(line.textContent).toBe(`06${OBS_RECIPE_TOGGLES}`);
        const quoted = [...OBS_RECIPE_TOGGLES.matchAll(/“[^”]*”/g)].map(
            (m) => m[0],
        );
        expect(quoted.length, 'the constant still carries two quoted names').toBe(2);
        expect([...line.querySelectorAll('strong')].map((s) => s.textContent)).toEqual(
            quoted,
        );
    });
});

describe('the-truths-lead-with-their-first-phrase', () => {
    /** Same slicing rule as the toggle line: the lead phrase is the constant
     *  up to its first em dash, never a second copy of it. */
    it('bolds each truth up to its first em dash and keeps the text intact', () => {
        const section = painted();
        const plates = [...section.querySelectorAll('[data-role="obs-truths"] p')];
        const truths = [
            OBS_TRUTH_PHONE_VIEWERS,
            OBS_TRUTH_QR_SCAN,
            OBS_TRUTH_RAIL_RESTS,
            OBS_TRUTH_QUOTE_CARDS,
            OBS_TRUTH_STALE_OVERLAY,
        ];
        expect(plates.length).toBe(truths.length);
        plates.forEach((plate, i) => {
            const truth = truths[i]!;
            expect(plate.textContent).toBe(truth);
            const lead = plate.querySelector('strong');
            expect(lead, truth).not.toBeNull();
            expect(lead!.textContent).toBe(truth.slice(0, truth.indexOf(' — ')));
        });
    });
});

describe('the-studio-names-the-quotes-toggle', () => {
    /**
     * `cards=quotes` is a link option, not a picker, so the studio is the one
     * place a streamer meets it — named the way the OBS toggles are, by
     * SLICING the constant at its quote characters. And it carries the reason
     * to price in XEC for a stream nobody is watching: the page converts a USD
     * quote at the moment of the scan, but the seller's own reconciliation
     * still needs a rate.
     */
    it('bolds the switch inside the truth without retyping a byte', () => {
        const section = painted();
        const plate = [...section.querySelectorAll('[data-role="obs-truths"] p')].find(
            (p) => p.textContent === OBS_TRUTH_QUOTE_CARDS,
        );
        expect(plate, 'the corner preset carries the quote-cards truth').toBeDefined();
        const quoted = [...OBS_TRUTH_QUOTE_CARDS.matchAll(/“[^”]*”/g)].map((m) => m[0]);
        expect(quoted, 'the constant names the switch in quotes').toEqual([
            '“cards=quotes”',
        ]);
        const bolded = [...plate!.querySelectorAll('strong')].map((s) => s.textContent);
        // The lead phrase, as every truth has, and the switch itself.
        expect(bolded).toEqual([
            OBS_TRUTH_QUOTE_CARDS.slice(0, OBS_TRUTH_QUOTE_CARDS.indexOf(' — ')),
            '“cards=quotes”',
        ]);
        expect(OBS_TRUTH_QUOTE_CARDS).toContain('XEC');
    });

    it('is the same sentence the static guide carries', () => {
        const html = readFileSync(join(UI_DIR, '..', '..', 'public', 'stream.html'), 'utf8');
        expect(html).toContain('cards=quotes');
        expect(html).toMatch(/XEC/);
    });
});

describe('the-diagram-has-no-transition', () => {
    /**
     * `renderBody` calls `replaceChildren()` and rebuilds the whole subtree
     * on every picker change, so the diagram's nodes are always brand new at
     * their final position — a transition could never animate, it could only
     * sit armed. And the reduced-motion probe pass runs `offers,publish` and
     * `broadcast` only, never the studio, so nothing else in this repository
     * would ever see one.
     */
    it('declares no transition, animation or keyframes in the guide sheet', () => {
        const css = guideCss();
        expect(css).not.toMatch(/transition/);
        expect(css).not.toMatch(/animation\s*:/);
        expect(css).not.toMatch(/@keyframes/);
    });
});

describe('the-door-and-the-studio-link-to-the-stream-guide', () => {
    /**
     * The guide is a static page beside the app (CLAUDE.md §9). The studio
     * section is where a seller looks for it, so the section ends in a plain
     * anchor to `/stream` — with an identity and without one, because the
     * waiting screens paint this section too.
     */
    it('ends the section with a plain link to /stream, with or without an identity', () => {
        const withId = painted().querySelector('[data-role="obs-guide-link"]');
        expect(withId?.getAttribute('href')).toBe('/stream');
        expect(withId?.textContent).toBe(OBS_GUIDE_MORE_LINK);
        expect(withId?.tagName).toBe('A');

        const section = document.createElement('section');
        paintObsGuide(
            section,
            // The door route carries no identity, so `identityOf` is undefined here.
            view({ route: { kind: 'home' }, address: undefined, stallName: undefined }),
            handlers(),
        );
        const withoutId = section.querySelector('[data-role="obs-guide-link"]');
        expect(withoutId?.getAttribute('href')).toBe('/stream');
    });
});
