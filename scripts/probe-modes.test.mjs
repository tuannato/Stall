import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { LOOK_MODES, lookMode } from './probe-modes.mjs';

const RUNNER = readFileSync(new URL('./layout-check.mjs', import.meta.url), 'utf8');

describe('the-default-run-turns-no-look-run-branch-on', () => {
    it('pins every mode’s decisions by value', () => {
        assert.deepEqual(LOOK_MODES, ['shipped', 'workshop', 'carried']);
        assert.deepEqual({ ...lookMode('shipped') }, { looks: 'shipped', carried: false, witnesses: false, publicTogether: true, recordsGreen: true, saysGreen: false });
        assert.deepEqual({ ...lookMode('workshop') }, { looks: 'workshop', carried: false, witnesses: false, publicTogether: true, recordsGreen: false, saysGreen: false });
        assert.deepEqual({ ...lookMode('carried') }, { looks: 'carried', carried: true, witnesses: true, publicTogether: false, recordsGreen: false, saysGreen: true });
        assert.equal(lookMode('kit'), undefined);
    });

    it('decides every look-run branch of the runner by a field of the table', () => {
        assert.equal(/\bCARRIED_RUN\b/.test(RUNNER), false, 'a branch of its own, outside the table');
        // `'carried'` stands nowhere in the runner but its own error sentence for an unknown mode.
        const literals = RUNNER.split('\n').filter((line) => line.includes("'carried'"));
        assert.deepEqual(literals, []);
        assert.match(RUNNER, /const MODE = lookMode\(LOOKS\);/);
        for (const field of ['carried', 'witnesses', 'publicTogether', 'recordsGreen', 'saysGreen']) {
            assert.match(RUNNER, new RegExp(`\\bMODE\\.${field}\\b`), field);
        }
    });
});
