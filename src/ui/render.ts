import { formatAtoms, formatXec } from '../domain/money';
import type {
    FetchStatus,
    HostAttempt,
    Outpoint,
    StallOffer,
    StallView,
    TokenMeta,
} from '../domain/state';
import {
    DEFAULT_THEME,
    LAYOUT_CLASSES,
    clampIndex,
    themeVars,
    type DecodedTheme,
} from '../domain/theme';
import * as copy from './copy';
import './stall.css';

export type StallHandlers = {
    onBuy: (outpoint: Outpoint) => void;
    onRetry: () => void;
    onCloseSheet: () => void;
};

export function renderStall(
    root: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    root.replaceChildren();
    const frame = el('div', 'frame');
    const stall = el('div', 'stall');
    applyTheme(stall, view.theme ?? DEFAULT_THEME);

    switch (view.route.kind) {
        case 'invalid':
            paintInvalid(stall, view.route.raw);
            break;
        case 'unresolvable':
            paintUnresolvable(stall, view.route.address);
            break;
        case 'unresolved':
            paintUnresolved(stall, view, handlers);
            break;
        case 'pubkey':
            paintPubkey(stall, view, handlers);
            break;
    }

    frame.append(stall);
    root.append(frame);
}

function applyTheme(stall: HTMLElement, theme: DecodedTheme): void {
    const vars = themeVars(theme);
    for (const [name, value] of Object.entries(vars)) {
        stall.style.setProperty(name, value);
    }
    const layout =
        LAYOUT_CLASSES[clampIndex(theme.layoutIndex, LAYOUT_CLASSES.length)] ??
        LAYOUT_CLASSES[0];
    stall.classList.add(layout!);
}

function paintInvalid(stall: HTMLElement, raw: string): void {
    stall.append(header(copy.LINK_UNREADABLE_TITLE));
    const body = el('div', 'stall-body');
    body.append(el('p', 'mid-p', raw));
    stall.append(body);
}

function paintUnresolvable(stall: HTMLElement, address: string): void {
    stall.append(header(copy.UNRESOLVABLE_HEADER, copy.UNRESOLVABLE_SUB));
    const body = el('div', 'stall-body');
    body.append(
        mid(copy.UNRESOLVABLE_TITLE, [copy.UNRESOLVABLE_BODY, copy.UNRESOLVABLE_HINT]),
    );
    stall.append(body);
    stall.append(footer(address));
}

function paintUnresolved(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    const fetch = view.fetch;
    if (fetch && (fetch.kind === 'unreachable' || fetch.kind === 'plugin-missing')) {
        paintUnreachable(stall, view, fetch, handlers);
        return;
    }
    paintUnreachable(stall, view, unreachableFallback(), handlers);
}

function unreachableFallback(): Extract<FetchStatus, { kind: 'unreachable' }> {
    return { kind: 'unreachable', triedAtMs: Date.now(), hosts: [] };
}

function paintPubkey(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    const fetch = view.fetch;
    if (!fetch) {
        stall.append(header(view.stallName, undefined));
        stall.append(footer(identityOf(view)));
        return;
    }
    switch (fetch.kind) {
        case 'empty':
            paintEmpty(stall, view);
            break;
        case 'unreachable':
        case 'plugin-missing':
            paintUnreachable(stall, view, fetch, handlers);
            break;
        case 'offers':
            paintOffers(stall, view, fetch.offers, handlers);
            break;
    }
}

function paintEmpty(stall: HTMLElement, view: StallView): void {
    stall.append(header(view.stallName, copy.EMPTY_SUB));
    const body = el('div', 'stall-body');
    body.append(mid(copy.EMPTY_TITLE, [copy.EMPTY_BODY]));
    stall.append(body);
    stall.append(footer(identityOf(view)));
}

