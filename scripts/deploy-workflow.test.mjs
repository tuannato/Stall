import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * `the-deploy-workflow-is-a-hand-run-preview`: `.github/workflows/deploy.yml`
 * holds the Cloudflare token, an account-wide key to production, so its
 * shape is a rule and not a style (step 7B-1):
 * - run by hand alone, from `main` — a `push` trigger would deploy on the
 *   push that lands the file, and a `pull_request` trigger runs code that is
 *   not this repository's;
 * - preview only: exactly one `wrangler pages deploy`, exactly one
 *   `--branch`, and it is `preview-direct` — a call with no `--branch` takes
 *   the branch from git and deploys `main` to production;
 * - the secrets reach only the deploy job, which gets them from the
 *   `cloudflare` Environment and runs no project code: its installs skip
 *   every package script, and the build, the tests and every script run in
 *   the other job, which has no secret;
 * - nothing writes `$GITHUB_ENV` or `$GITHUB_PATH`, no checkout keeps a
 *   credential, no job widens the read-only permission;
 * - wrangler comes from `deploy/`'s own pinned lockfile and never from the
 *   app's install, and no wrangler config sits at the root to steer it.
 *
 * Read as text on purpose: no YAML parser is a dependency here. Comment
 * lines are dropped first, so prose cannot satisfy a rule.
 */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8');
const CODE = TEXT.split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');

const count = (re) => [...CODE.matchAll(re)].length;

/** The text of one top-level block (`on`, `jobs`, …) up to the next one. */
function block(name) {
    const m = CODE.match(new RegExp(`^${name}:\\n((?:[ \\t].*\\n|\\n)*)`, 'm'));
    assert.ok(m, `deploy.yml has a top-level ${name}: block`);
    return m[1];
}

/** Each job's text, keyed by its name. */
function jobs() {
    const out = {};
    for (const part of block('jobs').split(/\n(?= {2}[a-z_-]+:\n)/)) {
        const m = part.match(/^\n?\s{2}([a-z_-]+):\n/);
        if (m) out[m[1]] = part;
    }
    return out;
}

const DEPLOY_CALL =
    'deploy/node_modules/.bin/wrangler pages deploy dist --project-name stall --branch preview-direct --commit-hash "$GITHUB_SHA" --commit-dirty=false';

describe('the-deploy-workflow-is-a-hand-run-preview', () => {
    it('is started by hand and by nothing else, and only from main', () => {
        const triggers = [...block('on').matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]);
        assert.deepEqual(triggers, ['workflow_dispatch']);
        const all = jobs();
        assert.deepEqual(Object.keys(all), ['build', 'deploy']);
        for (const [name, job] of Object.entries(all)) {
            assert.match(job, /^ {4}if: github\.ref == 'refs\/heads\/main'$/m, `${name} runs from main alone`);
        }
    });

    it('deploys once, to the preview branch, with the pinned call', () => {
        assert.equal(count(/wrangler pages deploy\b/g), 1);
        assert.equal(count(/--branch\b/g), 1);
        assert.ok(CODE.includes(DEPLOY_CALL), 'the deploy call is the pinned one');
        assert.equal(count(/wrangler\b/g), 2, 'one existence check and one deploy');
        assert.doesNotMatch(CODE, /production/);
    });

    it('gives the secrets to the deploy job alone, through its Environment', () => {
        const { build, deploy } = jobs();
        assert.doesNotMatch(build, /secrets|environment:/);
        assert.match(deploy, /^ {4}environment: cloudflare$/m);
        assert.match(deploy, /^ {4}needs: build$/m);
        assert.deepEqual(
            [...CODE.matchAll(/secrets/g)].length,
            2,
            'the word appears exactly twice',
        );
        assert.deepEqual(
            [...CODE.matchAll(/\$\{\{ secrets\.([A-Z_]+) \}\}/g)].map((m) => m[1]).sort(),
            ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'],
        );
        assert.doesNotMatch(CODE, /toJSON|inherit|GITHUB_ENV|GITHUB_PATH/);
    });

    it('runs no project code where the secrets are', () => {
        const { build, deploy } = jobs();
        assert.match(build, /^ {6}- run: pnpm test$/m);
        const runs = [...deploy.matchAll(/^ {6}- run: (.*)$/gm)].map((m) => m[1]);
        assert.deepEqual(runs, [
            'corepack enable && corepack prepare --activate',
            'pnpm install --frozen-lockfile --ignore-scripts',
            'npm ci --prefix deploy --ignore-scripts --no-audit --no-fund',
        ]);
        assert.doesNotMatch(deploy, /pnpm (build|test|run)|node |npx /);
    });

    it('keeps no credential and widens no permission', () => {
        assert.equal(count(/uses: actions\/checkout@/g), count(/persist-credentials: false/g));
        assert.equal(count(/^\s*permissions:/gm), 1);
        assert.match(CODE, /^permissions:\n {2}contents: read\n(?! )/m);
    });

    it('takes wrangler from its own pinned package and lockfile', () => {
        const pkg = JSON.parse(readFileSync(join(ROOT, 'deploy', 'package.json'), 'utf8'));
        const lock = JSON.parse(readFileSync(join(ROOT, 'deploy', 'package-lock.json'), 'utf8'));
        const version = pkg.devDependencies?.wrangler;
        assert.match(version ?? '', /^\d+\.\d+\.\d+$/, 'wrangler is pinned exactly');
        assert.equal(lock.packages?.['node_modules/wrangler']?.version, version);
        const root = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
        for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
            assert.equal(root[field]?.wrangler, undefined, `no wrangler in the root ${field}`);
        }
        for (const name of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) {
            assert.equal(existsSync(join(ROOT, name)), false, `no ${name} at the root`);
        }
    });
});
