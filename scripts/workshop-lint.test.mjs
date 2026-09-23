import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
    lintSheet,
    lookRules,
    rescopeSheet,
    selectorEscape,
    sheetHasRules,
    urlProblem,
} from './workshop-css.mjs';

/**
 * The workshop's static lint (`pnpm workshop:lint`) and the starter's
 * re-scoping, over strings shaped like a look sheet.
 *
 * `node --test` rather than vitest, like `notices.test.mjs` beside it: a
 * TypeScript test importing this `.mjs` breaks `pnpm build`'s `tsc`
 * (TS7016). The starter over the REAL shipped sheets, through the command a
 * creator runs, is `the-starter-is-each-shipped-look-rescoped` in vitest.
 */

const REDUCE = '\n@media (prefers-reduced-motion: reduce) {\n}\n';
const sheet = (body) => `${body}${REDUCE}`;

describe('workshop-lint', () => {
    it('passes the committed skeleton and a scoped sheet', () => {
        assert.deepEqual(lintSheet(readFileSync('workshop/theme-workshop.css', 'utf8')), []);
        assert.deepEqual(
            lintSheet(
                sheet(
                    '.t-workshop .item { color: red; }\n' +
                        '.stall.t-workshop.broadcast .plate { border: 0; }\n' +
                        'html.bc-clear .t-workshop .bc { background: none; }\n' +
                        '.t-workshop .tab + .tab { margin: 0; }\n' +
                        '.t-workshop .items .item:nth-child(3n + 1) { rotate: 1deg; }\n' +
                        '.t-workshop > .x, .t-workshop::before { content: "a { b"; }\n' +
                        '@media (min-width: 680px) { .t-workshop .x { gap: 2px; } }\n' +
                        '@keyframes wk-sway { from { rotate: 0deg; } to { rotate: 2deg; } }\n' +
                        '.t-workshop .y { background: url(art/kite.svg); }\n' +
                        ".t-workshop .z { background: url('../workshop/art/a.svg'), url(#clip); }\n" +
                        '/* url(https://example.com) in a comment is prose */\n',
                ),
            ),
            [],
        );
    });

    it('refuses a selector that escapes .t-workshop', () => {
        assert.match(selectorEscape('.item'), /not under/);
        assert.match(selectorEscape(':root'), /not under/);
        assert.match(selectorEscape('.t-workshopx .a'), /not under/);
        assert.match(selectorEscape(':not(.t-workshop) .a'), /not under/);
        assert.match(selectorEscape(':is(.t-workshop, .b) .a'), /not under/);
        assert.match(selectorEscape('[class~="t-workshop"] .a'), /not under/);
        assert.match(selectorEscape('.t-workshop + .x'), /sibling/);
        assert.match(selectorEscape('.t-workshop ~ .x'), /sibling/);
        assert.equal(selectorEscape('.t-workshop .a + .b'), undefined);
        assert.equal(selectorEscape('.t-workshop'), undefined);
        const problems = lintSheet(sheet('.t-workshop .a, .b { color: red; }\n'));
        assert.equal(problems.length, 1);
        assert.match(problems[0], /line 1: "\.b" is not under \.t-workshop/);
    });

    it('refuses @import, @font-face and every at-rule it does not read', () => {
        for (const [body, word] of [
            ['@import url(other.css);\n', '@import'],
            ["@import 'other.css';\n", '@import'],
            ['@font-face { font-family: X; src: url(x.woff2); }\n', '@font-face'],
            ['@layer kit { .t-workshop .a { color: red; } }\n', '@layer'],
            ['@property --x { syntax: "<length>"; inherits: false; initial-value: 0px; }\n', '@property'],
        ]) {
            const problems = lintSheet(sheet(body));
            assert.ok(problems.some((p) => p.includes(word)), `${word}: ${problems.join(' | ')}`);
        }
    });

    it('refuses data:, remote, absolute and escaped URLs', () => {
        for (const target of [
            'data:image/svg+xml,<svg/>',
            'http://example.com/a.png',
            'https://example.com/a.png',
            '//example.com/a.png',
            '/assets/a.png',
            'javascript:alert(1)',
            'h\\74tp://example.com',
        ]) {
            assert.notEqual(urlProblem(target), undefined, target);
            const problems = lintSheet(sheet(`.t-workshop .a { background: url("${target}"); }\n`));
            assert.ok(problems.some((p) => p.includes('url')), `${target}: ${problems.join(' | ')}`);
        }
        const set = lintSheet(
            sheet('.t-workshop .a { background: image-set("https://example.com/a.png" 1x); }\n'),
        );
        assert.equal(set.length, 1, set.join(' | '));
        // An escape spelling `url(` outside a string.
        const escaped = lintSheet(sheet('.t-workshop .a { background: \\75rl(x.png); }\n'));
        assert.ok(escaped.some((p) => p.includes('escape')), escaped.join(' | '));
        assert.equal(urlProblem('art/kite.svg'), undefined);
    });

    it('refuses keyframes not named wk-', () => {
        const problems = lintSheet(sheet('@keyframes sway { to { rotate: 1deg; } }\n'));
        assert.equal(problems.length, 1);
        assert.match(problems[0], /"sway" must be named wk-/);
        // Inside a grouping rule too.
        assert.equal(
            lintSheet(sheet('@media (min-width: 1px) { @keyframes t-neo-cur { to { opacity: 0; } } }\n')).length,
            1,
        );
    });

    it('refuses a sheet whose last rule is not the reduce block', () => {
        const after = lintSheet(`${REDUCE}.t-workshop .a { animation: wk-sway 1s infinite; }\n`);
        assert.ok(after.some((p) => p.includes('last rule')), after.join(' | '));
        const none = lintSheet('.t-workshop .a { color: red; }\n');
        assert.ok(none.some((p) => p.includes('last rule')), none.join(' | '));
    });

    it('refuses nested rules and unbalanced braces rather than guessing', () => {
        assert.ok(lintSheet(sheet('.t-workshop { .a { color: red; } }\n')).some((p) => p.includes('nested')));
        assert.ok(lintSheet(sheet('.t-workshop .a { color: red;\n')).length > 0);
        assert.ok(lintSheet(sheet('.t-workshop .a { color: red; } }\n')).some((p) => p.includes('no block')));
    });
});

