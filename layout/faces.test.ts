import { describe, expect, it } from 'vitest';
import { faceStates, loadEveryFace, type Face, type FaceSet } from './faces';

/** A face whose load settles when the test says so, or never. */
function face(family: string, status: string, settle?: 'loads' | 'fails'): Face & { loads: number } {
    const f = {
        family,
        style: 'normal',
        weight: '400 700',
        unicodeRange: 'U+0-FF',
        status,
        loads: 0,
        load(): Promise<unknown> {
            f.loads += 1;
            f.status = 'loading';
            if (settle === undefined) return new Promise(() => {});
            return Promise.resolve().then(() => {
                f.status = settle === 'loads' ? 'loaded' : 'error';
                if (settle === 'fails') throw new Error('refused');
            });
        },
    };
    return f;
}

function setOf(faces: Face[], ready: Promise<unknown> = Promise.resolve()): FaceSet {
    return { ready, [Symbol.iterator]: () => faces[Symbol.iterator]() };
}

describe('every-face-is-loaded-before-the-probe-measures (the page half)', () => {
    it('asks every face that is not loaded to load, and only those, then reads every status', async () => {
        const done = face('Inter', 'loaded');
        const later = face('Stall Serif', 'unloaded', 'loads');
        const echo = await loadEveryFace(setOf([done, later]));
        expect(done.loads).toBe(0);
        expect(later.loads).toBe(1);
        expect(echo.asked).toBe(1);
        expect(echo.timedOut).toBe(false);
        expect(echo.faces.map((f) => f.status)).toEqual(['loaded', 'loaded']);
    });

    it('waits for the set to be ready after the loads settle', async () => {
        let ready = false;
        const set = setOf(
            [face('Inter', 'unloaded', 'loads')],
            new Promise<void>((resolve) =>
                setTimeout(() => {
                    ready = true;
                    resolve();
                }, 20),
            ),
        );
        await loadEveryFace(set);
        expect(ready).toBe(true);
    });

    it('carries a face that failed as an error, never as loaded', async () => {
        const echo = await loadEveryFace(setOf([face('JetBrains Mono', 'unloaded', 'fails')]));
        expect(echo.faces).toEqual([
            { family: 'JetBrains Mono', style: 'normal', weight: '400 700', unicodeRange: 'U+0-FF', status: 'error' },
        ]);
        expect(echo.timedOut).toBe(false);
    });

    it('stops waiting at its bound and says so, with the face still loading', async () => {
        const echo = await loadEveryFace(setOf([face('Inter', 'unloaded')]), { waitMs: 30 });
        expect(echo.timedOut).toBe(true);
        expect(echo.faces[0]!.status).toBe('loading');
    });

    it('reads a status without asking for a load', () => {
        const unloaded = face('Inter', 'unloaded', 'loads');
        expect(faceStates([unloaded])[0]!.status).toBe('unloaded');
        expect(unloaded.loads).toBe(0);
    });
});
