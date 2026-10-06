/**
 * The shared hooks a look may dress (step 8f1; STEP-8-PLAN §4.3, after its
 * critic): what a look whose material is not a colour on a box needs from
 * the DOM, built general and **inert on every look that does not style it**.
 *
 * **Marks.** `lookMark` builds one empty `<i>` a look's own sheet may paint
 * — a stroke under a figure, a ground behind a shelf, a frame around a
 * token's tile. Every mark carries `aria-hidden` and
 * `data-look-mark` (its kind), and `stall.css` sets it `display: none`, so
 * on Modern, Neo and Rural it takes no box, no gap and no grid track (an
 * empty grid item still takes a gap — PORT-DRYRUN B), and `pnpm looks:diff`
 * reads every shot identical. A look shows a mark from its own sheet, at
 * (0,2,0) or above. An `<i>` rather than a `<span>`, so no rule a shipped
 * sheet writes for a row's spans reaches it.
 *
 * Where each mark stands is the renderer's, and one rule binds all three:
 * **a mark is never inside a money node** (the step-8 critic's item 21). The
 * figure's mark is the last child of the figure's own container — a sibling
 * of `[data-role="price"]` / `seller-price`, never their descendant — so a
 * look that hangs it under the digits draws beside the money, and the probe
 * reads the money box whole (`no-look-mark-is-inside-a-money-node`, which
 * also lists every surface that carries one). The shelf's mark is the first
 * child of each `div.items`, so it paints under the rows in document order
 * with no `z-index`; Rural's tilt counts rows by `:nth-child(… of .item)`
 * for that reason. The tile's mark sits beside the token's initials, which
 * have their own span now, and the picture replaces the initials alone.
 *
 * What measures a mark that a look shows is step 8f2's
 * (`no-look-mark-paints-inside-a-protected-box`, STEP-8-PLAN §5): until it
 * lands, nothing in the probe sees one, and no look shows one.
 *
 * **The name's ladder** (`applyNameTiers`). A look that bounds the seller's
 * name in a box of fixed size — a name set on its end in a column, say — has
 * a 32-byte name to fit into it, and a cut name is an absent one. A
 * character count cannot choose a type size for that (`priceTier`'s method
 * reads no layout), so this one is measured after the paint, the marquee's
 * precedent: the look's sheet says how many rungs it has in `--name-rungs`
 * on the name (inherited, so the root may say it), sizes each rung under
 * `.stall-name[data-name-tier="N"]`, and makes its last rung the one that
 * always fits (a smaller size, a second line). This module tries the name
 * at its own size, then each rung in turn, and stops at the first at which
 * the name's content fits its own box on both axes — the look bounds the
 * box; this only reads whether the text stays inside it. Past the last rung
 * the last rung stands. A look that names no rungs (every shipped one) is
 * read once and left alone: no attribute, no layout forced.
 */

export type LookMarkKind = 'figure' | 'shelf' | 'tile';

/** One inert node a look may paint: `display: none` everywhere else (stall.css). */
export function lookMark(kind: LookMarkKind): HTMLElement {
    const mark = document.createElement('i');
    mark.className = `look-mark mark-${kind}`;
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('data-look-mark', kind);
    return mark;
}

/**
 * The most rungs a look's name ladder may have. `data-name-tier` is a state
 * attribute a look sheet may match by these values exactly
 * (`STATE_ATTRIBUTES` in `scripts/workshop-css.mjs`, which reads this
 * number), so the ladder is a closed list like the price's.
 */
export const NAME_TIER_MAX = 6;

/** The custom property a look's sheet states its rung count in, on the name or above it. */
export const NAME_RUNGS_PROPERTY = '--name-rungs';

type Fits = (name: HTMLElement) => boolean;

/** Whether the name's content stays inside its own box, a pixel of rounding allowed. */
const realFits: Fits = (name) =>
    name.scrollWidth <= name.clientWidth + 1 && name.scrollHeight <= name.clientHeight + 1;
let fits: Fits = realFits;

/** Tests inject a measure: happy-dom lays out nothing, and every box fits. */
export function setNameTierFits(next: Fits | undefined): void {
    fits = next ?? realFits;
}

/** The rungs the look gives this name: a whole number up to `NAME_TIER_MAX`, or 0. */
export function nameRungs(name: HTMLElement): number {
    const raw = getComputedStyle(name).getPropertyValue(NAME_RUNGS_PROPERTY).trim();
    if (!/^\d+$/.test(raw)) {
        return 0;
    }
    return Math.min(Number(raw), NAME_TIER_MAX);
}

/**
 * Choose each sign name's rung under `root`, after the tree is laid out. Run
 * before the marquees are measured: a rung can move the column the rows
 * stand beside. Test: `the-name-climbs-the-looks-ladder-until-it-fits`.
 */
export function applyNameTiers(root: ParentNode): void {
    for (const name of root.querySelectorAll<HTMLElement>('.stall-name')) {
        const rungs = nameRungs(name);
        if (rungs === 0) {
            // A try-on away from a look with a ladder leaves no rung behind.
            if (name.hasAttribute('data-name-tier')) {
                name.removeAttribute('data-name-tier');
            }
            continue;
        }
        name.removeAttribute('data-name-tier');
        for (let tier = 1; tier <= rungs && !fits(name); tier += 1) {
            name.setAttribute('data-name-tier', String(tier));
        }
    }
}
