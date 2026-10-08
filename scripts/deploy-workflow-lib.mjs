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
 *    be read without a parser: every line is a comment, blank, `key:
 *    value`, `key:`, `- key: value`, `- key:`, `- value` (under `options:`
 *    alone) or a line of a `run: |` block. Refused: a value that opens with
 *    a quote (but a whole `'…'` of plain characters), an anchor, an alias, a
 *    tag, a flow collection, a block or folding indicator, `-`, `?`, `@` or a
 *    space; a backslash; `{` `}` `[` `]` outside `${{ … }}`; `: ` inside a
 *    value; a comment after a value but on `uses:`; a quoted key, a merge
 *    key, a key twice in one mapping, a key with nothing under it; a line
 *    more indented than its mapping that is not a `run: |` line (a plain
 *    scalar continued); a list item at its key's own indentation; any block
 *    scalar but `run: |` (no `>`, `|-`, `|+`, indentation indicator); a
 *    blank line inside a `run: |` block (which ends it, so the lines after
 *    are refused); a tab, a CR, trailing spaces, a document marker, and a
 *    character outside printable ASCII on any line but a comment. A file
 *    that does not parse is read by no rule. **Cost, stated**: a shape
 *    GitHub accepts and the grammar does not fails the test (fail closed);
 *    a YAML feature the grammar admits but GitHub reads differently is the
 *    residual risk — the 8c critic's list (escapes, anchors, merge keys,
 *    flow collections, quoted keys, continued scalars, duplicate keys) is
 *    each refused.
 * 2. **The rules** (`RULES`), over the tree the grammar built. Every job's
 *    `if:`, `needs:`, Environment, runner, timeout and steps are pinned
 *    whole (`JOBS`, names aside); beside that whole pin, each property a
 *    key depends on is its own rule, so a rule weakened turns its own plant
 *    green and the suite red — the secrets and where they stand, the
 *    expressions, the shell, the `looks` job running no project code, the
 *    two scripts verbatim, the private checkout, the selection, the unwrap
 *    before the install, the production road reading nothing private, the
 *    deploy calls, the credentials, the artifacts, the queue and every
 *    action by commit. `scripts/deploy-workflow.test.mjs` plants every rule
 *    and every refused shape.
 *
 * Pure: the caller hands in `released` (`RELEASED_LOOK_IDS`, read by type
 * stripping) and `sources` (the test files `public-checks` runs, by path).
 * Node built-ins only, with the two scripts the `looks` job runs imported
 * from their modules, so `public-checks` runs it with nothing installed.
 */
import { PACK_SCRIPT, PIN_SCRIPT } from './looks-artifact.mjs';

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
const INSTALL = { run: 'pnpm install --frozen-lockfile' };
const INSTALL_DEPLOY = [{ run: 'pnpm install --frozen-lockfile --ignore-scripts' }, { run: 'npm ci --prefix deploy --ignore-scripts --no-audit --no-fund' }];

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
    'credentials',
    'artifacts',
    'concurrency',
    'actions',
    'public-checks',
]);

const KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
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
        if (line.includes('\r') || line.includes('\t')) {
            bad(n, 'a carriage return or a tab');
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
                if (/[^\x20-\x7e]/.test(line)) {
                    bad(n, 'a character outside printable ASCII in a run block');
                }
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
        if (/[^\x20-\x7e]/.test(line)) {
            bad(n, 'a character outside printable ASCII outside a comment');
            continue;
        }
        if (line.endsWith(' ')) {
            bad(n, 'trailing spaces');
        }
        const rest = line.slice(indent);
        if (pending !== undefined) {
            if (indent <= pending.indent) {
                bad(pending.n, `${pending.key}: a key with nothing under it`);
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
            } else if (top.key === 'options') {
                top.node.push(plain(item, n, 'options'));
            } else {
                bad(n, 'a plain list item outside options:');
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
    if (pending !== undefined) {
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
            add('deploy', `${name}: runs corepack and the two installs that skip every package script, then wrangler, and no project code`);
        }
    }
    for (const name of names.filter((job) => !job.startsWith('deploy-'))) {
        if (textsOf(jobs[name]).some((word) => word.includes('wrangler'))) {
            add('deploy', `${name}: wrangler outside the deploy jobs`);
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
        if (/\b(describe|it|test)\.(skip|only|todo)\(|\{\s*(skip|only|todo)\s*:/.test(source)) {
            add('public-checks', `${path}: a skipped, only or todo test in a file public-checks runs`);
        }
    }

    return problems;
}
