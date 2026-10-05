import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    declaredFaces,
    declaredStallFaces,
    faceKey,
    facesFaults,
    facesLine,
    normalRange,
} from './probe-faces.mjs';

/** A page's echo of `faces`, every one `status`, spelled the way Chrome reports a face. */
function echoOf(faces, status = 'loaded', extra = {}) {
    return {
        faces: faces.map((face) => ({
            family: face.family.includes(' ') ? `"${face.family}"` : face.family,
            style: face.style,
            weight: face.weight,
            // A browser's spelling: no leading zeros.
            unicodeRange: face.unicodeRange.replace(/U\+0+([0-9A-F])/gi, 'U+$1').replace(/-0+([0-9A-F])/gi, '-$1'),
            status,
        })),
        asked: faces.length,
        timedOut: false,
        waitedMs: 12,
        ...extra,
    };
}

describe('every-face-is-loaded-before-the-probe-measures', () => {
    const declared = declaredStallFaces();

    it('reads the faces from stall.css, never a list written here', () => {
        const families = new Set(declared.map((face) => face.family));
        assert.deepEqual([...families].sort(), ['Inter', 'JetBrains Mono', 'Stall Serif']);
        // Each family ships a Latin and a Vietnamese subset, Stall Serif an italic pair too.
        assert.equal(declared.length, 8);
        assert.ok(declared.every((face) => face.unicodeRange !== ''));
    });

    it('passes a page whose every face, and every face stall.css declares, is loaded', () => {
        assert.deepEqual(facesFaults(echoOf(declared), declared), []);
    });

    it('passes a page that declares more faces than stall.css, all loaded', () => {
        const own = { family: 't-ink-wash-brush', style: 'normal', weight: '400', unicodeRange: '' };
        assert.deepEqual(facesFaults(echoOf([...declared, own]), declared), []);
    });

    it('refuses a face still loading, or unloaded, or failed, when measuring began', () => {
        for (const status of ['loading', 'unloaded', 'error']) {
            const faults = facesFaults(echoOf(declared, status), declared);
            assert.equal(faults.length, declared.length, status);
            assert.match(faults[0], new RegExp(`was ${status} when measuring began`));
        }
        const one = echoOf(declared);
        one.faces[1] = { ...one.faces[1], status: 'loading' };
        const faults = facesFaults(one, declared);
        assert.equal(faults.length, 1);
        assert.match(faults[0], /^Inter normal 400 700 \[U\+102-103,…\] was loading/);
    });

    it('refuses a page that never echoed, declared nothing, or ran out of time', () => {
        assert.match(facesFaults(undefined, declared)[0], /did not say which faces/);
        assert.match(facesFaults(null, declared)[0], /did not say which faces/);
        assert.match(facesFaults({}, declared)[0], /did not say which faces/);
        const empty = facesFaults(echoOf([]), declared);
        assert.match(empty[0], /declared no face at all/);
        assert.equal(empty.length, 1 + declared.length);
        assert.match(facesFaults(echoOf(declared, 'loaded', { timedOut: true, waitedMs: 10000 }), declared)[0], /ran out after 10000 ms/);
    });

    it('refuses a page missing a face stall.css declares, even with every face it has loaded', () => {
        const faults = facesFaults(echoOf(declared.slice(1)), declared);
        assert.equal(faults.length, 1);
        assert.match(faults[0], /^Inter normal 400 700 \[U\+0-ff,…\], declared in stall.css, is not among the page's faces$/);
    });

    it('refuses a face that was not loaded, or not declared, by the verdict', () => {
        const late = [{ family: 'Inter', style: 'normal', weight: '400 700', unicodeRange: 'U+0-FF', status: 'loading' }];
        const faults = facesFaults(echoOf(declared), declared, late);
        assert.equal(faults.length, 1);
        assert.match(faults[0], /was loading at the verdict, or arrived after measuring began/);
    });

    it('counts what it waited for on the pass line', () => {
        assert.equal(
            facesLine(echoOf(declared)),
            '8 of 8 loaded before measuring (Inter 2, Stall Serif 4, JetBrains Mono 2); 8 asked, 12 ms',
        );
        assert.equal(facesLine(undefined), 'no faces echoed');
    });
});

describe('a face is the same face however its range is spelled', () => {
    it('reads the sheet spelling and a browser spelling as one range', () => {
        assert.equal(normalRange('U+0000-00FF, U+0131, U+0152-0153'), normalRange('U+0-FF, U+131, U+152-153'));
        assert.equal(normalRange('U+0000-00FF, U+0131'), '0-ff,131');
        // Order, overlap and adjacency are not part of the face.
        assert.equal(normalRange('U+20, U+0-1F'), '0-20');
        // A wildcard is a range.
        assert.equal(normalRange('U+4??'), '400-4ff');
        // No range is every code point.
        assert.equal(normalRange(''), '0-10ffff');
    });

    it('keys a face by family, style, weight and range, quotes and keywords aside', () => {
        const sheet = { family: 'Stall Serif', style: 'italic', weight: '400 700', unicodeRange: 'U+0000-00FF' };
        const page = { family: '"Stall Serif"', style: 'italic', weight: '400 700', unicodeRange: 'U+0-FF' };
        assert.equal(faceKey(sheet), faceKey(page));
        assert.notEqual(faceKey(sheet), faceKey({ ...page, style: 'normal' }));
        assert.equal(faceKey({ ...page, weight: 'bold' }), faceKey({ ...page, weight: '700' }));
    });

    it('parses @font-face blocks and nothing else, comments stripped', () => {
        const css = `
            /* @font-face { font-family: 'Commented'; } */
            .x { font-family: 'Not a face'; }
            @font-face {
                font-family: 'One Face';
                src: url('./a.woff2') format('woff2');
                unicode-range: U+0000-00FF,
                    U+0131;
            }
            @font-face { font-family: "Two"; font-style: italic; font-weight: 700; }
        `;
        assert.deepEqual(declaredFaces(css), [
            { family: 'One Face', style: 'normal', weight: 'normal', unicodeRange: 'U+0000-00FF,\n                    U+0131' },
            { family: 'Two', style: 'italic', weight: '700', unicodeRange: '' },
        ]);
    });
});
