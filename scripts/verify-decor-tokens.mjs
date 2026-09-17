/**
 * Read the shipped decoration catalogue against live chronik.
 *
 * A row's `tokenId` is pasted in by hand from a wallet after a mint, and the
 * table's own tests can only prove it is 64 hex and unique — every wrong id is
 * 64 hex too. This asks the chain what each one actually is: the genesis
 * exists, what it is called, how much was minted, and whether a mint baton is
 * still live (nothing on a screen may call a decoration scarce while one is).
 *
 * The table and the host list are read as TEXT, not imported: `src/domain`
 * uses extensionless specifiers that Node's type stripping will not resolve,
 * and a verification tool that needs a bundler is a tool nobody runs.
 *
 * Read-only, and network, so it is a command somebody runs on purpose rather
 * than part of `pnpm test`:
 *
 *   node scripts/verify-decor-tokens.mjs
 */
import { readFileSync } from 'node:fs';
import { ChronikClient } from 'chronik-client';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const hosts = [...read('../src/net/hosts.ts').matchAll(/'(https:\/\/chronik[^']+)'/g)].map((m) => m[1]);
const table = read('../src/domain/attachments.ts');
const rows = [...table.matchAll(/tokenId: '([0-9a-f]{64})',[\s\S]{0,400}?label: '([^']+)'/g)].map((m) => ({
    tokenId: m[1],
    label: m[2],
}));

console.log(`hosts: ${hosts.join(', ')}`);
console.log(`catalogue: ${rows.length} rows with a token\n`);
const chronik = new ChronikClient(hosts);
let bad = 0;
for (const row of rows) {
    try {
        const meta = await chronik.token(row.tokenId);
        const gi = meta.genesisInfo ?? {};
        const tx = await chronik.tx(row.tokenId);
        const batons = tx.outputs.filter((o) => o.token?.isMintBaton === true).length;
        const supply = tx.outputs
            .filter((o) => o.token?.isMintBaton === false && o.token?.atoms !== undefined)
            .reduce((a, o) => a + BigInt(o.token.atoms), 0n);
        console.log(
            `${row.label.padEnd(14)} "${gi.tokenName ?? '?'}" / ${gi.tokenTicker ?? '?'}  ` +
                `${meta.tokenType?.protocol ?? '?'} ${meta.tokenType?.type ?? ''}  ` +
                `decimals=${gi.decimals ?? '?'} supply=${supply} batons=${batons}` +
                `${gi.authPubkey ? ' auth=' + gi.authPubkey.slice(0, 10) + '…' : ''}`,
        );
    } catch (err) {
        bad += 1;
        console.log(`${row.label.padEnd(14)} READ FAILED ${row.tokenId}: ${err instanceof Error ? err.message : err}`);
    }
}
console.log(bad === 0 ? '\nevery row read back' : `\n${bad} row(s) need a look`);
