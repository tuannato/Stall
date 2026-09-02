/**
 * Canvas PNG export for the poster sheet. Own file because `render.ts`
 * loads token-icon bitmaps; this path must never load one.
 *
 * Plate from `--s-surface` / `--s-text`. QR from `qrMatrix` as fillRect
 * modules, black on white, with a 4-module quiet zone. Download is
 * `canvas.toBlob` plus an `<a download>` with a blob: href.
 */
import { BROADCAST_BRAND, BROADCAST_CAPTION, POSTER_SCAN } from './copy';

export const QR_QUIET_ZONE = 4;

export const SQUARE_SIZE = { width: 1080, height: 1080 } as const;
export const STORY_SIZE = { width: 1080, height: 1920 } as const;
/** Overlay plate is 252px; the stream card is that rest state at 2×. */
export const STREAM_CARD_WIDTH = 504;

export type PosterKind = 'square' | 'story' | 'stream';

export type PosterPaint = {
    surface: string;
    text: string;
    muted: string;
    accent: string;
    font: string;
    name: string;
    tagline?: string;
    url: string;
    matrix: boolean[][];
    nameLines: 2 | 3;
};

export type PosterSpec = {
    kind: PosterKind;
    width: number;
    height: number;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    font: string;
    name: string;
    tagline?: string;
    brand?: string;
    caption: string;
    url?: string;
    matrix: boolean[][];
    nameLines: 2 | 3;
};

export type QrModuleRect = {
    x: number;
    y: number;
    size: number;
};

/**
 * Wrap `text` to `maxWidth` with `overflow-wrap: anywhere` semantics:
 * break at whitespace when a word fits a line; break inside a word that
 * alone exceeds the width. `maxLines` is the CSS clamp (2, 3 on Neo).
 */
export function wrapLines(
    text: string,
    maxWidth: number,
    measure: (s: string) => number,
    maxLines?: number,
): string[] {
    const parts = text.split(/\s+/).filter((w) => w.length > 0);
    if (parts.length === 0) {
        return [''];
    }
    const lines: string[] = [];
    let current = '';

    const takeFit = (word: string): { head: string; rest: string } => {
        if (word.length <= 1) {
            return { head: word, rest: '' };
        }
        let i = 1;
        while (i < word.length && measure(word.slice(0, i + 1)) <= maxWidth) {
            i += 1;
        }
        return { head: word.slice(0, i), rest: word.slice(i) };
    };

    const breakLong = (word: string): void => {
        let rest = word;
        while (rest.length > 0) {
            if (measure(rest) <= maxWidth) {
                current = rest;
                return;
            }
            const { head, rest: more } = takeFit(rest);
            if (head.length === 0) {
                return;
            }
            lines.push(head);
            rest = more;
            current = '';
        }
    };

    for (const word of parts) {
        if (current.length === 0) {
            if (measure(word) <= maxWidth) {
                current = word;
            } else {
                breakLong(word);
            }
            continue;
        }
        const candidate = `${current} ${word}`;
        if (measure(candidate) <= maxWidth) {
            current = candidate;
            continue;
        }
        lines.push(current);
        current = '';
        if (measure(word) <= maxWidth) {
            current = word;
        } else {
            breakLong(word);
        }
    }
    if (current.length > 0) {
        lines.push(current);
    }
    if (maxLines !== undefined && maxLines > 0 && lines.length > maxLines) {
        return lines.slice(0, maxLines);
    }
    return lines.length > 0 ? lines : [''];
}

/** Module rects in the QR box, origin at the box's top-left (quiet zone included). */
export function qrModuleRects(
    matrix: ReadonlyArray<ReadonlyArray<boolean>>,
    modulePx: number,
): QrModuleRect[] {
    const out: QrModuleRect[] = [];
    for (let r = 0; r < matrix.length; r += 1) {
        const row = matrix[r];
        if (row === undefined) {
            continue;
        }
        for (let c = 0; c < row.length; c += 1) {
            if (row[c] === true) {
                out.push({
                    x: (c + QR_QUIET_ZONE) * modulePx,
                    y: (r + QR_QUIET_ZONE) * modulePx,
                    size: modulePx,
                });
            }
        }
    }
    return out;
}

function streamCardHeight(nameLines: 2 | 3): number {
    const pad = 36;
    const brand = 53;
    const brandGap = 12;
    const nameLine = Math.ceil(58 * 1.15);
    const afterName = 36;
    const plateGap = 24;
    const qr = 408;
    const capGap = 18;
    const cap = 53;
    const bottom = 30;
    return (
        pad +
        brand +
        brandGap +
        nameLine * nameLines +
        afterName +
        plateGap +
        qr +
        capGap +
        cap +
        bottom
    );
}

export function posterSpec(kind: PosterKind, paint: PosterPaint): PosterSpec {
    const shared = {
        surface: paint.surface,
        text: paint.text,
        muted: paint.muted,
        accent: paint.accent,
        font: paint.font,
        name: paint.name,
        matrix: paint.matrix,
        nameLines: paint.nameLines,
    };
    if (kind === 'stream') {
        return {
            kind,
            width: STREAM_CARD_WIDTH,
            height: streamCardHeight(paint.nameLines),
            ...shared,
            brand: BROADCAST_BRAND,
            caption: BROADCAST_CAPTION,
        };
    }
    const size = kind === 'square' ? SQUARE_SIZE : STORY_SIZE;
    return {
        kind,
        width: size.width,
        height: size.height,
        ...shared,
        tagline: paint.tagline,
        caption: POSTER_SCAN,
        url: paint.url,
    };
}

