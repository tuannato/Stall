import { Readable } from 'node:stream';
import { spec, tap } from 'node:test/reporters';

/**
 * The runtime half of `no-node-test-computes-in-a-describe-body`
 * (`scripts/node-test-guard.mjs` is the static half), named by the `test`
 * script as `--test-reporter`.
 *
 * On Node 22.22.0 `node --test` prints a failed suite for a `describe` body or
 * an `after()` hook inside a describe that throws, and then counts nothing: the
 * summary says `fail 0` and the exit status is 0. This reporter prints exactly
 * what Node would have printed by default (the spec reporter on a terminal,
 * TAP otherwise: the same choice Node makes, and the output byte for byte,
 * colours included, measured) and sets the exit status to 1 when any
 * `test:fail` event, a `todo` aside, went by. When the runner's own summary
 * called the run a success all the same, one line on stderr says why the
 * status is 1 beside a summary that says `fail 0`. Nothing else is added: a
 * green run and an ordinarily red one print what they printed before.
 *
 * Only the `test` script uses it: a bare `node --test file` run, and the
 * deploy road's `public-checks` job, which runs three of these files with
 * nothing installed, keep Node's own behaviour.
 */
export default async function* nodeTestReporter(source) {
    let failures = 0;
    let summarised = false;
    async function* watched() {
        for await (const event of source) {
            if (event.type === 'test:fail' && !event.data.todo) {
                failures += 1;
            }
            if (event.type === 'test:summary' && event.data.file === undefined) {
                summarised = event.data.success === true;
            }
            yield event;
        }
    }
    if (process.stdout.isTTY) {
        yield* Readable.from(watched(), { objectMode: true }).pipe(new spec());
    } else {
        yield* tap(watched());
    }
    if (failures > 0) {
        process.exitCode = 1;
        if (summarised) {
            process.stderr.write(`node-test-reporter: ${failures} failed test or suite event(s) above were not counted by the summary (a describe body or a describe's after() hook threw); exit status 1\n`);
        }
    }
}