describe('workshop-start-refuses-a-sheet-with-rules', () => {
    it('reads the skeleton as empty and anything else as written in', () => {
        assert.equal(sheetHasRules(readFileSync('workshop/theme-workshop.css', 'utf8')), false);
        assert.equal(sheetHasRules('/* only a comment */\n'), false);
        assert.equal(sheetHasRules(REDUCE), false);
        assert.equal(sheetHasRules(sheet('.t-workshop .a { color: red; }\n')), true);
        assert.equal(sheetHasRules('@media (prefers-reduced-motion: reduce) { .t-workshop .a { animation: none; } }'), true);
        assert.equal(sheetHasRules('.t-workshop .a { color: red;'), true, 'an unreadable sheet is kept');
    });
});

describe('workshop-starter-rescoping', () => {
    it('re-scopes a look, renames its keyframes and rebases its art', () => {
        const css =
            '@keyframes t-neo-cur { to { opacity: 0; } }\n' +
            '.t-neo .item, .t-neo-x .y { animation: t-neo-cur 1s; background: url(decor/rain.svg); }\n' +
            REDUCE;
        const out = rescopeSheet(css, 'neo');
        assert.doesNotMatch(out, /\.t-neo(?![\w-])/);
        assert.match(out, /@keyframes wk-cur/);
        assert.match(out, /animation: wk-cur 1s/);
        assert.match(out, /url\(\.\.\/src\/ui\/decor\/rain\.svg\)/);
        // A class that only starts with the look's name is not the look's class.
        assert.match(out, /\.t-neo-x \.y/);
    });

    it('carries another sheet’s rules for the look, cut to the look’s selectors, before the reduce block', () => {
        const other =
            '.stall.broadcast .plate { color: red; }\n' +
            '.stall.t-neo.broadcast .plate, .stall.t-rural.broadcast .plate { border: 0; }\n';
        assert.deepEqual(lookRules(other, 'neo'), ['.stall.t-neo.broadcast .plate { border: 0; }']);
        const out = rescopeSheet(`.t-neo .a { color: red; }\n${REDUCE}`, 'neo', [{ from: 'x.css', css: other }]);
        assert.match(out, /\.stall\.t-workshop\.broadcast \.plate \{ border: 0; \}/);
        assert.ok(out.indexOf('Carried from x.css') < out.indexOf('@media (prefers-reduced-motion'));
        assert.deepEqual(lintSheet(out), []);
    });
});
