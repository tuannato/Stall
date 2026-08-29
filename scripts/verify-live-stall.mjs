/**
 * Read one stall against live chronik and print what Stall would paint.
 *
 * Takes the seller on the command line. No address is hardcoded: a stall that
 * happens to be useful for testing today belongs to someone who did not
 * volunteer, and their inventory would rot into this file as a stale snapshot.
 *
 *   node --experimental-strip-types scripts/verify-live-stall.mjs <address|pubkey>
 */
import { ChronikClient } from 'chronik-client';
import { formatAtoms, formatXec } from '../src/domain/money.ts';
import { parseSellerParam } from '../src/domain/route.ts';
import { agoraOfferReader, loadOffers } from '../src/net/offers.ts';
import { loadTokenMeta } from '../src/net/tokens.ts';
import { resolveSeller } from '../src/net/resolve.ts';
import { CHRONIK_HOSTS } from '../src/net/hosts.ts';

const seller = process.argv[2];
if (!seller) {
    console.error('usage: verify-live-stall.mjs <ecash address or 66-hex pubkey>');
    process.exit(2);
}

async function probeHosts() {
    for (const host of CHRONIK_HOSTS) {
        const t0 = Date.now();
        try {
            const res = await fetch(`${host}/plugin/agora/00/utxos`, {
                signal: AbortSignal.timeout(8000),
            });
            console.log(`HOST ${host} status=${res.status} ${Date.now() - t0}ms`);
        } catch (err) {
            console.log(`HOST ${host} FAIL ${err instanceof Error ? err.message : err}`);
        }
    }
}

async function main() {
    console.log('=== host probe ===');
    await probeHosts();

    const chronik = new ChronikClient([...CHRONIK_HOSTS]);
    const route = await resolveSeller(parseSellerParam(seller), chronik);
    console.log('\n=== resolve ===', route.kind);
    if (route.kind !== 'pubkey') {
        console.log(route);
        throw new Error(`not resolvable to a pubkey: ${route.kind}`);
    }

    const fetched = await loadOffers(agoraOfferReader(chronik), route.pubkeyHex);
    console.log('\n=== fetch ===', fetched.kind);
    if (fetched.kind !== 'offers') {
        console.log(fetched);
        return;
    }
    if (fetched.dropped !== undefined) {
        // A listing the parser could not finish reading. Printed because this
        // script exists to see what a real group holds, and a silent drop here
        // is the defect the per-utxo read was written for.
        console.log(`(${fetched.dropped} listing(s) could not be read)`);
    }

    const metas = await loadTokenMeta(chronik, fetched.offers.map((o) => o.tokenId));
    const byId = new Map(metas.map((m) => [m.tokenId, m]));

    console.log(`\n=== ${fetched.offers.length} offers ===`);
    for (const offer of fetched.offers) {
        const meta = byId.get(offer.tokenId);
        const d = meta?.decimals ?? 0;
        const left = formatAtoms(offer.atoms, d);
        // "from" when the price buys less than the stock, as the list row says.
        const prefix = offer.askedAtoms < offer.atoms ? 'from ' : '';
        const unbuyable =
            offer.minAcceptedAtoms !== undefined && offer.minAcceptedAtoms > offer.atoms;
        console.log(
            [
                meta?.name || offer.tokenId,
                `left=${left}`,
                unbuyable ? 'NOT BUYABLE (min exceeds remaining)' : `pay=${prefix}${formatXec(offer.askedSats)}`,
                `buys=${formatAtoms(offer.askedAtoms, d)}`,
                offer.variant,
            ].join(' | '),
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
