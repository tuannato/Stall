/**
 * What `.github/workflows/deploy.yml` may be (step 8c3; STEP-8C-PLAN v2,
 * V1 and V5): `workflowProblems(text, facts)` answers a list of `{ rule,
 * why }`, empty for the file this repository commits.
 *
 * The file holds three kinds of key — the private repository's read token
 * (the `looks` Environment), the preview deploy token (`cloudflare`) and the
 * production deploy token (`production`, the owner its required reviewer) —
 * so its shape is a rule, not a style, and the test is the only mechanical
 * guard on what `main`'s file does with them. A YAML reader is not a
 * dependency here, and text counts and line patterns were measured foolable
 * (the 8c critic's item 4: a double-quoted `run:` written with `\u` escapes
 * passed the 7B-1 test and reads, to a YAML parser, as a production
 * deploy). So it is read in two passes:
 *
 * 1. **A closed line grammar** (`parseWorkflow`), a subset of YAML chosen to
 *    be read without a parser. **Every line, comments included, is
 *    printable ASCII** (0x20 to 0x7e), checked before anything else: U+2028,
 *    U+2029 and U+0085 are line breaks to a YAML reader (libyaml and its
 *    ports), so a comment holding one hid a whole step or job from every
 *    rule while a reader saw it (the 8c3 critic's item 1); a tab, a CR, a C0
 *    or C1 control and anything above 0x7e go with them. Then every line is
 *    a comment, blank, `key: value`, `key:`, `- key: value`, `- key:`,
 *    `- value` (under `options:` or `branches:` alone) or a line of a
 *    `run: |` block. Refused: a value that opens with a quote (but a whole
 *    `'...'` of plain characters), an anchor, an alias, a tag, a flow
 *    collection, a block or folding indicator, `-`, `?`, `@` or a space; a
 *    backslash; `{` `}` `[` `]` outside `${{ ... }}`; `: ` inside a value; a
 *    comment after a value but on `uses:`; a quoted key, a merge key, a key
 *    twice in one mapping, a key with nothing under it (but an event
 *    directly under `on:`, `pull_request:` alone, which YAML reads as null
 *    and nothing else); a line more indented than its mapping that is not a
 *    `run: |` line (a plain scalar continued); a list item at its key's own
 *    indentation; any block scalar but `run: |` (no `>`, `|-`, `|+`,
 *    indentation indicator); a blank line inside a `run: |` block (which
 *    ends it, so the lines after are refused); trailing spaces; a document
 *    marker. A file that does not parse is read by no rule. **Cost,
 *    stated**: a shape GitHub accepts and the grammar does not fails the
 *    test (fail closed); a YAML feature the grammar admits but GitHub's own
 *    parser reads otherwise is the residual risk — the 8c critic's list
 *    (escapes, anchors, merge keys, flow collections, quoted keys, continued
 *    scalars, duplicate keys) and the 8c3 critic's line breaks are each
 *    refused, and every admitted plant reads alike under Psych (libyaml),
 *    measured out of the suite; GitHub's parser was never run here.
 * 2. **The rules** (`RULES`), over the tree the grammar built. Every job's
 *    `if:`, `needs:`, Environment, runner, timeout and steps are pinned
 *    whole (`JOBS`, names aside); beside that whole pin, each property a
 *    key depends on is its own rule, so a rule weakened turns its own plant
 *    green and the suite red — the secrets and where they stand, the
 *    expressions, the shell, the `looks` job running no project code, the
 *    two scripts verbatim, the private checkout, the selection, the unwrap
 *    before the install, the production road reading nothing private, the
 *    deploy calls, every install skipping pnpm's hook, the credentials, the
 *    artifacts, the queue and every action by commit. `scripts/deploy-workflow.test.mjs` plants every rule
 *    and every refused shape.
 *
 * Beside it, the rest of what a key could be reached through (the 8c3
 * critic's items 2, 3 and 5): **the workflow directory** holds `ci.yml` and
 * `deploy.yml` alone (`workflowFilesProblems`) — an Environment's branch
 * rule admits any workflow file on `main`, whatever its trigger; **`ci.yml`**
 * is read under the same grammar and names no Environment, no secret, no
 * trigger but `push`, `pull_request` and `workflow_dispatch`, reads the
 * repository and nothing more, and installs with `--ignore-pnpmfile`
 * (`ciProblems`); **no install loads a pnpm
 * hook** (`pnpmHookProblems`: no tracked `.pnpmfile`, no `pnpmfile`,
 * `globalPnpmfile` or `configDependencies` setting, `packageManager` pinned
 * — `pnpm install --ignore-scripts` still loads `.pnpmfile.cjs`, measured
 * by that critic on pnpm 10.24.0); and **wrangler's lockfile** resolves
 * every package from the npm registry with its integrity, with no
 * tracked `.npmrc` anywhere to steer it or any other install (`wranglerProblems`).
 *
 * Pure but for the two readers, `workflowFilesAt` and `trackedPathsAt`
 * (git and the disk): the caller hands in `released` (`RELEASED_LOOK_IDS`,
 * read by type stripping) and `sources` (the test files `public-checks`
 * runs, by path). Node built-ins and git only, with the two scripts the
 * `looks` job runs imported from their modules, so `public-checks` runs it
 * with nothing installed.
 */
import { execFileSync } from 'node:child_process';
import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACK_SCRIPT, PIN_SCRIPT } from './looks-artifact.mjs';
import { GIT_LOCATION_VARS } from './private-looks.mjs';

/**
 * Every action the file may use, by full commit, with the version the
 * commit is (the window's lookup, `git ls-remote` of each repository's
 * tags, 2026-10-08, the owner's yes; lightweight tags, so each is the
 * commit). The latest patch of the major each already ran; a newer major
 * (checkout and setup-node v7, upload-artifact v7, download-artifact v8)
 * is its own decision — its artifact layout and defaults are unread here.
 */