function paintUnreachable(
    stall: HTMLElement,
    view: StallView,
    fetch: Extract<FetchStatus, { kind: 'unreachable' | 'plugin-missing' }>,
    handlers: StallHandlers,
): void {
    const identity = identityOf(view);
    const cached = hasCachedShop(view);
    if (cached) {
        stall.append(header(view.stallName, copy.UNREACHABLE_SUB));
    } else {
        stall.append(header(identity));
    }

    const body = el('div', 'stall-body');
    if (cached) {
        if (view.tokens.size > 0) {
            for (const meta of view.tokens.values()) {
                body.append(skeletonRow(meta.name || meta.ticker || meta.tokenId));
            }
        } else {
            body.append(skeletonRow());
            body.append(skeletonRow());
        }
    }
    body.append(el('p', 'mid-p', copy.UNREACHABLE_BODY));
    body.append(hostsBox(fetch.triedAtMs, fetch.hosts));
    const retry = el('button', 'mini', copy.TRY_AGAIN);
    retry.type = 'button';
    retry.addEventListener('click', () => {
        handlers.onRetry();
    });
    body.append(retry);
    stall.append(body);

    if (cached) {
        stall.append(footer(identity, { enabled: false }));
    } else if (identity !== undefined) {
        stall.append(footer(identity));
    }
}

function paintOffers(
    stall: HTMLElement,
    view: StallView,
    offers: StallOffer[],
    handlers: StallHandlers,
): void {
    stall.append(header(view.stallName ?? identityOf(view), copy.itemsForSale(offers.length)));
    const body = el('div', 'stall-body');
    const items = el('div', 'items');
    for (const offer of offers) {
        items.append(offerRow(offer, view, handlers));
    }
    body.append(items);
    stall.append(body);

    const first = offers[0];
    stall.append(
        footer(
            identityOf(view),
            first
                ? {
                      enabled: true,
                      onClick: () => {
                          handlers.onBuy(first.outpoint);
                      },
                  }
                : undefined,
        ),
    );

    if (view.overlay.kind === 'buy') {
        const selected = findOffer(offers, view.overlay.outpoint);
        if (selected) {
            stall.append(buySheet(view, selected, handlers));
        }
    }
}

function offerRow(
    offer: StallOffer,
    view: StallView,
    handlers: StallHandlers,
): HTMLButtonElement {
    const row = el('button', 'item');
    row.type = 'button';
    const name = tokenName(view.tokens, offer.tokenId);
    const d = decimalsOf(view.tokens, offer.tokenId);
    row.append(el('div', 'item-ic', initials(name)));
    const info = el('div', 'item-b');
    info.append(el('div', 'item-n', name));
    info.append(el('div', 'item-q', copy.remainingAtoms(formatAtoms(offer.atoms, d))));
    row.append(info);
    const price = el('div', 'item-p');
    const asked = el('div', 'item-x', formatXec(offer.askedSats));
    asked.setAttribute('data-role', 'price');
    price.append(asked);
    price.append(el('div', 'item-u', copy.XEC));
    row.append(price);
    row.addEventListener('click', () => {
        handlers.onBuy(offer.outpoint);
    });
    return row;
}

function buySheet(
    view: StallView,
    offer: StallOffer,
    handlers: StallHandlers,
): HTMLElement {
    const sheet = el('div', 'sheet');
    sheet.addEventListener('click', () => {
        handlers.onCloseSheet();
    });
    const card = el('div', 'sheet-c');
    card.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    const d = decimalsOf(view.tokens, offer.tokenId);
    card.append(el('div', 'sheet-t', tokenName(view.tokens, offer.tokenId)));
    card.append(sheetRow(copy.YOU_PAY, copy.payAmount(formatXec(offer.askedSats)), true));
    card.append(
        sheetRow(
            copy.YOU_RECEIVE,
            copy.youReceiveAmount(
                formatAtoms(offer.askedAtoms, d),
                formatAtoms(offer.atoms, d),
            ),
        ),
    );
    card.append(sheetRow(copy.NETWORK_FEE, copy.NETWORK_FEE_PLACEHOLDER));

    if (view.cheaperCount !== undefined && view.cheaperCount > 0) {
        card.append(el('div', 'ctx', copy.cheaperOffersLine(view.cheaperCount)));
    }

    const cta = el('button', 'buy', copy.BUY_WITH_STALL);
    cta.type = 'button';
    cta.addEventListener('click', () => {
        if (card.querySelector('.stage1-note')) {
            return;
        }
        const note = el('p', 'fine stage1-note', copy.STAGE1_BUY_NOTE);
        card.append(note);
    });
    card.append(cta);
    card.append(el('p', 'fine', copy.BUY_FINE_PRINT));
    sheet.append(card);
    return sheet;
}

