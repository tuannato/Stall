/**
 * Canvas PNG export for the poster sheet. Own file because `render.ts`
 * loads token-icon bitmaps; this path must never load one.
 *
 * The ground is `--s-bg` on a sheet and `--s-surface` on the stream card,
 * because a card is a plate laid on a stream and a sheet is the stall's own
 * page. QR from `qrMatrix` as fillRect modules, black on white, with a
 * 4-module quiet zone. Download is `canvas.toBlob` plus an `<a download>`
 * with a blob: href.
 *
 * A canvas takes numbers, never CSS: everything the look contributes arrives
 * here already resolved — a colour string, a radius in pixels, a case — so no
 * shorthand and no unit parsing happens on the paint path.
 */
import { BROADCAST_BRAND, BROADCAST_CAPTION, POSTER_SCAN } from './copy';

export const QR_QUIET_ZONE = 4;

export const SQUARE_SIZE = { width: 1080, height: 1080 } as const;
export const STORY_SIZE = { width: 1080, height: 1920 } as const;
/**
 * Overlay plate is 252px; the stream card's width is that plate at 2×.
 * Height is the PNG's own layout (brand, name lines, QR 232) and follows
 * `nameLines` alone — see `streamCardHeight`.
 */
export const STREAM_CARD_WIDTH = 504;

/**
 * The link line's face. Its own stack, not the look's: a cashaddr is read
 * character by character off a printed sheet, and a proportional face makes
 * `1`, `l` and `I` one glyph. Matches `.poster-url` in stall.css.
 */
const MONO_STACK = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export type PosterKind = 'square' | 'story' | 'stream';

/** `--s-sign-case`, resolved: the two values the shipped table holds. */
export type PosterCase = 'uppercase' | 'none';

/**
 * Everything a look contributes, resolved by the caller. `bg` is the sheet's
 * ground and `surface` the stream card's plate; `border` is a colour or
 * absent (Modern's plate has no edge); `radius` is already in pixels.
 */
export type PosterPaint = {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    border?: string;
    radius: number;
    font: string;
    name: string;
    nameCase: PosterCase;
    nameWeight: string;
    tagline?: string;
    url: string;
    matrix: boolean[][];
    nameLines: 2 | 3;
};

