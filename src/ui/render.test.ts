// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { BANNED_THEME_PROPS } from '../domain/theme';
import type { Outpoint, StallOffer, StallView, TokenMeta } from '../domain/state';
import {
    BUY_FINE_PRINT,
    BUY_WITH_STALL,
    DASHED_PRICE,
    EMPTY_TITLE,
    LINK_UNREADABLE_TITLE,
    STAGE1_BUY_NOTE,
    TRY_AGAIN,
    UNREACHABLE_BODY,
    UNRESOLVABLE_TITLE,
} from './copy';
import { renderStall } from './render';

const PK =
    '03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ADDR = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';
const TOKEN_ID = 'cd'.repeat(32);
const OUTPOINT: Outpoint = { txid: 'ab'.repeat(32), outIdx: 0 };

const BEANS: TokenMeta = {
    tokenId: TOKEN_ID,
    name: 'Roasted Beans',
    ticker: 'BEAN',
    decimals: 0,
};

const OFFER: StallOffer = {
    outpoint: OUTPOINT,
    tokenId: TOKEN_ID,
    atoms: 12n,
    variant: 'PARTIAL',
    askedSats: 1200n * 100n,
    askedAtoms: 1n,
};

function handlers() {
    return {
        onBuy: vi.fn(),
        onRetry: vi.fn(),
        onCloseSheet: vi.fn(),
    };
}

function paint(view: StallView) {
    const root = document.createElement('div');
    const h = handlers();
    renderStall(root, view, h);
    return { root, h };
}

function idlePubkey(over: Partial<StallView> = {}): StallView {
    return {
        route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
        address: ADDR,
        ...over,
    };
}

describe('empty vs unreachable', () => {
    it('empty has "This stall is empty" and no unreachable copy', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                stallName: "Nato's Corner",
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(TRY_AGAIN);
        expect(root.querySelector('button.buy')).toBeNull();
        expect(h.onRetry).not.toHaveBeenCalled();
    });

    it('unreachable has "We can\'t read prices" and must not contain "This stall is empty"', () => {
        const { root } = paint(
            idlePubkey({
                fetch: {
                    kind: 'unreachable',
                    triedAtMs: 0,
                    hosts: [{ host: 'chronik-native1.fabien.cash', result: 'timeout' }],
                },
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain('chronik-native1.fabien.cash');
        expect(text).toContain(TRY_AGAIN);
        expect(root.querySelector('button.buy')).toBeNull();
    });

    it('later-visit unreachable keeps cached names, dashed prices, and a disabled buy', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: {
                    kind: 'unreachable',
                    triedAtMs: Date.UTC(2026, 0, 1, 17, 42, 6),
                    hosts: [{ host: 'chronik-native2.fabien.cash', result: 'timeout' }],
                },
                stallName: "Nato's Corner",
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain("Nato's Corner");
        expect(text).toContain('Roasted Beans');
        expect(text).toContain(DASHED_PRICE);
        const buy = root.querySelector('.stall button.buy') as HTMLButtonElement | null;
        expect(buy).not.toBeNull();
        expect(buy!.disabled).toBe(true);
        buy!.click();
        expect(h.onBuy).not.toHaveBeenCalled();
        const retry = root.querySelector('button.mini') as HTMLButtonElement;
        retry.click();
        expect(h.onRetry).toHaveBeenCalledTimes(1);
    });
});

describe('plugin-missing-is-not-empty', () => {
    it('plugin-missing uses unreachable copy, not empty', () => {
        const { root } = paint(
            idlePubkey({
                fetch: {
                    kind: 'plugin-missing',
                    triedAtMs: 1,
                    hosts: [
                        {
                            host: 'chronik.e.cash',
                            result: 'plugin-missing',
                        },
                    ],
                },
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain('plugin-missing');
        expect(root.querySelector('button.buy')).toBeNull();
    });
});

describe('invalid is not empty', () => {
    it('says the link is unreadable and shows the raw param', () => {
        const raw = 'not-a-seller';
        const { root } = paint({
            route: { kind: 'invalid', raw },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(LINK_UNREADABLE_TITLE);
        expect(text).toContain(raw);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(root.querySelector('button.buy')).toBeNull();
    });
});

describe('unresolvable', () => {
    it('has "Nothing to read from this address"', () => {
        const { root } = paint({
            route: { kind: 'unresolvable', address: ADDR },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(UNRESOLVABLE_TITLE);
        expect(text).toContain(ADDR);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(root.querySelector('button.buy')).toBeNull();
    });
});

describe('unresolved address is unreachable not unresolvable', () => {
    it('paints our failure, not never-spent', () => {
        const { root } = paint({
            route: { kind: 'unresolved', address: ADDR },
            fetch: {
                kind: 'unreachable',
                triedAtMs: 1,
                hosts: [{ host: 'chronik-native1.fabien.cash', result: 'timeout' }],
            },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(UNRESOLVABLE_TITLE);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain(ADDR);
        expect(text).toContain(TRY_AGAIN);
    });
});

describe('asked-amount-not-covered', () => {
    it('theme vars never set banned properties; price and buy live in the stall', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                stallName: "Nato's Corner",
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement | null;
        expect(stall).not.toBeNull();
        for (const banned of BANNED_THEME_PROPS) {
            expect(stall!.style.getPropertyValue(banned)).toBe('');
            expect(stall!.style.cssText).not.toContain(banned);
        }
        const price = stall!.querySelector('[data-role="price"], .item-x');
        const buy = stall!.querySelector('button.buy');
        expect(price).not.toBeNull();
        expect(price!.textContent).toBe('1,200');
        expect(buy).not.toBeNull();
        expect(buy!.textContent).toBe(BUY_WITH_STALL);
        expect(stall!.contains(price!)).toBe(true);
        expect(stall!.contains(buy!)).toBe(true);
        expect((buy as HTMLButtonElement).disabled).toBe(false);

        (buy as HTMLButtonElement).click();
        expect(h.onBuy).toHaveBeenCalledWith(OUTPOINT);
    });
});

describe('buy sheet', () => {
    it('paints encoded amounts and does not sign on the Stage 1 CTA', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                stallName: "Nato's Corner",
                tokens: new Map([[TOKEN_ID, BEANS]]),
                cheaperCount: 3,
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain('1,200 XEC');
        expect(text).toContain('1 of 12');
        expect(text).toContain('~5 XEC');
        expect(text).toContain(
            '3 offers for this token are cheaper. This price is the seller\'s.',
        );
        expect(text).toContain(BUY_FINE_PRINT);

        h.onBuy.mockClear();
        const cta = root.querySelector('.sheet button.buy') as HTMLButtonElement;
        expect(cta).not.toBeNull();
        cta.click();
        expect(h.onBuy).not.toHaveBeenCalled();
        expect(h.onCloseSheet).not.toHaveBeenCalled();
        expect(root.querySelector('.sheet')).not.toBeNull();
        expect(root.textContent).toContain(STAGE1_BUY_NOTE);

        const backdrop = root.querySelector('.sheet') as HTMLElement;
        backdrop.click();
        expect(h.onCloseSheet).toHaveBeenCalledTimes(1);
    });
});
