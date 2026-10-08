/**
 * Whether a module is the script node was asked to run (`node <file>`), by
 * the real path of both sides. Node names a module by its real path
 * (`import.meta.url`) and keeps `process.argv[1]` as it was given — resolved,
 * not real — so compared lexically, a run through a linked directory read as
 * an import and the CLI exited 0 having done nothing: on this Mac every path
 * under `$TMPDIR` is one, `/var` being a link to `/private/var` (the third
 * 8c2 critic's item 4; `the-clis-run-through-a-linked-path`,
 * `scripts/looks-artifact.test.mjs`). A path that does not exist is no run
 * of this module. Node built-ins only; a `.d.mts` beside it.
 */
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Whether the module at `moduleUrl` (its `import.meta.url`) is the one `argv1` (by default `process.argv[1]`) names. */
export function runAsScript(moduleUrl, argv1 = process.argv[1]) {
    if (argv1 === undefined) {
        return false;
    }
    let given;
    try {
        given = realpathSync(resolve(argv1));
    } catch {
        return false;
    }
    return given === realpathSync(fileURLToPath(moduleUrl));
}
