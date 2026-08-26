import { describe, expect, it } from 'vitest';
import { decodeManifestPushes, encodeManifestHex } from './domain/manifest';
import { cashtabPublishUrl } from './domain/cashtab';
import { opReturnPushes } from './net/script';

/**
 * The encoder and the shipped reader must agree, and neither test file can see
 * both: `src/domain/` may not import `src/net/`. This lives at the root, which
 * is the only place allowed to hold them together.
 */
describe('published-record-is-readable-by-this-app', () => {
    const ADDRESS = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';

    for (const [name, themeId] of [
        ["Nato's Corner", 0x01],
        ['Trà Mai', 0x02],
        ['x', 0x03],
        ['a'.repeat(32), 0xfe],
    ] as const) {
        it(`round-trips ${JSON.stringify(name)} at 0x${themeId.toString(16)}`, () => {
            const hex = encodeManifestHex(name, themeId);
            expect(hex).toBeDefined();
            // Cashtab prepends OP_RETURN; the reader expects it present.
            const pushes = opReturnPushes(`6a${hex!}`);
            expect(pushes, 'our own parser rejected our own payload').toBeDefined();
            const decoded = decodeManifestPushes(pushes!);
            expect(decoded.name).toBe(name);
            expect(decoded.theme.id).toBe(themeId);
        });
    }

    it('fits the BIP21 the seller is handed', () => {
        const hex = encodeManifestHex('a'.repeat(32), 0x01)!;
        const url = cashtabPublishUrl(ADDRESS, hex);
        expect(url).toBeDefined();
        expect(url).toContain(`op_return_raw=${hex}`);
        // 222 is Cashtab's ceiling for the decoded payload.
        expect(hex.length / 2).toBeLessThanOrEqual(222);
    });
});