export type PosterSpec = {
    kind: PosterKind;
    width: number;
    height: number;
    /** The QR's reserved square, never below a third of the format's short side. */
    qrSide: number;
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    border?: string;
    radius: number;
    font: string;
    name: string;
    nameCase: PosterCase;
    nameWeight: string;
    tagline?: string;
    brand: string;
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

    /**
     * A 0 or NaN measure is an unloaded face, not "everything fits". One
     * code unit still goes on a line so we make progress and cannot hang.
     */
    const fits = (s: string): boolean => {
        if (s.length <= 1) {
            return true;
        }
        const w = measure(s);
        if (!Number.isFinite(w) || w <= 0) {
            return false;
        }
        return w <= maxWidth;
    };

    const takeFit = (word: string): { head: string; rest: string } => {
        if (word.length <= 1) {
            return { head: word, rest: '' };
        }
        let i = 1;
        while (i < word.length && fits(word.slice(0, i + 1))) {
            i += 1;
        }
        return { head: word.slice(0, i), rest: word.slice(i) };
    };

    const breakLong = (word: string): void => {
        let rest = word;
        while (rest.length > 0) {
            if (fits(rest)) {
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
            if (fits(word)) {
                current = word;
            } else {
                breakLong(word);
            }
            continue;
        }
        const candidate = `${current} ${word}`;
        if (fits(candidate)) {
            current = candidate;
            continue;
        }
        lines.push(current);
        current = '';
        if (fits(word)) {
            current = word;
        } else {
            breakLong(word);
        }
    }
    if (current.length > 0) {
        lines.push(current);
    }
    if (maxLines !== undefined && maxLines > 0 && lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        const lastIdx = kept.length - 1;
        let last = kept[lastIdx] ?? '';
        const mark = '…';
        while (last.length > 0 && !fits(`${last}${mark}`)) {
            last = last.slice(0, -1);
        }
        kept[lastIdx] = `${last}${mark}`;
        return kept;
    }
    return lines.length > 0 ? lines : [''];
}

/**
 * Square/Story URL line: the whole link in at most two lines, or nothing.
 * A truncated cashaddr is a lie; the QR already carries the bytes.
 */
export function urlLinesOrNone(
    url: string,
    maxWidth: number,
    measure: (s: string) => number,
): string[] {
    const lines = wrapLines(url, maxWidth, measure);
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
        return [];
    }
    if (lines.length > 2) {
        return [];
    }
    return lines;
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

/*
 * Metrics, one table per format, taken from the poster cards in the Stall
 * Design canvas (round 4). Leading is quoted as the design's line-height and
 * rounded up once, here, so a layout never carries a fraction of a line.
 */
const NAME_LEAD = 1.02;
const TAGLINE_LEAD = 1.3;
const CAPTION_LEAD = 1.15;
const URL_LEAD = 1.2;
/** The brand line's tracking, as a fraction of its own size (0.12em). */
const BRAND_TRACK = 0.12;
/** The stream caption's tracking (0.04em). */
const CAP_TRACK = 0.04;

const SQUARE = {
    pad: 80,
    bar: 16,
    barGap: 8,
    bar2: 4,
    headGap: 56,
    brand: 28,
    brandGap: 28,
    name: 108,
    nameGap: 28,
    tagline: 38,
    taglineWidth: 900,
    qr: 406,
    qrGap: 56,
    caption: 44,
    url: 30,
    urlGap: 24,
    /* The right column sits on the QR's baseline, lifted by the design's 12. */
    colLift: 12,
} as const;

const STORY = {
    pad: 250,
    padX: 96,
    bar: 16,
    barGap: 8,
    bar2: 4,
    headGap: 72,
    brand: 30,
    brandGap: 32,
    name: 124,
    nameGap: 32,
    tagline: 42,
    qr: 464,
    blockGap: 40,
    caption: 48,
    url: 32,
} as const;

const STREAM = {
    pad: 40,
    bar: 8,
    barGap: 4,
    bar2: 4,
    headGap: 28,
    brand: 16,
    brandGap: 14,
    name: 48,
    qr: 232,
    caption: 24,
    captionLead: 1.2,
    captionWidth: 160,
    /* The caption's last line sits 8 above the QR box's own bottom edge. */
    captionLift: 8,
} as const;

/**
 * The sticker's height, and the one thing it depends on. The second accent
 * bar's strip is reserved whether or not the look has a second accent: a card
 * that changed height with the palette would be a different sticker per theme,
 * and `nameLines` is the only variable this contract admits.
 */
function streamCardHeight(nameLines: 2 | 3): number {
    const bars = STREAM.bar + STREAM.barGap + STREAM.bar2;
    return (
        STREAM.pad +
        bars +
        STREAM.headGap +
        STREAM.brand +
        STREAM.brandGap +
        Math.ceil(STREAM.name * NAME_LEAD) * nameLines +
        STREAM.qr +
        STREAM.pad
    );
}

/**
 * The QR's reserved square. A code that is small relative to the sheet it is
 * printed on is a code nobody scans from across a market, so every format
 * keeps at least a third of its short side — the design's sides already clear
 * that, and the floor is what stops a later trim from crossing it.
 */
function qrSideFor(kind: PosterKind, width: number, height: number): number {
    const drawn = kind === 'square' ? SQUARE.qr : kind === 'story' ? STORY.qr : STREAM.qr;
    return Math.max(drawn, Math.ceil(Math.min(width, height) / 3));
}

export function posterSpec(kind: PosterKind, paint: PosterPaint): PosterSpec {
    const shared = {
        bg: paint.bg,
        surface: paint.surface,
        text: paint.text,
        muted: paint.muted,
        accent: paint.accent,
        accent2: paint.accent2,
        border: paint.border,
        radius: paint.radius,
        font: paint.font,
        name: paint.name,
        nameCase: paint.nameCase,
        nameWeight: paint.nameWeight,
        matrix: paint.matrix,
        nameLines: paint.nameLines,
    };
    if (kind === 'stream') {
        const height = streamCardHeight(paint.nameLines);
        return {
            kind,
            width: STREAM_CARD_WIDTH,
            height,
            qrSide: qrSideFor(kind, STREAM_CARD_WIDTH, height),
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
        qrSide: qrSideFor(kind, size.width, size.height),
        ...shared,
        tagline: paint.tagline,
        brand: BROADCAST_BRAND,
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

export function paintQr(
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

/**
 * The reserved square's own painter: `qrFit` floors the module size, so the
 * code is centred inside `spec.qrSide` rather than left in its corner. Every
 * caller hands the square's top-left, which is what the layouts anchor.
 */
function paintQrBox(
    ctx: CanvasRenderingContext2D,
    spec: PosterSpec,
    left: number,
    top: number,
): void {
    const { box, modulePx } = qrFit(spec.matrix, spec.qrSide);
    const inset = Math.floor((spec.qrSide - box) / 2);
    paintQr(ctx, spec.matrix, left + inset, top + inset, modulePx);
}

/**
 * Tracking, where the browser has it. `letterSpacing` is a recent 2d-context
 * property; assigning it on a context that lacks it is a silent no-op that
 * would make what is measured differ from what is drawn, so it is guarded.
 */
function setTracking(ctx: CanvasRenderingContext2D, px: number): void {
    const tracked = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if ('letterSpacing' in tracked) {
        tracked.letterSpacing = `${px}px`;
    }
}

/**
 * The name in the case it will be painted in. `wrapLines` must see this
 * string and not the seller's: a look that uppercases (Neo) widens every
 * glyph, and wrapping the original then shouting it overruns the plate.
 */
function cased(text: string, style: PosterCase): string {
    return style === 'uppercase' ? text.toUpperCase() : text;
}

/**
 * The accent rules under the head. The second is drawn only when the look
 * actually has a second colour — Modern's `accentTwo` is its `accent`, and a
 * second bar in the same ink is a thicker bar, not a second mark. Returns the
 * height consumed, which the sheets use and the stream card reserves.
 */
function paintBars(
    ctx: CanvasRenderingContext2D,
    spec: PosterSpec,
    x: number,
    y: number,
    w: number,
    thick: number,
    gap: number,
    thin: number,
): number {
    ctx.fillStyle = spec.accent;
    ctx.fillRect(x, y, w, thick);
    if (spec.accent2 === spec.accent) {
        return thick;
    }
    ctx.fillStyle = spec.accent2;
    ctx.fillRect(x, y + thick + gap, w, thin);
    return thick + gap + thin;
}

/** A rounded rectangle as a path. `arcTo` with a 0 radius is a corner. */
function roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
): void {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
}

/**
 * The stream card: a plate laid on somebody's stream, so it carries the look's
 * surface, its corners and its edge — and no link, because a viewer reads it
 * through a camera and not through a browser.
 */
function paintStream(ctx: CanvasRenderingContext2D, spec: PosterSpec): void {
    const m = STREAM;
    const contentW = spec.width - m.pad * 2;
    const measure = (s: string): number => ctx.measureText(s).width;

    ctx.fillStyle = spec.surface;
    roundRectPath(ctx, 0, 0, spec.width, spec.height, spec.radius);
    ctx.fill();
    if (spec.border !== undefined && spec.border !== '') {
        ctx.strokeStyle = spec.border;
        ctx.lineWidth = 1;
        roundRectPath(
            ctx,
            0.5,
            0.5,
            spec.width - 1,
            spec.height - 1,
            Math.max(spec.radius - 0.5, 0),
        );
        ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    paintBars(ctx, spec, m.pad, m.pad, contentW, m.bar, m.barGap, m.bar2);
    // The full strip, painted or not: `streamCardHeight` reserves it.
    let y = m.pad + m.bar + m.barGap + m.bar2 + m.headGap;

    ctx.fillStyle = spec.accent;
    ctx.font = `700 ${m.brand}px ${spec.font}`;
    setTracking(ctx, m.brand * BRAND_TRACK);
    ctx.fillText(spec.brand.toUpperCase(), m.pad, y);
    setTracking(ctx, 0);
    y += m.brand + m.brandGap;

    ctx.fillStyle = spec.text;
    ctx.font = `${spec.nameWeight} ${m.name}px ${spec.font}`;
    const nameLead = Math.ceil(m.name * NAME_LEAD);
    for (const line of wrapLines(
        cased(spec.name, spec.nameCase),
        contentW,
        measure,
        spec.nameLines,
    )) {
        ctx.fillText(line, m.pad, y);
        y += nameLead;
    }

    paintQrBox(ctx, spec, spec.width - m.pad - spec.qrSide, spec.height - m.pad - spec.qrSide);

    ctx.fillStyle = spec.muted;
    ctx.font = `700 ${m.caption}px ${spec.font}`;
    setTracking(ctx, m.caption * CAP_TRACK);
    const capLead = Math.ceil(m.caption * m.captionLead);
    const capLines = wrapLines(spec.caption.toUpperCase(), m.captionWidth, measure);
    let cy = spec.height - m.pad - m.captionLift - capLines.length * capLead;
    for (const line of capLines) {
        ctx.fillText(line, m.pad, cy);
        cy += capLead;
    }
    setTracking(ctx, 0);
}

/** Bars, brand and name: the head both sheet formats open with. */
/**
 * The name's sizes, largest first. The row under the head is anchored from
 * the sheet's foot, so a head that grows (a three-line name, a two-line
 * tagline) has nowhere to go but into the QR — measured on the Neo square,
 * where the tagline's second line sat under the code. So the head yields:
 * the name steps down through these until its lines end above `limit`, and
 * the tagline keeps only the lines that still fit (`paintTagline`). The
 * smallest size is a floor, not a promise — a name is wrapped and, past
 * `nameLines`, cut with an ellipsis, never clipped by the code.
 */
const NAME_TIERS = [1, 0.85, 0.72] as const;

function paintHead(
    ctx: CanvasRenderingContext2D,
    spec: PosterSpec,
    m: typeof SQUARE | typeof STORY,
    x: number,
    top: number,
    contentW: number,
    limit: number,
): number {
    const measure = (s: string): number => ctx.measureText(s).width;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let y = top + paintBars(ctx, spec, x, top, contentW, m.bar, m.barGap, m.bar2) + m.headGap;

    ctx.fillStyle = spec.accent;
    ctx.font = `700 ${m.brand}px ${spec.font}`;
    setTracking(ctx, m.brand * BRAND_TRACK);
    ctx.fillText(spec.brand.toUpperCase(), x, y);
    setTracking(ctx, 0);
    y += m.brand + m.brandGap;

    ctx.fillStyle = spec.text;
    const name = cased(spec.name, spec.nameCase);
    let lines: string[] = [];
    let nameLead = 0;
    for (const tier of NAME_TIERS) {
        const size = Math.round(m.name * tier);
        ctx.font = `${spec.nameWeight} ${size}px ${spec.font}`;
        nameLead = Math.ceil(size * NAME_LEAD);
        lines = wrapLines(name, contentW, measure, spec.nameLines);
        if (y + lines.length * nameLead <= limit) {
            break;
        }
    }
    for (const line of lines) {
        ctx.fillText(line, x, y);
        y += nameLead;
    }
    return y;
}

/**
 * The seller's sentence, under the name. Two lines at most, then it is cut —
 * and only as many of those as end above `limit`, the top of the row the
 * foot anchors: a line that would sit under the code is not painted at all.
 */
function paintTagline(
    ctx: CanvasRenderingContext2D,
    spec: PosterSpec,
    size: number,
    x: number,
    top: number,
    maxWidth: number,
    limit: number,
): void {
    if (spec.tagline === undefined || spec.tagline === '') {
        return;
    }
    const measure = (s: string): number => ctx.measureText(s).width;
    const lead = Math.ceil(size * TAGLINE_LEAD);
    const room = Math.min(2, Math.floor((limit - top) / lead));
    if (room < 1) {
        return;
    }
    ctx.fillStyle = spec.muted;
    ctx.font = `400 ${size}px ${spec.font}`;
    let y = top;
    for (const line of wrapLines(spec.tagline, maxWidth, measure, room)) {
        ctx.fillText(line, x, y);
        y += lead;
    }
}

function paintSquare(ctx: CanvasRenderingContext2D, spec: PosterSpec): void {
    const m = SQUARE;
    const contentW = spec.width - m.pad * 2;
    const measure = (s: string): number => ctx.measureText(s).width;
    /*
     * The bottom is measured up from the sheet's foot, never stacked under the
     * head: with the row pushed down by the head instead, a one-line tagline
     * left a hole the height of a line and the QR floated (design review,
     * round 4). Only the link's own height moves it, exactly as Story's does.
     *
     * And the link gets the sheet's whole width, not the column beside the QR.
     * Measured: at 30px in a monospace face (~0.6em advance) a 458px column
     * seats 25 characters, so two lines hold 50 — and `/s/` plus a cashaddr is
     * 69 before an origin. Every real link would have been dropped by
     * `urlLinesOrNone`, leaving a QR with nothing naming where it opens, which
     * is the one thing this row exists to prevent. At 920 two lines hold about
     * 100, which covers the address form and the 66-char pubkey form alike; a
     * link carrying a manifest hint is still longer than that and is still
     * dropped whole.
     */
    ctx.font = `400 ${m.url}px ${MONO_STACK}`;
    const urlLines = spec.url === undefined ? [] : urlLinesOrNone(spec.url, contentW, measure);
    const urlLead = Math.ceil(m.url * URL_LEAD);
    const urlBlock = urlLines.length * urlLead;
    const rowBottom = spec.height - m.pad - (urlBlock > 0 ? urlBlock + m.urlGap : 0);
    const rowTop = rowBottom - spec.qrSide;

    // The head is painted against the row it must clear, never the reverse.
    const limit = rowTop - m.nameGap;
    const afterName = paintHead(ctx, spec, m, m.pad, m.pad, contentW, limit);
    paintTagline(
        ctx,
        spec,
        m.tagline,
        m.pad,
        afterName + m.nameGap,
        Math.min(m.taglineWidth, contentW),
        limit,
    );

    paintQrBox(ctx, spec, m.pad, rowTop);

    const colX = m.pad + spec.qrSide + m.qrGap;
    const colW = spec.width - m.pad - colX;
    ctx.font = `700 ${m.caption}px ${spec.font}`;
    const capLines = wrapLines(spec.caption, colW, measure);
    const capLead = Math.ceil(m.caption * CAPTION_LEAD);
    let cy = rowBottom - m.colLift - capLines.length * capLead;
    ctx.fillStyle = spec.text;
    for (const line of capLines) {
        ctx.fillText(line, colX, cy);
        cy += capLead;
    }
    if (urlLines.length > 0) {
        let uy = spec.height - m.pad - urlBlock;
        ctx.fillStyle = spec.muted;
        ctx.font = `400 ${m.url}px ${MONO_STACK}`;
        for (const line of urlLines) {
            ctx.fillText(line, m.pad, uy);
            uy += urlLead;
        }
    }
}

function paintStory(ctx: CanvasRenderingContext2D, spec: PosterSpec): void {
    const m = STORY;
    const contentW = spec.width - m.padX * 2;
    const cx = spec.width / 2;
    const measure = (s: string): number => ctx.measureText(s).width;
    ctx.font = `400 ${m.url}px ${MONO_STACK}`;
    const urlLines = spec.url === undefined ? [] : urlLinesOrNone(spec.url, contentW, measure);
    const urlLead = Math.ceil(m.url * URL_LEAD);
    ctx.font = `700 ${m.caption}px ${spec.font}`;
    const capLines = wrapLines(spec.caption, contentW, measure);
    const capLead = Math.ceil(m.caption * CAPTION_LEAD);

    // Measured up from the sheet's foot, so the tagline cannot move it.
    const qrTop =
        spec.height -
        m.pad -
        urlLines.length * urlLead -
        m.blockGap -
        capLines.length * capLead -
        m.blockGap -
        spec.qrSide;

    // The head is painted against the row it must clear, never the reverse.
    const limit = qrTop - m.blockGap;
    const afterName = paintHead(ctx, spec, m, m.padX, m.pad, contentW, limit);
    paintTagline(ctx, spec, m.tagline, m.padX, afterName + m.nameGap, contentW, limit);

    paintQrBox(ctx, spec, Math.floor((spec.width - spec.qrSide) / 2), qrTop);

    ctx.textAlign = 'center';
    let cy = qrTop + spec.qrSide + m.blockGap;
    ctx.fillStyle = spec.text;
    ctx.font = `700 ${m.caption}px ${spec.font}`;
    for (const line of capLines) {
        ctx.fillText(line, cx, cy);
        cy += capLead;
    }
    if (urlLines.length > 0) {
        cy += m.blockGap;
        ctx.fillStyle = spec.muted;
        ctx.font = `400 ${m.url}px ${MONO_STACK}`;
        for (const line of urlLines) {
            ctx.fillText(line, cx, cy);
            cy += urlLead;
        }
    }
}

let lastDrawn: PosterSpec | undefined;

/** The spec `drawPoster` was last handed — tests pin this, not a fixture they built. */
export function lastDrawnPosterSpec(): PosterSpec | undefined {
    return lastDrawn;
}

export function drawPoster(canvas: HTMLCanvasElement, spec: PosterSpec): void {
    lastDrawn = spec;
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
        return;
    }
    // The card paints its own plate, corners and all; a sheet is the stall's
    // ground edge to edge.
    if (spec.kind === 'stream') {
        paintStream(ctx, spec);
        return;
    }
    ctx.fillStyle = spec.bg;
    ctx.fillRect(0, 0, spec.width, spec.height);
    if (spec.kind === 'square') {
        paintSquare(ctx, spec);
        return;
    }
    paintStory(ctx, spec);
}

const pngSaves = new WeakSet<HTMLCanvasElement>();

export function savePng(
    canvas: HTMLCanvasElement,
    filename: string,
    onDone?: () => void,
): void {
    if (pngSaves.has(canvas)) {
        return;
    }
    pngSaves.add(canvas);
    const finish = (): void => {
        pngSaves.delete(canvas);
        onDone?.();
    };
    try {
        canvas.toBlob((blob) => {
            try {
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
            } finally {
                finish();
            }
        }, 'image/png');
    } catch {
        finish();
    }
}