function sheetRow(label: string, value: string, big = false): HTMLElement {
    const row = el('dl', big ? 'row big' : 'row');
    row.append(el('dt', undefined, label));
    row.append(el('dd', undefined, value));
    return row;
}

function header(name?: string, sub?: string): HTMLElement {
    const hd = el('header', 'stall-head');
    if (name !== undefined && name !== '') {
        hd.append(el('div', 'stall-name', name));
    }
    if (sub !== undefined && sub !== '') {
        hd.append(el('div', 'stall-sub', sub));
    }
    return hd;
}

function footer(
    address: string | undefined,
    buy?: { enabled: boolean; onClick?: () => void },
): HTMLElement {
    const ft = el('footer', 'stall-foot');
    if (address !== undefined && address !== '') {
        ft.append(el('div', 'addr', address));
    }
    if (buy) {
        const btn = el('button', 'buy', copy.BUY_WITH_STALL);
        btn.type = 'button';
        if (!buy.enabled) {
            btn.disabled = true;
        } else if (buy.onClick) {
            btn.addEventListener('click', buy.onClick);
        }
        ft.append(btn);
    }
    return ft;
}

function mid(title: string, paragraphs: string[]): HTMLElement {
    const wrap = el('div', 'mid');
    wrap.append(el('div', 'mid-t', title));
    for (const p of paragraphs) {
        wrap.append(el('p', 'mid-p', p));
    }
    return wrap;
}

function skeletonRow(name?: string): HTMLElement {
    const row = el('div', 'sk');
    row.append(el('div', 'sk-ic'));
    const info = el('div');
    if (name !== undefined && name !== '') {
        info.append(el('div', 'item-n', name));
    } else {
        info.append(el('div', 'sk-n'));
        info.append(el('div', 'sk-q'));
    }
    row.append(info);
    row.append(el('div', 'dash', copy.DASHED_PRICE));
    return row;
}

function hostsBox(triedAtMs: number, hosts: HostAttempt[]): HTMLElement {
    const box = el('div', 'hosts');
    const line = el('div');
    line.append(document.createTextNode(`${copy.TRIED} `));
    line.append(el('span', 'hosts-time', formatTriedAt(triedAtMs)));
    box.append(line);
    for (const host of hosts) {
        box.append(el('div', undefined, `${host.host} · ${host.result}`));
    }
    return box;
}

function identityOf(view: StallView): string | undefined {
    if (view.address !== undefined && view.address !== '') {
        return view.address;
    }
    switch (view.route.kind) {
        case 'invalid':
            return view.route.raw;
        case 'unresolvable':
            return view.route.address;
        case 'unresolved':
            return view.route.address;
        case 'pubkey':
            return view.route.address ?? view.route.pubkeyHex;
    }
}

function hasCachedShop(view: StallView): boolean {
    return Boolean(view.stallName) || view.tokens.size > 0;
}

function tokenMeta(
    tokens: StallView['tokens'],
    tokenId: string,
): TokenMeta | undefined {
    return tokens.get(tokenId);
}

function tokenName(tokens: StallView['tokens'], tokenId: string): string {
    const meta = tokenMeta(tokens, tokenId);
    if (!meta) {
        return tokenId;
    }
    if (meta.name !== '') {
        return meta.name;
    }
    if (meta.ticker !== '') {
        return meta.ticker;
    }
    return tokenId;
}

function decimalsOf(tokens: StallView['tokens'], tokenId: string): number {
    return tokenMeta(tokens, tokenId)?.decimals ?? 0;
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function findOffer(offers: StallOffer[], outpoint: Outpoint): StallOffer | undefined {
    return offers.find(
        (o) => o.outpoint.txid === outpoint.txid && o.outpoint.outIdx === outpoint.outIdx,
    );
}

function formatTriedAt(ms: number): string {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className !== undefined && className !== '') {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}
