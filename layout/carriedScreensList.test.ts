import { describe, expect, it } from 'vitest';
import { CARRIED_SCREENS } from './carriedScreens';
import { SCREENS } from './fixtures';

describe('a-public-screen-is-the-same-whatever-the-build-carries (the list)', () => {
    it('names probe screens, each with its reason', () => {
        for (const [screen, why] of Object.entries(CARRIED_SCREENS)) {
            expect(Object.hasOwn(SCREENS, screen), `${screen} is a probe screen`).toBe(true);
            expect(why.trim().length, `${screen} says why`).toBeGreaterThan(20);
        }
    });
});