export const ACTIONS = Object.freeze({
    checkout: Object.freeze({ name: 'actions/checkout', sha: 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09', version: 'v5.1.0' }),
    setupNode: Object.freeze({ name: 'actions/setup-node', sha: 'a0853c24544627f65ddf259abe73b1d18a591444', version: 'v5.0.0' }),
    upload: Object.freeze({ name: 'actions/upload-artifact', sha: 'ea165f8d65b6e75b540449e92b4886f43607fa02', version: 'v4.6.2' }),
    download: Object.freeze({ name: 'actions/download-artifact', sha: 'd3f86a106a0bac45b974a628896c90dbdf5c8093', version: 'v4.3.0' }),
});

/** A `uses:` value as the file writes it: the action at its commit, then its version as a comment. */
export const usesOf = (action) => `${action.name}@${action.sha} # ${action.version}`;

/** A `uses:` pinned by commit: an action, `@`, 40 lower-case hex, and the version as a comment. */
export const PINNED_USES = /^([A-Za-z0-9._/-]+)@([0-9a-f]{40}) # (v\d+\.\d+\.\d+)$/;

/** Every job's gate, written out whole: from `main` alone, and for one target. */
export const PREVIEW_IF = "github.ref == 'refs/heads/main' && inputs.target == 'preview'";
export const PRODUCTION_IF = "github.ref == 'refs/heads/main' && inputs.target == 'production'";

/**
 * The tests `public-checks` runs before the `looks` job reads a private
 * byte, by file, with the suites each must hold: this file's own test, the
 * pin's (`PIN_SCRIPT` on the runner's bash) and the pack's (`PACK_SCRIPT`
 * on its bash, awk and git, and `the-canary-is-public-bytes`, which
 * rebuilds `CANARY_TREE` from this repository's bytes — the third 8c2
 * critic's item 1). Whole files, never a name pattern: a pattern that
 * matches nothing passes having run nothing.
 */
export const PUBLIC_CHECK_TESTS = Object.freeze({
    'scripts/deploy-workflow.test.mjs': Object.freeze([
        'the-deploy-workflow-keeps-its-keys-apart',
        'the-workflow-runs-the-scripts-it-was-tested-with',
        'the-production-build-carries-no-private-look-until-a-release',
        'the-deploy-workflow-pins-every-action-by-commit',
        'the-workflow-directory-holds-ci-and-deploy-alone',
        'the-ci-workflow-holds-no-key',
        'no-install-loads-a-pnpm-hook',
        'the-deploy-workflow-takes-wrangler-from-its-own-pinned-package',
    ]),
    'scripts/looks-pin.test.mjs': Object.freeze(['the-pin-is-read-the-same-way-by-the-shell-and-the-scripts']),
    'scripts/looks-artifact.test.mjs': Object.freeze([
        'the-pack-refuses-a-file-the-build-would-refuse',
        'the-canary-is-public-bytes',
        'the-preview-road-carries-only-the-canary-tree',
    ]),
});

export const PUBLIC_CHECKS_RUN = `node --experimental-strip-types --test ${Object.keys(PUBLIC_CHECK_TESTS).join(' ')}`;

/** The build job's first step after the download, before anything is installed. */
export const UNWRAP_RUN = 'node scripts/looks-artifact.mjs unwrap "$RUNNER_TEMP/looks-artifact" looks';

/** A deploy job's one call with its secrets: the existence check, then the upload to `branch`. */
export const deployRun = (branch) =>
    `deploy/node_modules/.bin/wrangler pages deployment list --project-name stall > /dev/null\ndeploy/node_modules/.bin/wrangler pages deploy dist --project-name stall --branch ${branch} --commit-hash "$GITHUB_SHA" --commit-dirty=false\n`;

/** The only expressions the file may hold, each in a place the rules pin. */
export const EXPRESSIONS = Object.freeze([
    'secrets.LOOKS_REPO',
    'secrets.LOOKS_READ_TOKEN',
    'secrets.CLOUDFLARE_API_TOKEN',
    'secrets.CLOUDFLARE_ACCOUNT_ID',
    'steps.pin.outputs.commit',
    'steps.pin.outputs.tree',
    'runner.temp',
    'github.workspace',
]);

const ex = (inner) => `\${{ ${inner} }}`;

/** The selection, on `build-preview` alone: the build and `pnpm test` read one private look, and under `STALL_LOOKS_REQUIRED` neither can read none. */
export const SELECTION = Object.freeze({
    STALL_LOOKS_TARGET: 'preview',
    STALL_LOOKS_DIR: `${ex('github.workspace')}/looks`,
    STALL_LOOKS_REQUIRED: '1',
});

const NODE = { uses: usesOf(ACTIONS.setupNode), with: { 'node-version-file': '.nvmrc', 'package-manager-cache': 'false' } };
const CHECKOUT = { uses: usesOf(ACTIONS.checkout), with: { 'persist-credentials': 'false' } };
const CHECKOUT_HISTORY = { uses: usesOf(ACTIONS.checkout), with: { 'fetch-depth': '0', 'persist-credentials': 'false' } };
const FETCH_MAIN = { run: 'git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main' };
const COREPACK = { run: 'corepack enable && corepack prepare --activate' };
/**
 * Every pnpm install skips pnpm's hook file (`--ignore-pnpmfile`): `pnpm
 * install --ignore-scripts` still loads `.pnpmfile.cjs` (the 8c3 critic's
 * item 3, measured on pnpm 10.24.0), so where a job holds a secret its
 * installs skip both, and the build jobs skip the hook too, for one shape.
 */
const INSTALL = { run: 'pnpm install --frozen-lockfile --ignore-pnpmfile' };
const INSTALL_DEPLOY = [{ run: 'pnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile' }, { run: 'npm ci --prefix deploy --ignore-scripts --no-audit --no-fund' }];

/** The private checkout, whole: one commit of the private repository at the pin, no history, no credential left behind. */
export const PRIVATE_CHECKOUT_WITH = Object.freeze({
    repository: ex('secrets.LOOKS_REPO'),
    ref: ex('steps.pin.outputs.commit'),
    path: 'looks',
    token: ex('secrets.LOOKS_READ_TOKEN'),
    'persist-credentials': 'false',
    'fetch-depth': '1',
});

const LOOKS_ARTIFACT_PATH = `${ex('runner.temp')}/looks-artifact`;

/** Each upload, whole: kept one day, refused when empty. */
export const UPLOADS = Object.freeze({
    looks: Object.freeze({ job: 'looks', with: { name: 'looks', path: LOOKS_ARTIFACT_PATH, 'if-no-files-found': 'error', 'retention-days': '1' } }),
    'dist-preview': Object.freeze({ job: 'build-preview', with: { name: 'dist-preview', path: 'dist', 'include-hidden-files': 'true', 'if-no-files-found': 'error', 'retention-days': '1' } }),
    'dist-production': Object.freeze({ job: 'build-production', with: { name: 'dist-production', path: 'dist', 'include-hidden-files': 'true', 'if-no-files-found': 'error', 'retention-days': '1' } }),
});

/** Each download, whole: one artifact of this run, by name, by one job. */
export const DOWNLOADS = Object.freeze({
    looks: Object.freeze({ job: 'build-preview', with: { name: 'looks', path: LOOKS_ARTIFACT_PATH } }),
    'dist-preview': Object.freeze({ job: 'deploy-preview', with: { name: 'dist-preview', path: 'dist' } }),
    'dist-production': Object.freeze({ job: 'deploy-production', with: { name: 'dist-production', path: 'dist' } }),
});

const upload = (name) => ({ uses: usesOf(ACTIONS.upload), with: UPLOADS[name].with });
const download = (name) => ({ uses: usesOf(ACTIONS.download), with: DOWNLOADS[name].with });

const CLOUDFLARE_ENV = {
    CLOUDFLARE_API_TOKEN: ex('secrets.CLOUDFLARE_API_TOKEN'),
    CLOUDFLARE_ACCOUNT_ID: ex('secrets.CLOUDFLARE_ACCOUNT_ID'),
    WRANGLER_SEND_METRICS: 'false',
};

const deploySteps = (artifact, branch) => [CHECKOUT, NODE, COREPACK, ...INSTALL_DEPLOY, download(artifact), { env: CLOUDFLARE_ENV, run: deployRun(branch) }];

/**
 * Every job, whole, names aside, in order: the keys a job may have are
 * exactly these (no `container`, `services`, `strategy`, `defaults`,
 * `continue-on-error`, `outputs`, `permissions`, `uses` or `secrets`).
 */
export const JOBS = Object.freeze({
    'public-checks': {
        if: PREVIEW_IF,
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': '10',
        steps: [CHECKOUT_HISTORY, NODE, { run: PUBLIC_CHECKS_RUN }],
    },
    looks: {
        needs: 'public-checks',
        if: PREVIEW_IF,
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': '10',
        environment: 'looks',
        steps: [
            CHECKOUT,
            { id: 'pin', shell: 'bash', run: PIN_SCRIPT },
            { uses: usesOf(ACTIONS.checkout), with: PRIVATE_CHECKOUT_WITH },
            { shell: 'bash', env: { PIN: ex('steps.pin.outputs.commit'), PINNED_TREE: ex('steps.pin.outputs.tree') }, run: PACK_SCRIPT },
            upload('looks'),
        ],
    },
    'build-preview': {
        needs: 'looks',
        if: PREVIEW_IF,
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': '30',
        env: SELECTION,
        steps: [CHECKOUT_HISTORY, FETCH_MAIN, NODE, download('looks'), { run: UNWRAP_RUN }, COREPACK, INSTALL, { run: 'pnpm build' }, { run: 'pnpm test' }, upload('dist-preview')],
    },
    'deploy-preview': {
        needs: 'build-preview',
        if: PREVIEW_IF,
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': '15',
        environment: 'cloudflare',
        steps: deploySteps('dist-preview', 'preview-direct'),
    },
    'build-production': {
        if: PRODUCTION_IF,
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': '30',
        steps: [CHECKOUT_HISTORY, FETCH_MAIN, NODE, COREPACK, INSTALL, { run: 'pnpm build' }, { run: 'pnpm test' }, upload('dist-production')],
    },
    'deploy-production': {
        needs: 'build-production',
        if: PRODUCTION_IF,
        'runs-on': 'ubuntu-latest',
        'timeout-minutes': '15',
        environment: 'production',
        steps: deploySteps('dist-production', 'main'),
    },
});

/** The keys a step may carry; a step is `uses` or `run`, never both. No step-level `if`, `continue-on-error`, `working-directory` or `timeout-minutes`. */
export const STEP_KEYS = Object.freeze(['uses', 'with', 'run', 'id', 'name', 'env', 'shell']);

/** Where a secret may stand, as `job|where|key|value`, each once. */
export const SECRET_PLACES = Object.freeze(
    [
        `looks|with|repository|${ex('secrets.LOOKS_REPO')}`,
        `looks|with|token|${ex('secrets.LOOKS_READ_TOKEN')}`,
        ...['deploy-preview', 'deploy-production'].flatMap((job) => [
            `${job}|env|CLOUDFLARE_API_TOKEN|${ex('secrets.CLOUDFLARE_API_TOKEN')}`,
            `${job}|env|CLOUDFLARE_ACCOUNT_ID|${ex('secrets.CLOUDFLARE_ACCOUNT_ID')}`,
        ]),
    ].sort(),
);

/** A skip, a todo or an only in a test's source, wherever it stands (an option, a method, `t.skip()`); matches nothing in the three files today. */
export const SKIPS = /\b(skip|todo)\s*[(:]|\.only\b|[{,]\s*only\s*:/;

/** What the release rule says the day `RELEASED_LOOK_IDS` names an id. */
export const PRODUCTION_RELEASE_SENTENCE = 'a release carries a private look to production: step 9 rewrites the production road and this rule';

/** Every rule, in the order it is read; the test plants each. */
export const RULES = Object.freeze([
    'grammar',
    'top',
    'triggers',
    'jobs',
    'job-keys',
    'if',
    'needs',
    'environment',
    'runs-on',
    'timeout',
    'steps',
    'step-keys',
    'functions',
    'expressions',
    'secrets',
    'shell',
    'looks-job',
    'verbatim',
    'private-checkout',
    'selection',
    'unwrap-first',
    'production-carries-nothing',
    'deploy',
    'installs',
    'credentials',
    'artifacts',
    'concurrency',
    'actions',
    'public-checks',
]);

const KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
/** The lists whose items may be plain values: the input's choices, and a trigger's branches. */
const PLAIN_LISTS = Object.freeze(['options', 'branches']);
const FIRST = /^[A-Za-z0-9.$/_']/;
const has = (node, key) => node !== null && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, key);
const isMap = (node) => node !== null && typeof node === 'object' && !Array.isArray(node);
const newMap = () => Object.create(null);

/**
 * The tree of `text` under the closed grammar (see the module's docblock):
 * mappings as null-prototype objects in their order, lists as arrays,
 * scalars as strings (a `run: |` block as its lines and one newline, a
 * `'…'` value as what it quotes, a `uses:` value with its comment). Answers
 * `{ tree, problems }`; a problem names the line.
 */
export function parseWorkflow(text) {
    const problems = [];
    const bad = (n, why) => problems.push({ rule: 'grammar', why: `line ${n}: ${why}` });
    if (!text.endsWith('\n')) {
        bad(text.split('\n').length, 'the file does not end with a newline');
    }
    const lines = text.split('\n');
    if (lines.at(-1) === '') {
        lines.pop();
    }
    const root = newMap();
    const stack = [{ indent: 0, kind: 'map', node: root, key: undefined }];
    let pending;
    let block;

    /** A key with nothing under it is null to YAML, and admitted only as an event directly under `on:` (`pull_request:`). */
    const mayBeNull = (entry) => isMap(root.on) && entry.node === root.on;

    const endBlock = () => {
        if (block.lines.length === 0) {
            bad(block.n, 'a run block with no line in it');
        }
        block.node[block.key] = `${block.lines.join('\n')}\n`;
        block = undefined;
    };

    const plain = (value, n, key) => {
        let raw = value;
        const hash = value.indexOf(' #');
        if (hash >= 0) {
            if (key !== 'uses') {
                bad(n, `${key}: a comment after a value, which only a uses: line may carry`);
            }
            raw = value.slice(0, hash);
        }
        if (!FIRST.test(raw)) {
            bad(n, `${key}: a value that opens with ${JSON.stringify(raw[0] ?? '')} — a quote, an anchor, an alias, a tag, a flow collection, a block indicator or a space`);
            return value;
        }
        if (raw.startsWith("'")) {
            if (!/^'[A-Za-z0-9._-]*'$/.test(raw)) {
                bad(n, `${key}: a single-quoted value that is not plain letters, digits, dots, hyphens and underscores`);
            }
            return raw.slice(1, -1);
        }
        if (raw.includes('\\')) {
            bad(n, `${key}: a backslash in a value`);
        }
        if (/[{}[\]]/.test(raw.replace(/\$\{\{[^{}]*\}\}/g, ''))) {
            bad(n, `${key}: a brace or a bracket outside \${{ … }} — a flow collection`);
        }
        if (raw.includes(': ') || raw.endsWith(':')) {
            bad(n, `${key}: a colon and a space inside a value`);
        }
        return key === 'uses' ? value : raw;
    };

    const keyLine = (node, rest, indent, n) => {
        const m = /^([^:\s]+):(?: (.*))?$/.exec(rest);
        if (m === null || !KEY.test(m[1])) {
            bad(n, 'not a `key: value`, `key:` or list item line (a quoted key, a merge key, a flow collection?)');
            return;
        }
        const [, key, value] = m;
        if (has(node, key)) {
            bad(n, `${key}: a key twice in one mapping`);
        }
        if (value === undefined) {
            node[key] = null;
            pending = { node, key, indent, n };
        } else if (value === '|') {
            if (key !== 'run') {
                bad(n, `${key}: a block scalar, which only run: may carry`);
            }
            node[key] = null;
            block = { node, key, keyIndent: indent, indent: undefined, lines: [], n };
        } else {
            node[key] = plain(value, n, key);
        }
    };

    for (let i = 0; i < lines.length; i += 1) {
        const n = i + 1;
        const line = lines[i];
        if (/[^\x20-\x7e]/.test(line)) {
            bad(n, 'a character outside printable ASCII, comments included: a tab, a carriage return, a line or paragraph separator or a next-line (U+2028, U+2029, U+0085, line breaks to a YAML reader), a control, or anything above 0x7e');
            continue;
        }
        const indent = line.length - line.trimStart().length;
        if (block !== undefined) {
            if (line.trim() === '') {
                endBlock();
                continue;
            }
            if (block.indent === undefined && indent > block.keyIndent) {
                block.indent = indent;
            }
            if (block.indent !== undefined && indent >= block.indent) {
                if (line.endsWith(' ')) {
                    bad(n, 'trailing spaces');
                }
                block.lines.push(line.slice(block.indent));
                continue;
            }
            endBlock();
        }
        if (line.trim() === '') {
            continue;
        }
        if (/^ *#/.test(line)) {
            continue;
        }
        if (line.endsWith(' ')) {
            bad(n, 'trailing spaces');
        }
        const rest = line.slice(indent);
        if (pending !== undefined) {
            if (indent <= pending.indent) {
                if (!mayBeNull(pending)) {
                    bad(pending.n, `${pending.key}: a key with nothing under it`);
                }
            } else {
                const item = rest === '-' || rest.startsWith('- ');
                const child = item ? [] : newMap();
                pending.node[pending.key] = child;
                stack.push({ indent, kind: item ? 'seq' : 'map', node: child, key: pending.key });
            }
            pending = undefined;
        }
        while (stack.length > 1 && stack.at(-1).indent > indent) {
            stack.pop();
        }
        const top = stack.at(-1);
        if (top.indent !== indent) {
            bad(n, 'a line indented to no open mapping or list — a plain scalar continued, or a block scalar not under run: |');
            continue;
        }
        if (top.kind === 'seq') {
            if (!rest.startsWith('- ') || rest.slice(2).startsWith(' ')) {
                bad(n, 'a key, or an empty item, where a list item belongs');
                continue;
            }
            const item = rest.slice(2);
            if (/^[^:\s]+:(?: |$)/.test(item)) {
                const map = newMap();
                top.node.push(map);
                stack.push({ indent: indent + 2, kind: 'map', node: map, key: undefined });
                keyLine(map, item, indent + 2, n);
            } else if (PLAIN_LISTS.includes(top.key)) {
                top.node.push(plain(item, n, top.key));
            } else {
                bad(n, `a plain list item outside ${PLAIN_LISTS.join(' and ')}`);
            }
            continue;
        }
        if (rest.startsWith('-')) {
            bad(n, 'a list item, or a document marker, where a key belongs');
            continue;
        }
        keyLine(top.node, rest, indent, n);
    }
    if (block !== undefined) {
        endBlock();
    }
    if (pending !== undefined && !mayBeNull(pending)) {
        bad(pending.n, `${pending.key}: a key with nothing under it`);
    }
    return { tree: root, problems };
}

/** `node`, with every mapping's keys sorted, as JSON: a comparison that ignores key order and reads nothing else away. */
export function canon(node) {
    if (Array.isArray(node)) {
        return `[${node.map(canon).join(',')}]`;
    }
    if (isMap(node)) {
        return `{${Object.keys(node)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canon(node[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(node ?? null);
}

/**
 * Every key and every scalar under `node`, with its path: `{ path, key,
 * word, isKey }` — `word` the key itself, or the scalar's text.
 */
function scalars(node, path = []) {
    const out = [];
    if (Array.isArray(node)) {
        node.forEach((child, i) => out.push(...scalars(child, [...path, i])));
    } else if (isMap(node)) {
        for (const key of Object.keys(node)) {
            out.push({ path: [...path, key], key, word: key, isKey: true });
            out.push(...scalars(node[key], [...path, key]));
        }
    } else if (typeof node === 'string') {
        out.push({ path, key: path.at(-1), word: node, isKey: false });
    }
    return out;
}

/** A step's name or the input's description: prose a reader sees, read by no rule but the grammar and the secrets'. */
const isProse = (path) =>
    path.length === 5 && ((path[0] === 'jobs' && path[2] === 'steps' && path[4] === 'name') || (path[0] === 'on' && path[4] === 'description'));

const jobsOf = (tree) => (isMap(tree.jobs) ? tree.jobs : newMap());
const stepsOf = (job) => (isMap(job) && Array.isArray(job.steps) ? job.steps.filter(isMap) : []);
const actionOf = (step) => (typeof step.uses === 'string' ? step.uses.split('@')[0] : undefined);
const withOf = (step) => (isMap(step.with) ? step.with : newMap());
const textsOf = (node) => scalars(node).map(({ word }) => word);
const stepWithoutName = (step) => {
    const out = newMap();
    for (const key of Object.keys(step)) {
        if (key !== 'name') {
            out[key] = step[key];
        }
    }
    return out;
};
const countIn = (texts, re) => texts.reduce((sum, text) => sum + [...text.matchAll(re)].length, 0);

/**
 * The problems of the workflow `text` (see the module's docblock): the
 * grammar's, and when it parses, every rule's. `facts`: `released`
 * (`RELEASED_LOOK_IDS`) and `sources` (`{ path: text }` of every file
 * `PUBLIC_CHECK_TESTS` names).
 */
export function workflowProblems(text, { released, sources }) {
    if (!Array.isArray(released) || sources === null || typeof sources !== 'object') {
        throw new TypeError('workflowProblems reads RELEASED_LOOK_IDS (`released`) and the public checks’ sources (`sources`)');
    }
    const { tree, problems: grammar } = parseWorkflow(text);
    if (grammar.length > 0) {
        return grammar;
    }
    const problems = [];
    const add = (rule, why) => problems.push({ rule, why });
    const jobs = jobsOf(tree);
    const names = Object.keys(jobs);
    const all = scalars(tree);
    const values = all.filter((entry) => !entry.isKey);
    const inJob = (entry) => (entry.path[0] === 'jobs' ? String(entry.path[1]) : '');
    const allSteps = names.flatMap((job) => stepsOf(jobs[job]).map((step, index) => ({ job, step, index })));

    // top
    if (canon(Object.keys(tree).sort()) !== canon(['concurrency', 'jobs', 'name', 'on', 'permissions'])) {
        add('top', `the top-level keys are ${Object.keys(tree).join(', ')}, where they are name, on, permissions, concurrency and jobs (no env, no defaults, no run-name)`);
    }
    if (tree.name !== 'deploy') {
        add('top', `the workflow is named ${JSON.stringify(tree.name)}, not deploy`);
    }

    // triggers: workflow_dispatch alone, one choice input
    const on = isMap(tree.on) ? tree.on : newMap();
    const target = on.workflow_dispatch?.inputs?.target;
    const description = isMap(target) && typeof target.description === 'string' ? target.description : undefined;
    const triggers = canon({
        workflow_dispatch: { inputs: { target: { description, type: 'choice', options: ['preview', 'production'], default: 'preview' } } },
    });
    if (description === undefined || canon(on) !== triggers) {
        add('triggers', 'on: is workflow_dispatch alone, with one input, target: a choice of preview and production, preview by default — no push, no pull_request, no ref');
    }

    // jobs
    if (canon(names) !== canon(Object.keys(JOBS))) {
        add('jobs', `the jobs are ${names.join(', ')}, where they are ${Object.keys(JOBS).join(', ')}, in that order`);
    }

    for (const [name, spec] of Object.entries(JOBS)) {
        const job = jobs[name];
        if (!isMap(job)) {
            continue;
        }
        if (canon(Object.keys(job).sort()) !== canon(Object.keys(spec).sort())) {
            add('job-keys', `${name}: keys ${Object.keys(job).join(', ')}, where it has ${Object.keys(spec).join(', ')} and nothing else`);
        }
        for (const [rule, key] of [
            ['if', 'if'],
            ['needs', 'needs'],
            ['environment', 'environment'],
            ['runs-on', 'runs-on'],
            ['timeout', 'timeout-minutes'],
        ]) {
            if (job[key] !== spec[key]) {
                add(rule, `${name}: ${key} is ${JSON.stringify(job[key] ?? null)}, where it is ${JSON.stringify(spec[key] ?? null)}`);
            }
        }
        if (canon(stepsOf(job).map(stepWithoutName)) !== canon(spec.steps) || stepsOf(job).length !== (Array.isArray(job.steps) ? job.steps.length : -1)) {
            add('steps', `${name}: its steps, names aside, are not the ones this test pins`);
        }
    }

    // step-keys
    for (const { job, step, index } of allSteps) {
        const extra = Object.keys(step).filter((key) => !STEP_KEYS.includes(key));
        if (extra.length > 0 || has(step, 'uses') === has(step, 'run')) {
            add('step-keys', `${job} step ${index + 1}: keys ${Object.keys(step).join(', ')} — a step is uses or run, with ${STEP_KEYS.join(', ')} at most`);
        }
    }

    // functions: none anywhere a value is read as an expression
    for (const { path, key, word: value } of values) {
        if (isProse(path)) {
            continue;
        }
        const expressions = [...value.matchAll(/\$\{\{([^}]*)\}\}/g)].map((m) => m[1]);
        if (/\b(always|failure|cancelled|success|toJSON|fromJSON|hashFiles|format|join|contains|startsWith|endsWith)\s*\(/.test(value) || (key === 'if' && value.includes('(')) || expressions.some((inner) => inner.includes('('))) {
            add('functions', `${path.join('.')}: a function call in an expression or an if:`);
        }
    }

    // expressions: only the allowed ones, whole
    for (const { path, word: value } of values) {
        const opened = countIn([value], /\$\{\{/g);
        const whole = [...value.matchAll(/\$\{\{ ([A-Za-z0-9_.-]+) \}\}/g)].map((m) => m[1]);
        if (opened !== whole.length || whole.some((inner) => !EXPRESSIONS.includes(inner))) {
            add('expressions', `${path.join('.')}: an expression that is not one of ${EXPRESSIONS.join(', ')}`);
        }
    }

    // secrets: where they stand, each once, and the word nowhere else
    const placed = [];
    for (const entry of all) {
        if (/secrets/i.test(entry.word)) {
            const where = entry.path.includes('with') ? 'with' : entry.path.includes('env') ? 'env' : 'elsewhere';
            placed.push(`${inJob(entry)}|${where}|${entry.key}|${entry.isKey ? '' : entry.word}`);
        }
    }
    if (canon(placed.sort()) !== canon(SECRET_PLACES)) {
        add('secrets', `the secrets stand at ${placed.join('; ') || 'no place'}, where they stand at ${SECRET_PLACES.join('; ')}, each once: the read token in the private checkout, the Cloudflare pair in each deploy step`);
    }

    // shell
    const texts = values.map((entry) => entry.word);
    for (const { job, step, index } of allSteps) {
        if (typeof step.run === 'string' && step.run.includes('${{')) {
            add('shell', `${job} step ${index + 1}: an expression inside a run:, where a value reaches the shell through env:`);
        }
    }
    if (countIn(texts, /GITHUB_ENV|GITHUB_PATH/g) > 0) {
        add('shell', 'a write to GITHUB_ENV or GITHUB_PATH, which reaches every later step');
    }
    const outputs = allSteps.filter(({ step }) => typeof step.run === 'string' && step.run.includes('GITHUB_OUTPUT'));
    if (countIn(texts, /GITHUB_OUTPUT/g) !== 1 || outputs.length !== 1 || outputs[0].job !== 'looks' || outputs[0].step.id !== 'pin') {
        add('shell', 'GITHUB_OUTPUT is written once, by the looks job’s pin step');
    }
    const shells = allSteps.filter(({ step }) => has(step, 'shell'));
    const looksRuns = stepsOf(jobs.looks).filter((step) => has(step, 'run'));
    if (shells.length !== 2 || shells.some(({ job, step }) => job !== 'looks' || step.shell !== 'bash') || looksRuns.length !== 2 || looksRuns.some((step) => step.shell !== 'bash')) {
        add('shell', 'shell: bash on the looks job’s two run steps (bash --noprofile --norc -eo pipefail), and no shell: anywhere else');
    }

    // looks-job: no project code where the read token is
    for (const word of textsOf(jobs.looks)) {
        if (/\b(node|pnpm|npm|npx|corepack)\b|scripts\//.test(word)) {
            add('looks-job', `the looks job holds ${JSON.stringify(word.slice(0, 60))}: it runs two shell scripts and two actions, never project code`);
        }
    }

    // verbatim
    const pinStep = stepsOf(jobs.looks).find((step) => step.id === 'pin');
    const packStep = stepsOf(jobs.looks).find((step) => isMap(step.env) && has(step.env, 'PINNED_TREE'));
    if (pinStep?.run !== PIN_SCRIPT) {
        add('verbatim', 'the looks job’s pin step does not run PIN_SCRIPT (scripts/looks-pin.mjs) verbatim');
    }
    if (packStep?.run !== PACK_SCRIPT) {
        add('verbatim', 'the looks job’s pack step does not run PACK_SCRIPT (scripts/looks-artifact.mjs) verbatim');
    }

    // private-checkout
    const checkouts = allSteps.filter(({ step }) => actionOf(step) === ACTIONS.checkout.name);
    const privates = checkouts.filter(({ step }) => Object.keys(withOf(step)).some((key) => !['fetch-depth', 'persist-credentials'].includes(key)));
    if (privates.length !== 1 || privates[0].job !== 'looks' || canon(withOf(privates[0].step)) !== canon(PRIVATE_CHECKOUT_WITH)) {
        add('private-checkout', 'one checkout of another repository, in the looks job, exactly: the read token, the pinned commit, path looks, fetch-depth 1, no credential kept');
    }
    if (checkouts.some(({ step }) => !privates.some((p) => p.step === step) && has(withOf(step), 'fetch-depth') && withOf(step)['fetch-depth'] !== '0')) {
        add('private-checkout', 'a public checkout is whole history or default, nothing else');
    }
    if (all.filter((entry) => entry.isKey && entry.key === 'repository').length !== 1) {
        add('private-checkout', 'repository: is named once, by the private checkout');
    }

    // selection
    for (const { path, word, isKey } of all) {
        if (word.includes('STALL_LOOKS_') && !(isKey && path.length === 4 && canon(path.slice(0, 3)) === canon(['jobs', 'build-preview', 'env']))) {
            add('selection', `${path.join('.')}: the selection is named on build-preview’s job env alone, and never STALL_LOOKS_COMMIT (the carried repository holds one commit, and the build reads its HEAD)`);
        }
    }
    if (canon(jobs['build-preview']?.env) !== canon(SELECTION)) {
        add('selection', 'build-preview’s job env is the selection, exactly: STALL_LOOKS_TARGET preview, STALL_LOOKS_DIR the workspace’s looks, STALL_LOOKS_REQUIRED');
    }

    // unwrap-first
    const unwraps = allSteps.filter(({ step }) => typeof step.run === 'string' && step.run.includes('looks-artifact.mjs'));
    const preview = stepsOf(jobs['build-preview']);
    const at = (pred) => preview.findIndex(pred);
    const unwrapAt = at((step) => step.run === UNWRAP_RUN);
    const downloadAt = at((step) => actionOf(step) === ACTIONS.download.name && withOf(step).name === 'looks');
    const installAt = at((step) => typeof step.run === 'string' && /\b(corepack|pnpm|npm|npx)\b/.test(step.run));
    if (unwraps.length !== 1 || unwraps[0].job !== 'build-preview' || unwrapAt < 0 || downloadAt < 0 || installAt < 0 || !(downloadAt < unwrapAt && unwrapAt < installAt)) {
        add('unwrap-first', 'build-preview unwraps the looks artifact once, after its download and before anything is installed, and no other job unwraps');
    }

    // production-carries-nothing
    const releaseProblem = released.length === 0 ? undefined : PRODUCTION_RELEASE_SENTENCE;
    if (releaseProblem !== undefined) {
        add('production-carries-nothing', releaseProblem);
    }
    const production = jobs['build-production'];
    if (isMap(production) && (has(production, 'needs') || has(production, 'env') || has(production, 'environment'))) {
        add('production-carries-nothing', 'build-production has no needs, no env and no Environment: it reads nothing private');
    }
    for (const name of ['build-production', 'deploy-production']) {
        for (const { path, word } of all.filter((entry) => entry.path[0] === 'jobs' && entry.path[1] === name)) {
            if (isProse(path)) {
                continue;
            }
            if (/looks|STALL_LOOKS_/i.test(word)) {
                add('production-carries-nothing', `${name} names ${JSON.stringify(word.slice(0, 60))}: the production road reads nothing private until step 9`);
            }
        }
    }
    for (const { job, step } of allSteps) {
        if (actionOf(step) === ACTIONS.download.name && job !== 'build-preview' && (withOf(step).name === 'looks' || !has(withOf(step), 'name'))) {
            add('production-carries-nothing', `${job} downloads the looks artifact, which build-preview alone reads`);
        }
    }

    // deploy: each deploy job's one call whole, its other runs the installs alone, and wrangler nowhere else
    for (const [name, branch] of [
        ['deploy-preview', 'preview-direct'],
        ['deploy-production', 'main'],
    ]) {
        const steps = stepsOf(jobs[name]);
        const deploy = steps.filter((step) => isMap(step.env) && has(step.env, 'CLOUDFLARE_API_TOKEN'));
        if (deploy.length !== 1 || deploy[0].run !== deployRun(branch)) {
            add('deploy', `${name}: one deploy step, its call to --branch ${branch} exactly`);
        }
        const runs = steps.filter((step) => typeof step.run === 'string' && !deploy.includes(step)).map((step) => step.run);
        if (canon(runs) !== canon([COREPACK.run, ...INSTALL_DEPLOY.map((step) => step.run)]) || textsOf(jobs[name]).some((word) => /pnpm (build|test|run|exec)|\bnode |\bnpx /.test(word))) {
            add('deploy', `${name}: runs corepack and the two installs that skip every package script and pnpm's hook, then wrangler, and no project code`);
        }
    }
    for (const name of names.filter((job) => !job.startsWith('deploy-'))) {
        if (textsOf(jobs[name]).some((word) => word.includes('wrangler'))) {
            add('deploy', `${name}: wrangler outside the deploy jobs`);
        }
    }

    // installs: every pnpm call skips pnpm's hook file; in a job that holds a secret, every pnpm and npm call skips package scripts too
    for (const { job, step, index } of allSteps) {
        if (typeof step.run !== 'string') {
            continue;
        }
        const keyed = has(jobs[job], 'environment');
        for (const line of step.run.split('\n')) {
            if (/\bpnpm\b/.test(line) && (keyed || /\bpnpm\s+(install|i|add)\b/.test(line)) && !line.includes('--ignore-pnpmfile')) {
                add('installs', `${job} step ${index + 1}: a pnpm install, or any pnpm call in a job that holds a secret, without --ignore-pnpmfile (pnpm loads .pnpmfile.cjs whatever --ignore-scripts says)`);
            }
            if (keyed && /\b(pnpm|npm)\b/.test(line) && !line.includes('--ignore-scripts')) {
                add('installs', `${job} step ${index + 1}: a pnpm or npm call in a job that holds a secret, without --ignore-scripts`);
            }
        }
    }

    // credentials
    for (const { job, step, index } of checkouts) {
        if (withOf(step)['persist-credentials'] !== 'false') {
            add('credentials', `${job} step ${index + 1}: a checkout keeps no credential (persist-credentials: false)`);
        }
    }
    if (canon(tree.permissions) !== canon({ contents: 'read' })) {
        add('credentials', 'permissions: contents: read, at the top, and nothing more');
    }
    for (const name of names) {
        if (has(jobs[name], 'permissions')) {
            add('credentials', `${name}: a job widens its permissions`);
        }
    }

    // artifacts
    for (const [table, action, verb] of [
        [UPLOADS, ACTIONS.upload.name, 'uploads'],
        [DOWNLOADS, ACTIONS.download.name, 'downloads'],
    ]) {
        const found = allSteps.filter(({ step }) => actionOf(step) === action);
        const seen = found.map(({ job, step }) => `${job}|${canon(withOf(step))}`).sort();
        const want = Object.values(table).map((entry) => `${entry.job}|${canon(entry.with)}`).sort();
        if (canon(seen) !== canon(want)) {
            add('artifacts', `${verb}: each artifact once, by name, whole — looks by build-preview alone, each dist by its own deploy job, one day each, nothing from another run`);
        }
    }

    // concurrency
    if (canon(tree.concurrency) !== canon({ group: 'deploy', 'cancel-in-progress': 'false' })) {
        add('concurrency', 'concurrency: group deploy, cancel-in-progress false');
    }

    // actions
    for (const { job, step, index } of allSteps.filter(({ step }) => has(step, 'uses'))) {
        const m = PINNED_USES.exec(step.uses);
        const known = Object.values(ACTIONS).find((action) => action.name === m?.[1]);
        if (m === null) {
            add('actions', `${job} step ${index + 1}: ${JSON.stringify(step.uses)} is not an action at a full 40-hex commit with its version as a comment`);
        } else if (known === undefined || known.sha !== m[2] || known.version !== m[3]) {
            add('actions', `${job} step ${index + 1}: ${m[1]}@${m[2].slice(0, 12)} ${m[3]} is not one of the four pinned actions at its pinned commit`);
        }
    }
    for (const [name, spec] of Object.entries(JOBS)) {
        const want = spec.steps.filter((step) => has(step, 'uses')).map((step) => step.uses);
        const seen = stepsOf(jobs[name])
            .filter((step) => has(step, 'uses'))
            .map((step) => step.uses);
        if (isMap(jobs[name]) && canon(seen) !== canon(want)) {
            add('actions', `${name}: uses ${seen.map((uses) => uses.split('@')[0]).join(', ')}, where it uses ${want.map((uses) => uses.split('@')[0]).join(', ')}`);
        }
    }

    // public-checks
    const checks = stepsOf(jobs['public-checks']).filter((step) => has(step, 'run'));
    if (checks.length !== 1 || checks[0].run !== PUBLIC_CHECKS_RUN) {
        add('public-checks', `public-checks runs ${PUBLIC_CHECKS_RUN}, whole files, nothing else`);
    }
    if (jobs.looks?.needs !== 'public-checks') {
        add('public-checks', 'the looks job waits for public-checks: the canary’s bytes and this file are proved before the token is used');
    }
    for (const [path, suites] of Object.entries(PUBLIC_CHECK_TESTS)) {
        const source = Object.prototype.hasOwnProperty.call(sources, path) ? sources[path] : undefined;
        if (typeof source !== 'string') {
            add('public-checks', `${path}: public-checks runs it, and it was not read`);
            continue;
        }
        for (const suite of suites) {
            if (!source.includes(`\ndescribe('${suite}', () => {\n`)) {
                add('public-checks', `${path}: holds no describe('${suite}'), which public-checks runs it for`);
            }
        }
        // A static read: it sees `.skip(`, `{ timeout, skip: … }`, `t.skip()`, a todo and an only, and cannot see an early `return` (the 8c3 critic's item 4).
        if (SKIPS.test(source)) {
            add('public-checks', `${path}: a skipped, only or todo test in a file public-checks runs`);
        }
    }

    return problems;
}

/** `env` for a git read: no global or system config, no location inherited. */
function gitEnv(env = process.env) {
    const clean = { ...env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
    for (const name of GIT_LOCATION_VARS) {
        delete clean[name];
    }
    return clean;
}

/** The paths git tracks under `root` (`git ls-files -z`, the index), relative to it, sorted; `under` narrows them to one directory. */
export function trackedPathsAt(root, { under, git = 'git', env } = {}) {
    const out = execFileSync(git, ['-C', root, 'ls-files', '-z', '--', ...(under === undefined ? [] : [under])], {
        env: gitEnv(env),
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.split('\0').filter((path) => path !== '').sort();
}

/** The workflow files GitHub may run: `.github/workflows/`, and nothing else in the repository. */
export const WORKFLOW_DIR = '.github/workflows';
export const WORKFLOW_FILES = Object.freeze(['ci.yml', 'deploy.yml']);

/**
 * What `.github/workflows/` holds under `root`, as git tracks it and as the
 * disk holds it, each relative to that directory and sorted — the disk read
 * with `lstat`, a directory walked, a link listed by name and never
 * followed.
 */
export function workflowFilesAt(root, { git, env } = {}) {
    const tracked = trackedPathsAt(root, { under: WORKFLOW_DIR, git, env }).map((path) => path.slice(WORKFLOW_DIR.length + 1));
    const disk = [];
    const walk = (dir, prefix) => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            if (lstatSync(path).isDirectory()) {
                walk(path, `${prefix}${name}/`);
            } else {
                disk.push(`${prefix}${name}`);
            }
        }
    };
    walk(join(root, WORKFLOW_DIR), '');
    return { tracked, disk: disk.sort() };
}

/**
 * Rule `workflow-files`: `.github/workflows/` holds `ci.yml` and
 * `deploy.yml` and nothing else, tracked and on the disk (the 8c3 critic's
 * item 2). An Environment's branch rule admits every workflow file whose
 * run is on `main`, whatever its trigger, so a third file — `on: push`,
 * `environment: looks` — would read the private repository's token with no
 * dispatch at all, and this test reads only the two it knows.
 */
export function workflowFilesProblems({ tracked, disk }) {
    const problems = [];
    const add = (rule, why) => problems.push({ rule, why });
    for (const [what, list] of [
        ['tracks', tracked],
        ['holds on the disk', disk],
    ]) {
        if (canon([...list].sort()) !== canon(WORKFLOW_FILES)) {
            add('workflow-files', `${WORKFLOW_DIR} ${what} ${list.join(', ') || 'nothing'}, where it holds ${WORKFLOW_FILES.join(' and ')} alone: an Environment answers any workflow file on main`);
        }
    }
    return problems;
}

/** The triggers `ci.yml` may answer: never `pull_request_target`, `workflow_run` or `workflow_call`, which run with the repository's keys. */
export const CI_TRIGGERS = Object.freeze(['push', 'pull_request', 'workflow_dispatch']);

/** Every rule `ciProblems` reads, in order; the test plants each. */
export const CI_RULES = Object.freeze(['grammar', 'ci-triggers', 'ci-environment', 'ci-secrets', 'ci-permissions', 'ci-installs']);

/**
 * The problems of `ci.yml`'s `text` (the 8c3 critic's item 2): read under
 * the same closed grammar as `deploy.yml` (so a line break hidden in a
 * comment, an escape or an alias is refused there too), then four rules —
 * it answers `push`, `pull_request` and `workflow_dispatch` alone
 * (`ci-triggers`), names no Environment (`ci-environment`), names no
 * secret, as a key or in any value (`ci-secrets`: `secrets.X`,
 * `secrets: inherit`, `toJSON(secrets)`), and its token reads the
 * repository and nothing more (`ci-permissions`: `contents: read` at the
 * top, no job widening it); and its installs skip pnpm's hook file, as the
 * deploy road's do (`ci-installs`). Not pinned whole, on purpose: the keys reach a
 * workflow through an Environment, a secret or the token's permissions,
 * each refused here, and a step that holds none of them holds nothing a
 * test of keys must guard; pinning its steps would make every CI edit a
 * test edit.
 */
export function ciProblems(text) {
    const { tree, problems: grammar } = parseWorkflow(text);
    if (grammar.length > 0) {
        return grammar;
    }
    const problems = [];
    const add = (rule, why) => problems.push({ rule, why });
    const triggers = isMap(tree.on) ? Object.keys(tree.on) : [];
    if (triggers.length === 0 || triggers.some((name) => !CI_TRIGGERS.includes(name))) {
        add('ci-triggers', `ci.yml answers ${triggers.join(', ') || 'no trigger it names as a mapping'}, where it answers ${CI_TRIGGERS.join(', ')} and nothing else`);
    }
    const all = scalars(tree);
    if (all.some((entry) => entry.isKey && entry.key === 'environment')) {
        add('ci-environment', 'ci.yml names an Environment: the deploy keys live in Environments, and ci.yml runs on every push to main');
    }
    for (const { path, word } of all) {
        if (/secrets/i.test(word)) {
            add('ci-secrets', `ci.yml names a secret at ${path.join('.')}`);
        }
    }
    const widened = all.filter((entry) => entry.isKey && entry.key === 'permissions' && entry.path.length !== 1);
    if (canon(tree.permissions) !== canon({ contents: 'read' }) || widened.length > 0) {
        add('ci-permissions', 'ci.yml: permissions: contents: read at the top, and no job naming its own');
    }
    for (const { path, word, isKey } of all) {
        if (!isKey && path.at(-1) === 'run' && word.split('\n').some((line) => /\bpnpm\s+(install|i|add)\b/.test(line) && !line.includes('--ignore-pnpmfile'))) {
            add('ci-installs', `ci.yml ${path.join('.')}: a pnpm install without --ignore-pnpmfile, which the deploy road's installs carry`);
        }
    }
    return problems;
}

/** What corepack runs as pnpm: this version, and from the day the window adds it, this hash (`PNPM_PACKAGE_MANAGER_SHA512`). */
export const PNPM_PACKAGE_MANAGER = 'pnpm@10.24.0';

/**
 * The sha512 of `PNPM_PACKAGE_MANAGER`'s tarball, as corepack writes it
 * after `+sha512.` (128 lower-case hex), or undefined. Undefined today: the
 * hash needs one registry lookup, which waits for the owner's yes. While it
 * is undefined `packageManager` is the version alone or the version with any
 * such hash (corepack refuses a hash that does not match what it fetched);
 * once it is set, the hash is required and must be this one.
 */
export const PNPM_PACKAGE_MANAGER_SHA512 = undefined;

/** Every rule `pnpmHookProblems` reads; the test plants each. */
export const HOOK_RULES = Object.freeze(['hook-file', 'hook-settings', 'package-manager']);

/** A tracked file pnpm would load as a hook, by its name: `.pnpmfile.cjs`, `.pnpmfile.mjs`, `pnpmfile.js` and the like. */
const HOOK_FILE = /^\.?pnpmfile(\.|$)/i;

/** A file that can name a hook or a config dependency for pnpm or npm. */
const SETTINGS_FILE = /^(\.npmrc|pnpm-workspace\.ya?ml|package\.json)$/;

/** A setting that loads code into pnpm: `pnpmfile`, `globalPnpmfile` (`global-pnpmfile`), `configDependencies` (`config-dependencies`). */
const HOOK_SETTING = /pnpmfile|config-?dependencies/i;

const basename = (path) => path.slice(path.lastIndexOf('/') + 1);

/**
 * The problems of the tracked tree for pnpm's hooks (the 8c3 critic's item
 * 3): `paths` the tracked paths, `read(path)` a tracked file's text,
 * `sha512` the hash `packageManager` must carry (`PNPM_PACKAGE_MANAGER_SHA512`
 * by default). Rule `hook-file`: no tracked file pnpm would load as a hook,
 * at any depth. Rule `hook-settings`: no tracked `.npmrc`,
 * `pnpm-workspace.yaml` or `package.json` names `pnpmfile`,
 * `globalPnpmfile` or `configDependencies` (a config dependency is
 * installed before the hook check, and its own pnpmfile joins it). Rule
 * `package-manager`: the root `package.json`'s `packageManager` is
 * `PNPM_PACKAGE_MANAGER`, with its hash once one is pinned, and no other
 * tracked `package.json` names one — corepack runs it as pnpm before any
 * install.
 */
export function pnpmHookProblems({ paths, read, sha512 = PNPM_PACKAGE_MANAGER_SHA512 }) {
    const problems = [];
    const add = (rule, why) => problems.push({ rule, why });
    for (const path of paths) {
        const name = basename(path);
        if (HOOK_FILE.test(name)) {
            add('hook-file', `${path}: a file pnpm would load as a hook`);
        }
        if (SETTINGS_FILE.test(name) && HOOK_SETTING.test(read(path))) {
            add('hook-settings', `${path}: names pnpmfile, globalPnpmfile or configDependencies, which load code into pnpm whatever --ignore-scripts says`);
        }
    }
    const escaped = PNPM_PACKAGE_MANAGER.replace(/[.+]/g, '\\$&');
    const want = sha512 === undefined ? new RegExp(`^${escaped}(\\+sha512\\.[0-9a-f]{128})?$`) : new RegExp(`^${escaped}\\+sha512\\.${sha512}$`);
    for (const path of paths.filter((path) => basename(path) === 'package.json')) {
        let field;
        try {
            field = JSON.parse(read(path)).packageManager;
        } catch {
            field = null;
        }
        if (path === 'package.json' ? typeof field !== 'string' || !want.test(field) : field !== undefined) {
            add('package-manager', `${path}: packageManager is ${JSON.stringify(field)}, where the root's is ${PNPM_PACKAGE_MANAGER}${sha512 === undefined ? ' (a +sha512 hash beside it accepted)' : ` with its pinned hash`} and no other package.json names one`);
        }
    }
    if (!paths.includes('package.json')) {
        add('package-manager', 'no package.json is tracked at the root');
    }
    return problems;
}

/** Where wrangler's lockfile may fetch from. */
export const NPM_REGISTRY = 'https://registry.npmjs.org/';

/** Every rule `wranglerProblems` reads; the test plants each. */
export const WRANGLER_RULES = Object.freeze(['wrangler-pin', 'wrangler-root', 'wrangler-registry', 'wrangler-integrity', 'npmrc']);

/**
 * The problems of wrangler's install, the one package that runs holding a
 * Cloudflare token: `pkg` and `lock` `deploy/`'s `package.json` and
 * `package-lock.json`, `rootPkg` the root `package.json`, `rootNames` and
 * `deployNames` the names at the root and in `deploy/` on the disk,
 * `tracked` the paths git tracks.
 * `wrangler-pin`: pinned exactly, and the lockfile's the same version.
 * `wrangler-root`: never in the root's dependencies, no wrangler config at
 * the root to steer it. `wrangler-registry` and `wrangler-integrity` (the
 * 8c3 critic's item 5): every package of the lockfile (its root aside)
 * resolves under `NPM_REGISTRY` and carries a sha512 integrity — `npm ci`
 * fetches from `resolved`. `npmrc` (the 8c3 critic's re-review, item 8):
 * no tracked `.npmrc` anywhere in the repository, and none in `deploy/` on
 * the disk — a root one is read by `npm ci --prefix deploy` run from the
 * root and by pnpm, and could carry `node-options` or a registry, which no
 * key-specific rule reads.
 */
export function wranglerProblems({ pkg, lock, rootPkg, rootNames, deployNames, tracked }) {
    const problems = [];
    const add = (rule, why) => problems.push({ rule, why });
    const version = pkg?.devDependencies?.wrangler;
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version) || lock?.packages?.['node_modules/wrangler']?.version !== version) {
        add('wrangler-pin', `wrangler is ${JSON.stringify(version)} in deploy/package.json and ${JSON.stringify(lock?.packages?.['node_modules/wrangler']?.version)} in its lockfile, where it is one exact version in both`);
    }
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
        if (rootPkg?.[field]?.wrangler !== undefined) {
            add('wrangler-root', `wrangler in the root package.json's ${field}`);
        }
    }
    for (const name of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) {
        if (rootNames.includes(name)) {
            add('wrangler-root', `${name} at the root`);
        }
    }
    const entries = Object.entries(isMap(Object.assign(newMap(), lock?.packages)) ? (lock?.packages ?? {}) : {}).filter(([key]) => key !== '');
    if (entries.length === 0) {
        add('wrangler-registry', 'deploy/package-lock.json lists no package');
    }
    for (const [key, entry] of entries) {
        if (typeof entry?.resolved !== 'string' || !entry.resolved.startsWith(NPM_REGISTRY)) {
            add('wrangler-registry', `${key} resolves to ${JSON.stringify(entry?.resolved)}, outside ${NPM_REGISTRY}`);
        }
        if (typeof entry?.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity)) {
            add('wrangler-integrity', `${key} carries no sha512 integrity`);
        }
    }
    for (const path of [...tracked.filter((path) => basename(path) === '.npmrc'), ...(deployNames.includes('.npmrc') ? ['deploy/.npmrc (on the disk)'] : [])]) {
        add('npmrc', `${path}: an .npmrc, which could steer npm ci or pnpm install (node-options, a registry)`);
    }
    return problems;
}
