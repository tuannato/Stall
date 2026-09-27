/**
 * **Every moving decoration, and what reads it at its worst** (step 5b;
 * SAMPLER-STEP-PLAN v2 item 5, STEP-5-PLAN's 5b; `PROBE-RULES.md`, "Every
 * moving decoration has a reader or a reason").
 *
 * The contrast pass freezes every animation at one instant, so what it
 * reads under a decoration that moves depends on where the decoration was
 * then — a green is luck. So every catalogue row that moves (`motion: true`)
 * is here, keyed by its class, with either a **reader** — the rule or test
 * that holds the lines it can reach at the decoration's worst — or a
 * written **reason** it needs none. `every-moving-decoration-has-a-reader-or-a-reason`
 * holds the keys to exactly the moving rows of every shipped look, and each
 * reader to a name some test or rule in this repository carries.
 *
 * Moving INKS — Neo's ticker flicker, the hum's dimmed lamp, the pin demo,
 * Rural's swaying tag and swinging board — are not grounds and are not
 * here: they are staged with G7 and named open in `PROBE-RULES.md`.
 *
 * Nothing here may lay a ground under text over a decoration (the owner's
 * standing rule): a line that fails over a moving decoration takes the
 * outline rule instead.
 */
export type MovingEntry =
    | { readonly reader: string; readonly how: string }
    | { readonly reason: string };

export const MOVING_DECORATIONS: Readonly<Record<string, MovingEntry>> = {
    'att-rainfall': {
        reader: 'a-line-on-the-ground-reads-wherever-a-drop-falls',
        how:
            'the probe replaces the three drop sheets with one flat layer of the brightest drop the art draws ' +
            '(`rainAtItsBrightest`), required by key (`RAIN_REQUIRED`), and every line on the ground wears the ' +
            'outline and is read in the ring around its glyphs',
    },
    'att-confetti': {
        reader: 'every-confetti-scrap-clears-three-to-one-under-every-ground-ink',
        how:
            'pure: every fill of the three sheets, read from the art by an allow-list, against every ink Rural ' +
            'can set on bare ground, bare and under each Rural mood — the darkest scrap included',
    },
    'att-sunburst': {
        reader: 'every-sunburst-ray-clears-three-to-one-under-every-ground-ink',
        how:
            "pure: the ray at full tint over a weave crossing, read from the sheet's own gradient, against every " +
            'ink Rural can set on bare ground, bare and under each Rural mood',
    },
    'att-aurora': {
        reader: 'the-aurora-is-read-at-both-ends-of-its-tide',
        how:
            'the pass paints the aurora worn alone on every screen whose lines stand on Neo’s bare ground, its ' +
            'tide held at 0 and at 1 (`TIDE_SCREENS`); each channel is convex in the tide, so the ends are its worst',
    },
    'att-bunting': {
        reader: 'the-bunting-never-swings-into-the-ornament-label',
        how:
            'the probe sweeps the row through the widest turn its own keyframes reach, about its own origin, and ' +
            "holds the swept box off every line of the ornament strip's own text",
    },
    'att-pinstripe': {
        reason:
            "the stripe runs in each card's 2px border alone: the card's padding box is painted in the surface, " +
            'solid, under every line inside it, and no line stands on the border',
    },
    'att-hum': {
        reason:
            "it moves an ink, not a ground — one letter of the sign's name dims and its glow drops — and the " +
            'name wears it on its own ground; a moving ink is staged with G7',
    },
    'att-beetle': {
        reason:
            'a node that roams its own yard strip, where no line of text stands; the geometry passes keep every ' +
            'decoration box off every protected box, frame by frame over time (`checkOverTime`)',
    },
};
