/**
 * What `pnpm workshop:shots` photographs: every screen the probe measures, at
 * the width the probe measures it, under every variant a buyer could see the
 * workshop look in.
 *
 * Computed here, in TypeScript, and published by the showroom
 * (`window.__shotPlan()`), because the screen list is `layout/fixtures.ts`
 * and Node cannot import it (the step-1 critic ran it:
 * `ERR_MODULE_NOT_FOUND`). The screen split is the probe's own function
 * (`screensAt`), so a screenshot is of exactly what was measured.
 *
 * - **Viewports.** 390×844 and 1280×800 for the page screens (the wall
 *   screens only where the wall fits, as the probe does), 1920×1080 for the
 *   canvas screens, and the shop window's two portrait passes — 1080×1920,
 *   the tall wall, and 768×1024, the counter tablet stood on end.
 * - **Variants.** Bare; every decoration worn (one per slot, as the picker
 *   produces) on every screen that wears decorations; and each mood worn
 *   alone, on every screen — the overlay keeps a mood where it drops the
 *   rest.
 * - **Grounds.** A `bg=transparent` overlay paints nothing behind its plates,
 *   so a plain capture would flatten it onto white; each is shot over dark
 *   and over light, the two grounds a streamer can hand it — the probe's three
 *   `-clear` screens (its transparency pass), and the `/stream` hero, which
 *   the probe measures flattened and is composed on that same ground.
 * - **Not the door.** Its deck is three shipped looks and the apex wears the
 *   default look alone (`looksFor` in `looks.ts`), so the workshop probe does
 *   not measure it either.
 *
 * Test: `the-shots-cover-every-probed-screen-and-variant`.
 */
import { NO_DECOR_SCREENS } from './fixtures';
import type { Look } from './looks';
import { clearScreens, screensAt, wallScreens } from './screenSplit';

export type ShotViewport = {
    readonly name: string;
    readonly width: number;
    readonly height: number;
};

export const SHOT_VIEWPORTS = {
    phone: { name: 'phone', width: 390, height: 844 },
    desk: { name: 'desk', width: 1280, height: 800 },
    canvas: { name: 'canvas', width: 1920, height: 1080 },
    portrait: { name: 'portrait', width: 1080, height: 1920 },
    tablet: { name: 'tablet', width: 768, height: 1024 },
} as const satisfies Record<string, ShotViewport>;

export type ShotGround = 'dark' | 'light';

export type ShotJob = {
    readonly viewport: ShotViewport;
    readonly screen: string;
    /** `bare`, `decorations`, or `mood-<label>`. */
    readonly variant: string;
    /** The decoration bits `__paint` is handed for this variant. */
    readonly flags: number;
    /** Set for a transparent overlay: the ground the capture is shot over. */
    readonly ground?: ShotGround;
    /** Where the PNG goes under the output directory; a second instant adds `--t<ms>`. */
    readonly file: string;
};

function slug(label: string): string {
    const out = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return out === '' ? 'row' : out;
}

/** The screens each shot viewport photographs, in the probe's split. */
export function shotScreens(): readonly (readonly [ShotViewport, readonly string[]])[] {
    const notDoor = (name: string): boolean => name !== 'door';
    const { phone, desk, canvas, portrait, tablet } = SHOT_VIEWPORTS;
    return [
        [phone, screensAt(phone.width, false).filter(notDoor)],
        [desk, screensAt(desk.width, false).filter(notDoor)],
        [canvas, screensAt(canvas.width, true).filter(notDoor)],
        [portrait, wallScreens()],
        [tablet, wallScreens()],
    ];
}

/** Every shot of `look`, viewport by viewport. */
export function shotPlan(look: Look): ShotJob[] {
    const decorationBits = look.rows
        .filter((row) => row.slot !== 'mood')
        .reduce((bits, row) => bits | (1 << row.bit), 0);
    const moods = look.rows.filter((row) => row.slot === 'mood');
    const clear = new Set(clearScreens());
    const jobs: ShotJob[] = [];
    for (const [viewport, screens] of shotScreens()) {
        for (const screen of screens) {
            const variants: { variant: string; flags: number }[] = [{ variant: 'bare', flags: 0 }];
            if (decorationBits !== 0 && !NO_DECOR_SCREENS.has(screen)) {
                variants.push({ variant: 'decorations', flags: decorationBits });
            }
            for (const mood of moods) {
                variants.push({ variant: `mood-${slug(mood.label)}`, flags: 1 << mood.bit });
            }
            const grounds: (ShotGround | undefined)[] = clear.has(screen) ? ['dark', 'light'] : [undefined];
            for (const { variant, flags } of variants) {
                for (const ground of grounds) {
                    jobs.push({
                        viewport,
                        screen,
                        variant,
                        flags,
                        ...(ground === undefined ? {} : { ground }),
                        file: `${viewport.name}/${screen}--${variant}${ground === undefined ? '' : `--${ground}`}.png`,
                    });
                }
            }
        }
    }
    return jobs;
}