function qrFit(
    matrix: ReadonlyArray<ReadonlyArray<boolean>>,
    target: number,
): { box: number; modulePx: number } {
    const modules = matrix.length + QR_QUIET_ZONE * 2;
    const modulePx = Math.max(1, Math.floor(target / Math.max(modules, 1)));
    return { box: modulePx * modules, modulePx };
}

function paintQr(
    ctx: CanvasRenderingContext2D,
    matrix: boolean[][],
    x: number,
    y: number,
    modulePx: number,
): void {
    const box = (matrix.length + QR_QUIET_ZONE * 2) * modulePx;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, box, box);
    ctx.fillStyle = '#000000';
    for (const rect of qrModuleRects(matrix, modulePx)) {
        ctx.fillRect(x + rect.x, y + rect.y, rect.size, rect.size);
    }
}

function paintStream(ctx: CanvasRenderingContext2D, spec: PosterSpec): void {
    const pad = 36;
    let y = pad;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (spec.brand !== undefined) {
        ctx.fillStyle = spec.accent;
        ctx.font = `700 44px ${spec.font}`;
        ctx.fillText(spec.brand, pad, y);
        y += 53 + 12;
    }
    ctx.fillStyle = spec.text;
    ctx.font = `800 58px ${spec.font}`;
    const nameWidth = spec.width - pad * 2;
    const measure = (s: string): number => ctx.measureText(s).width;
    const lines = wrapLines(spec.name, nameWidth, measure, spec.nameLines);
    const lineH = 58 * 1.15;
    for (const line of lines) {
        ctx.fillText(line, pad, y);
        y += lineH;
    }
    y += 36 + 24;
    const qrTarget = 408;
    const { box, modulePx } = qrFit(spec.matrix, qrTarget);
    const qrX = Math.floor((spec.width - box) / 2);
    paintQr(ctx, spec.matrix, qrX, y, modulePx);
    y += box + 18;
    ctx.fillStyle = spec.muted;
    ctx.font = `700 44px ${spec.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(spec.caption, spec.width / 2, y);
}

function paintSheet(ctx: CanvasRenderingContext2D, spec: PosterSpec): void {
    const padX = Math.round(spec.width * 0.08);
    const padY = Math.round(spec.height * 0.08);
    const cx = spec.width / 2;
    const maxText = spec.width - padX * 2;
    const measure = (s: string): number => ctx.measureText(s).width;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let y = padY;
    const nameSize = spec.kind === 'story' ? 72 : 64;
    ctx.fillStyle = spec.text;
    ctx.font = `700 ${nameSize}px ${spec.font}`;
    for (const line of wrapLines(spec.name, maxText, measure, spec.nameLines)) {
        ctx.fillText(line, cx, y);
        y += nameSize * 1.15;
    }
    if (spec.tagline !== undefined && spec.tagline !== '') {
        y += 16;
        ctx.fillStyle = spec.muted;
        ctx.font = `400 28px ${spec.font}`;
        for (const line of wrapLines(spec.tagline, maxText, measure)) {
            ctx.fillText(line, cx, y);
            y += 34;
        }
    }
    const captionSize = 28;
    const urlSize = 22;
    const urlBlock = spec.url !== undefined ? urlSize * 2.4 + 16 : 0;
    const bottomBlock = captionSize + 12 + urlBlock + padY;
    const qrTop = y + 24;
    const qrAvail = Math.max(0, spec.height - bottomBlock - qrTop);
    const qrTarget = Math.min(spec.width - padX * 2, qrAvail);
    const { box, modulePx } = qrFit(spec.matrix, qrTarget);
    const qrX = Math.floor((spec.width - box) / 2);
    const qrY = qrTop + Math.max(0, Math.floor((qrAvail - box) / 2));
    paintQr(ctx, spec.matrix, qrX, qrY, modulePx);
    let by = spec.height - padY - urlBlock - captionSize;
    ctx.fillStyle = spec.text;
    ctx.font = `650 ${captionSize}px ${spec.font}`;
    ctx.fillText(spec.caption, cx, by);
    if (spec.url !== undefined) {
        by += captionSize + 12;
        ctx.fillStyle = spec.muted;
        ctx.font = `400 ${urlSize}px ${spec.font}`;
        for (const line of wrapLines(spec.url, maxText, measure, 2)) {
            ctx.fillText(line, cx, by);
            by += urlSize * 1.2;
        }
    }
}

export function drawPoster(canvas: HTMLCanvasElement, spec: PosterSpec): void {
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
        return;
    }
    ctx.fillStyle = spec.surface;
    ctx.fillRect(0, 0, spec.width, spec.height);
    if (spec.kind === 'stream') {
        paintStream(ctx, spec);
        return;
    }
    paintSheet(ctx, spec);
}

export function savePng(canvas: HTMLCanvasElement, filename: string): void {
    canvas.toBlob((blob) => {
        if (blob === null) {
            return;
        }
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = filename;
        a.rel = 'noopener';
        a.href = href;
        // In the document for the click, and the URL revoked on a later
        // tick: a detached anchor and an immediate revoke are the two ways
        // a browser (Firefox first) abandons the download before it starts.
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
    }, 'image/png');
}
