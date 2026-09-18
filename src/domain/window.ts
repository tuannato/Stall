import type { StallOffer } from './state';

/**
 * The shop window's freeze, as arithmetic.
 *
 * What it defends against is CLAUDE.md §10: `AgoraPartial.parse_redeem_script`
 * in the indexing plugin takes the first push and parses it **asserting no
 * opcode**, so a PARTIAL covenant lands in any `P + pubkey` group with no key
 * of that pubkey. The covenant still pays `hash160(maker_pk)` — the money goes
 * to the seller — so this is graffiti and never theft: a stranger hangs their
 * token in somebody else's shop. On a phone that is one junk row. On a screen
 * in a shop it is a stranger's artwork at 400px, all afternoon.
 *
 * Quotes are not in this module and never will be: `recordIsStalls` demands
 * the stall's own input signature **and** a 546-sat output back to itself, so
 * nobody can plant one. A freeze over the quotes rail would be a control with
 * nothing to do.
 */

/**
 * Every token this stall was already offering at `upto`.
 *
 * Membership by **token id**, not by height, and the difference is the whole
 * design. A partial fill spends the offer and re-creates the remainder as a
 * new utxo in a later block (§3), so `blockHeight` jumps forward the moment a
 * lot is partly sold. A screen that compared heights would take an item down
 * as a reward for selling some of it; a screen that remembers the token keeps
 * showing it, which is what a shopkeeper means by "these are today's goods".
 *
 * An offer whose height the node never gave is **kept**: the freeze exists to
 * refuse a stranger's arrival, and refusing on a missing field would blank a
 * seller's own shelf over a node that answered thinly.
 */
export function tokensAtBlock(offers: readonly StallOffer[], upto: number): Set<string> {
    const ids = new Set<string>();
    for (const offer of offers) {
        if (offer.blockHeight === undefined || offer.blockHeight <= upto) {
            ids.add(offer.tokenId);
        }
    }
    return ids;
}

/**
 * The offers a frozen screen paints.
 *
 * `remembered` is the set this screen captured the first time it opened on
 * this lock, carried across a reload in storage. It is a union with a fresh
 * height test rather than a replacement for it, so the first load — which has
 * nothing remembered — works from the heights alone.
 *
 * **The cost, stated:** on a machine with no memory of this lock (a cleared
 * browser, a second screen, a different computer) an item that has been
 * partly sold since the freeze has only a post-lock utxo left, so it is
 * dropped. That errs toward showing fewer of the seller's own goods and never
 * toward showing a stranger's, which is the direction a shopfront should fail
 * in. A republish of the lock at a newer height brings it back.
 */
export function offersWithinLock(
    offers: readonly StallOffer[],
    upto: number | undefined,
    remembered?: ReadonlySet<string>,
): readonly StallOffer[] {
    if (upto === undefined) {
        return offers;
    }
    return offers.filter(
        (offer) =>
            offer.blockHeight === undefined ||
            offer.blockHeight <= upto ||
            remembered?.has(offer.tokenId) === true,
    );
}

/**
 * The height a sheet suggests when a seller first reaches for the freeze: the
 * next block.
 *
 * The next one and not this one, because the seller may be listing the last
 * item as they set the screen up, and a lock at the current tip would leave it
 * off. It is a **suggestion** — the field is editable, and a seller who wants
 * an older shelf types the height they want (owner, 2026-09-18).
 */
export function suggestedLock(tipHeight: number): number {
    return tipHeight + 1;
}

/** Where the carousel goes next, and which rail it lands on. */
export type WindowStep = {
    cursor: number;
    rail: 'listings' | 'quotes';
};

/**
 * One card on, and at the end of the list the rail turns over.
 *
 * The turn is **folded into the wrap** rather than given a clock of its own,
 * and that is the whole point: two timers is how a cursor comes to point into
 * the list it is not on. `show=all` rotates between the rails and never merges
 * them — a covenant's asked amount beside a seller's own quote is what
 * `the-two-rails-never-paint-on-one-screen` forbids, and a shop screen has no
 * tab to press to ask which figure is which.
 *
 * An empty list rests at zero and turns anyway when the screen is showing
 * both: a rail with nothing on it must not trap the screen on itself.
 */
export function nextCard(
    cursor: number,
    length: number,
    show: 'listings' | 'quotes' | 'all',
    rail: 'listings' | 'quotes',
): WindowStep {
    const next = length === 0 ? 0 : (cursor + 1) % length;
    const wrapped = next === 0;
    if (!wrapped || show !== 'all') {
        return { cursor: next, rail };
    }
    return { cursor: 0, rail: rail === 'listings' ? 'quotes' : 'listings' };
}
