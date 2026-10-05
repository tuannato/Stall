/**
 * Every face is loaded before the probe measures
 * (`every-face-is-loaded-before-the-probe-measures`), held by the runner
 * (`layout-check.mjs`) over what the page echoes (`layout/faces.ts`).
 *
 * The probe's geometry passes measure in one synchronous task, so a face
 * still loading when it starts is the fallback face for the whole pass. The
 * page now asks every face it declares to load and waits, then echoes each
 * face's status at the moment measuring began; this module refuses the pass
 * when one is not `loaded`, when the wait ran out, or when a face
 * `src/ui/stall.css` declares is not on the page at all — the list is read
 * from that sheet's `@font-face` rules, never written here, so a face added
 * there is owed on the next run. A page may declare more (a worn-only look's
 * own faces); those are owed `loaded` by the page's echo, not by this list.
 *
 * Pure over strings and plain objects, plus one reader of `stall.css`.
 * Tests: `scripts/probe-faces.test.mjs`.
 */
import { readFileSync } from 'node:fs';

/** The check's name, as a failure record carries it. */
export const FACES_CHECK = 'every-face-is-loaded-before-the-probe-measures';

/** The sheet whose `@font-face` rules name the shipped faces. */
export const STALL_CSS = new URL('../src/ui/stall.css', import.meta.url);

const unquote = (value) => value.trim().replace(/^(['"])(.*)\1$/, '$2').trim();

/** `normal` and `bold` as the numbers a face set reports, and every run of space as one. */
function normalWeight(value) {
    return value
        .trim()
        .split(/\s+/)
        .map((part) => ({ normal: '400', bold: '700' })[part.toLowerCase()] ?? part)
        .join(' ');
}

/**
 * A `unicode-range` as sorted, merged code point ranges in hex, so the
 * sheet's spelling (`U+0000-00FF`) and a browser's (`U+0-FF`) compare equal.
 * An absent range is every code point.
 */
export function normalRange(value) {
    const pairs = rangePairs(value);
    return pairs === undefined
        ? `unreadable: ${String(value).trim()}`
        : pairs.map(([lo, hi]) => (lo === hi ? lo.toString(16) : `${lo.toString(16)}-${hi.toString(16)}`)).join(',');
}

/**
 * A `unicode-range` as sorted, merged `[lo, hi]` code point pairs, or
 * undefined when a token is unreadable. An absent range is every code point.
 */
export function rangePairs(value) {
    const text = (value ?? '').trim();
    if (text === '') return [[0, 0x10ffff]];
    const ranges = [];
    for (const raw of text.split(',')) {
        const token = raw.trim().replace(/^u\+/i, '');
        if (token === '') continue;
        let lo;
        let hi;
        if (token.includes('?')) {
            lo = Number.parseInt(token.replace(/\?/g, '0'), 16);
            hi = Number.parseInt(token.replace(/\?/g, 'f'), 16);
        } else if (token.includes('-')) {
            const [a, b] = token.split('-');
            lo = Number.parseInt(a, 16);
            hi = Number.parseInt(b.replace(/^u\+/i, ''), 16);
        } else {
            lo = hi = Number.parseInt(token, 16);
        }
        if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;
        ranges.push([lo, hi]);
    }
    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = [];
    for (const [lo, hi] of ranges) {
        const last = merged[merged.length - 1];
        if (last !== undefined && lo <= last[1] + 1) last[1] = Math.max(last[1], hi);
        else merged.push([lo, hi]);
    }
    return merged;
}

/** What selects a face, as one string: family, style, weight and range. */
export function faceKey(face) {
    return [
        unquote(face.family ?? '').toLowerCase(),
        (face.style ?? 'normal').trim().toLowerCase() || 'normal',
        normalWeight(face.weight ?? 'normal') || '400',
        normalRange(face.unicodeRange),
    ].join('|');
}

/** A face as a reader names it: family, style, weight and where its range starts. */
export function faceName(face) {
    const range = normalRange(face.unicodeRange);
    const first = range.split(',')[0];
    const more = range.includes(',') ? ',…' : '';
    return `${unquote(face.family ?? '')} ${(face.style ?? 'normal').trim()} ${normalWeight(face.weight ?? 'normal')} [U+${first}${more}]`;
}

/**
 * The `@font-face` rules of a stylesheet, as `{ family, style, weight,
 * unicodeRange, src }` — comments stripped, a missing descriptor at its
 * initial value, `src` the first `url()` it names (or '').
 */
export function declaredFaces(css) {
    const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = [];
    for (const match of text.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
        const descriptors = new Map();
        for (const declaration of match[1].split(';')) {
            const colon = declaration.indexOf(':');
            if (colon < 0) continue;
            descriptors.set(declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).trim());
        }
        out.push({
            family: unquote(descriptors.get('font-family') ?? ''),
            style: descriptors.get('font-style') ?? 'normal',
            weight: descriptors.get('font-weight') ?? 'normal',
            unicodeRange: descriptors.get('unicode-range') ?? '',
            src: /url\(\s*(['"]?)([^'")]+)\1\s*\)/.exec(descriptors.get('src') ?? '')?.[2] ?? '',
        });
    }
    return out;
}

/** The faces `src/ui/stall.css` declares. */
export function declaredStallFaces() {
    return declaredFaces(readFileSync(STALL_CSS, 'utf8'));
}

/**
 * Why a page did not have every face it owes loaded when it began
 * measuring, or nothing. `echo` is the page's `faces` (`FaceEcho`);
 * `declared` the faces it must hold. A status, never a glyph: which face a
 * line was drawn in is not read here.
 */
export function facesFaults(echo, declared) {
    if (echo === undefined || echo === null || !Array.isArray(echo.faces)) {
        return ['the page did not say which faces it measured in — a probe that never waited for them'];
    }
    const out = [];
    if (echo.timedOut === true) {
        out.push(`the wait for the page's faces ran out after ${echo.waitedMs} ms`);
    }
    if (echo.faces.length === 0) {
        out.push('the page declared no face at all — every line was measured in a fallback face');
    }
    for (const face of echo.faces) {
        if (face.status !== 'loaded') {
            out.push(`${faceName(face)} was ${face.status} when measuring began — a line set in it lays out in the fallback face until it loads`);
        }
    }
    const onPage = new Set(echo.faces.map(faceKey));
    for (const face of declared) {
        if (!onPage.has(faceKey(face))) {
            out.push(`${faceName(face)}, declared in stall.css, is not among the page's faces`);
        }
    }
    return out;
}

/** The faces a pass was measured in, as its line prints them. */
export function facesLine(echo) {
    if (echo === undefined || echo === null || !Array.isArray(echo.faces)) return 'no faces echoed';
    const loaded = echo.faces.filter((face) => face.status === 'loaded').length;
    const families = new Map();
    for (const face of echo.faces) {
        const family = unquote(face.family ?? '');
        families.set(family, (families.get(family) ?? 0) + 1);
    }
    const which = [...families].map(([family, n]) => `${family} ${n}`).join(', ');
    return (
        `${loaded} of ${echo.faces.length} loaded before measuring (${which}); ` +
        `${echo.asked} asked, ${echo.waitedMs} ms`
    );
}
