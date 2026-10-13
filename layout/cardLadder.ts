/**
 * The card ladder's last step per figure, as stall.css's phone floor paints
 * it (`.face-x:where([data-price-tier='3']) .x`, `.pay-x:where(…) .pay-x-n`,
 * `.row.big:where(…) dd`): the probe's `a-card-figure-steps-down-on-every-look`
 * asks no smaller step of a figure whose tier 0 is at or under it. Its own
 * module so a test can hold it to the sheet (round 4, the critic's P3-2:
 * a second copy of stall.css's numbers, tied to nothing — lower the floor
 * and the probe's exemption still sat at 18). Test:
 * `the-ladders-last-step-is-the-sheets-floor`.
 */
export const CARD_LADDER_LAST_STEP: Readonly<Record<string, number>> = {
    'face:price': 18,
    'face:seller-price': 18,
    'paid:figure': 15,
    'pay:price': 18,
};
