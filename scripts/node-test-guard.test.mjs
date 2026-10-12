import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { REGISTRARS, describeBodyProblems, nodeTestFiles, nodeTestFilesOf, nodeTestFilesOnDisk, problemLine } from './node-test-guard.mjs';

/**
 * `no-node-test-computes-in-a-describe-body`. On Node 22.22.0 a `describe`
 * callback that throws before it registers a test is a suite-level `not ok`
 * in the TAP stream and nothing more: `# fail 0`, exit status 0, the suite
 * gone (`a-describe-body-that-throws-is-not-a-failed-run-on-this-node`
 * measures it). AGENTS section 4 is about this shape: the runner's own exit
 * code and its summary line both read green. The rule and its reasons are in
 * `node-test-guard.mjs`; here it is read over every file the package's `test`
 * script runs with `node --test`, and each rule is planted.
 */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
/** `node:test` as a namespace, to read what it exports; a static namespace import is one the guard refuses. */
const nodeTest = await import('node:test');
const REPORTER = join(ROOT, 'scripts', 'node-test-reporter.mjs');

const scratch = [];
after(() => {
    for (const dir of scratch) {
        rmSync(dir, { recursive: true, force: true });
    }
});

/** The problems a describe body holds, as `file:line` lines: the plant's source is the body. */
const problemsIn = (body) => describeBodyProblems('planted.test.mjs', `import { describe, it, before } from 'node:test';\ndescribe('s', () => {\n${body}\n});\n`).problems;

describe('no-node-test-computes-in-a-describe-body', () => {
    let files;
    before(() => {
        files = nodeTestFiles(ROOT);
    });

    it("holds in every file the package's node test list names", () => {
        const found = [];
        for (const file of files) {
            const { problems } = describeBodyProblems(file, readFileSync(join(ROOT, file), 'utf8'));
            found.push(...problems);
        }
        assert.deepEqual(found.map(problemLine), [], `a describe body computes: move it into a before() hook, or to the module top\n${found.map(problemLine).join('\n')}`);
    });

    it('reads the list from package.json, finds every file, this one included, and sees a describe in each', () => {
        assert.ok(files.length >= 25, `${files.length} files`);
        assert.ok(files.includes('scripts/node-test-guard.test.mjs'), 'this guard is not in the list it reads');
        assert.ok(files.includes('worker-icons/src/index.test.ts'));
        for (const file of files) {
            assert.ok(existsSync(join(ROOT, file)), `${file} is named by the test script and is not there`);
            const text = readFileSync(join(ROOT, file), 'utf8');
            assert.ok(describeBodyProblems(file, text).describes > 0, `${file}: the guard found no describe in it`);
        }
    });

    it('finds no node:test file under scripts/ or worker-icons/ that the list does not name', () => {
        const unlisted = nodeTestFilesOnDisk(ROOT).filter((file) => !files.includes(file));
        assert.deepEqual(unlisted, [], `these import node:test and no node --test command of the test script names them, so they are never run: ${unlisted.join(', ')}`);
        assert.ok(nodeTestFilesOnDisk(ROOT).length >= files.length, 'the walk found fewer files than the script names');
        assert.ok(files.every((file) => nodeTestFilesOnDisk(ROOT).includes(file)), 'the script names a node:test file the walk does not find');
    });

    it('reads every node --test command of the script, and only those', () => {
        const script = (test) => JSON.stringify({ scripts: { test } });
        assert.deepEqual(nodeTestFilesOf(script('vitest run && node --experimental-strip-types --test a.ts b.mjs')), ['a.ts', 'b.mjs']);
        assert.deepEqual(nodeTestFilesOf(script('node --test x.mjs && node --test y.mjs')), ['x.mjs', 'y.mjs']);
        assert.deepEqual(nodeTestFilesOf(script('vitest run')), []);
        assert.throws(() => nodeTestFilesOf(JSON.stringify({ scripts: {} })), /no scripts\.test/);
    });

    it('passes what a describe body may hold', () => {
        assert.deepEqual(
            problemsIn(`
    let slot;
    let other;
    before(() => { slot = compute(); });
    const NAME = 'a' + 'b';
    const PATTERN = /x/;
    const LIST = [1, -2, 'c', ['d']];
    const OBJECT = { a: 1, 'b': 'c', 3: [true, null] };
    const TEMPLATE = \`plain\`;
    const helper = (x) => x + compute();
    function declared() { return compute(); }
    after(helper);
    it('a', () => { slot; other; });
    it(\`b \${NAME.length}\`, { timeout: 5, skip }, async () => { await compute(); });
    for (const [one, two] of CASES) {
        it(\`c \${one}\`, () => {});
        for (const item of [1, 2]) it('d', () => {});
    }
    describe('inner', () => { before(() => {}); it('e', () => {}); });
`),
            [],
        );
        assert.deepEqual(REGISTRARS, ['describe', 'suite', 'it', 'test', 'before', 'after', 'beforeEach', 'afterEach']);
    });

    for (const [name, body, why] of [
        ['a const that reads a file', "const text = readFileSync(join(ROOT, 'a'), 'utf8');", /a const that computes its value/],
        ['a const that calls a function it was handed', 'const closure = productionPackages(ROOT);', /a const that computes its value/],
        ['a const of a new Set', "const compared = new Set(['a']);", /a const that computes its value/],
        ['a const spread of another', 'const listed = { ...facts, overTarget: [4] };', /a const that computes its value/],
        ['a template with a call in it', 'const t = `a ${f()}`;', /a const that computes its value/],
        ['a destructured const', 'const { tree } = parse(TEXT);', /a const that computes its value/],
        ['a let with a value', 'let road = packedRoad();', /a let with a value/],
        ['a var', 'var x;', /a var declaration/],
        ['a bare call', 'prepare();', /a call to `prepare\(\)`/],
        ['an assignment', 'slot = compute();', /BinaryExpression expression/],
        ['an if', 'if (process.env.X) { it("a", () => {}); }', /IfStatement/],
        ['a try', 'try { compute(); } catch {}', /TryStatement/],
        ['a for over a call', 'for (const x of items()) { it("a", () => {}); }', /for\.\.\.of over something that is computed/],
        ['a for over a let a hook fills', 'let items;\nbefore(() => { items = f(); });\nfor (const x of items) { it(`a ${x}`, () => {}); }', /for\.\.\.of over `items`, a let of a describe body/],
        ['a computing statement inside a for', 'for (const x of LIST) { const y = f(x); it("a", () => {}); }', /inside a for\.\.\.of: a const that computes/],
        ['a for await', 'for await (const x of LIST) { it("a", () => {}); }', /a for await loop/],
        ['a classic for', 'for (let i = 0; i < 3; i += 1) { it("a", () => {}); }', /ForStatement/],
        ['a forEach', 'LIST.forEach((x) => it("a", () => {}));', /a call to `LIST.forEach`/],
        ['it.skip', 'it.skip("a", () => {});', /a call to `it.skip`/],
        ['describe.only', 'describe.only("a", () => {});', /a call to `describe.only`/],
        ['it.todo', 'it.todo("a");', /a call to `it.todo`/],
        ['a title that calls', 'it(titleOf(1), () => {});', /an argument of it\(\) that computes \(CallExpression\)/],
        ['a title with a conditional', 'it(`a ${n > 1 ? "s" : ""}`, () => {});', /an argument of it\(\) that computes \(TemplateExpression\)/],
        ['an option that computes', 'it("a", { skip: want() ? "x" : false }, () => {});', /an argument of it\(\) that computes \(ObjectLiteralExpression\)/],
        ['an index in a title', 'it(TITLES[0], () => {});', /an argument of it\(\) that computes \(ElementAccessExpression\)/],
        ['a hook argument that calls', 'after(remover());', /an argument of after\(\) that computes \(CallExpression\)/],
        ['a title that reads a let a hook fills', 'let title;\nbefore(() => { title = "x"; });\nit(title, () => {});', /an argument of it\(\) that reads `title`, a let of a describe body: it is empty until a hook has run, and this registration reads it first; build it at module top/],
        ['a title template that reads a let a hook fills', 'let CANARY;\nbefore(() => { CANARY = "x"; });\nit(`names ${CANARY}`, () => {});', /an argument of it\(\) that reads `CANARY`, a let of a describe body/],
        ['an option that reads a let a hook fills (the value form)', 'let reason;\nbefore(() => { reason = "x"; });\nit("t", { skip: reason }, () => {});', /an argument of it\(\) that reads `reason`, a let of a describe body/],
        ['an option that reads a let a hook fills (the shorthand form)', 'let skip;\nbefore(() => { skip = "x"; });\nit("t", { skip }, () => {});', /an argument of it\(\) that reads `skip`, a let of a describe body/],
        ['a callback that is a let a hook fills', 'let fn;\nbefore(() => { fn = () => {}; });\nit("t", fn);', /an argument of it\(\) that reads `fn`, a let of a describe body/],
        ['a property read on a let a hook fills', 'let facts;\nbefore(() => { facts = { title: "x" }; });\nit(facts.title, () => {});', /an argument of it\(\) that reads `facts`, a let of a describe body/],
        ['a let a hook fills read by a hook argument', 'let fn;\nbefore(() => { fn = () => {}; });\nafter(fn);', /an argument of after\(\) that reads `fn`, a let of a describe body/],
        ['a let read by a test inside a for', 'let t;\nbefore(() => { t = "x"; });\nfor (const n of [1, 2]) { it(`a ${n} ${t}`, () => {}); }', /inside a for\.\.\.of: an argument of it\(\) that reads `t`/],
        ['suite.skip', 'suite.skip("a", () => {});', /a call to `suite.skip`/],
        ['test.describe inside a body', 'test.describe("a", () => {});', /a call to `test.describe`/],
    ]) {
        it(`refuses ${name}`, () => {
            const problems = problemsIn(body);
            assert.ok(problems.length >= 1, 'the plant passed');
            assert.match(problems[0].why, why);
            assert.equal(problems[0].file, 'planted.test.mjs');
            // The body starts on line 3 of the planted file; the message names the line and the statement.
            assert.ok(problems[0].line >= 3);
            assert.match(problemLine(problems[0]), /^planted\.test\.mjs:\d+: /);
            assert.ok(problems[0].statement.length > 0);
        });
    }

    /*
     * The 6978ade re-review's R-P3-1: a name reads its nearest binding, so a
     * hook-filled `let` of a describe body is refused only where nothing
     * between it and the reading binds the name again. Each shape below has
     * an outer `let` of the same name that a hook fills, and passes.
     */
    for (const [name, body] of [
        ['a for...of head that binds the name again', "let name;\nbefore(() => { name = compute(); });\nit('reads the slot', () => { name; });\nfor (const name of NAMES) { it(name, () => {}); }\nfor (const name of NAMES) it(`b ${name}`, { skip: name }, () => {});\nfor (const [name, other] of CASES) it(name, () => { other; });"],
        ['an inner describe’s const of the same name', "let x;\nbefore(() => { x = compute(); });\ndescribe('inner', () => { const x = 'lit'; it(x, () => {}); describe('deeper', () => { it(x, () => {}); }); });"],
        ['an inner describe’s function declaration of the same name', "let check;\nbefore(() => { check = compute(); });\ndescribe('inner', () => { function check() {} it('t', check); });"],
        ['a describe callback’s parameter of the same name', "let t;\nbefore(() => { t = compute(); });\ndescribe('inner', (t) => { it(t.name, () => {}); });"],
        ['a helper’s initialised let, read by the describe it builds', "let title;\nbefore(() => { title = compute(); });\nconst make = (n) => {\n    let title = `t ${n}`;\n    describe('made', () => { it(title, () => {}); });\n};"],
        // The fences-followup critic's item 7: a method's parameter, a for...in or for head, and a var written in a nested block bind the name too.
        ['a method’s parameter of the same name', "let x;\nbefore(() => { x = compute(); });\nconst make = () => ({ m(x) { describe('i', () => { it(x, () => {}); }); } });"],
        ['a for...in head of the same name', "let x;\nbefore(() => { x = compute(); });\nconst make = () => { for (const x in OBJECT) { describe('i', () => { it(x, () => {}); }); } };"],
        ['a for head of the same name', "let x;\nbefore(() => { x = compute(); });\nconst make = () => { for (let x = 0; x < 2; x += 1) { describe('i', () => { it(`n ${x}`, () => {}); }); } };"],
        ['a var of the same name written in a nested block of a helper', "let x;\nbefore(() => { x = compute(); });\nconst make = () => { if (WANTED) { var x = 'v'; } describe('i', () => { it(x, () => {}); }); };"],
    ]) {
        it(`passes ${name}`, () => {
            assert.deepEqual(problemsIn(body).map(problemLine), []);
        });
    }

    it('passes a let at module top, which no describe body declares', () => {
        assert.deepEqual(describeBodyProblems('m.test.mjs', "let shared;\nshared = compute();\ndescribe('s', () => { it(shared, () => {}); });").problems, []);
    });

    it('still refuses a hook-filled let where the nearest binding is one: an inner describe’s own bare let, a for...of block’s, a helper’s, and an outer one past a binding of another name', () => {
        for (const [body, name] of [
            ["let x;\nbefore(() => { x = compute(); });\ndescribe('inner', () => { let x; before(() => { x = 1; }); it(x, () => {}); });", 'x'],
            ["for (const n of [1, 2]) { let t; before(() => { t = n; }); it(t, () => {}); }", 't'],
            ["let t;\nbefore(() => { t = compute(); });\nfor (const other of NAMES) { it(t, () => {}); }\ndescribe('inner', (s) => { const u = 'lit'; it(t, () => {}); });", 't'],
            ["let t;\nbefore(() => { t = compute(); });\nconst make = (t2) => { describe('made', () => { it(t, () => {}); }); };", 't'],
            // The fences-followup critic's item 6: a helper's bare let, which main refused, is a slot too — whatever fills it (fail closed).
            ["const make = (n) => {\n    let title;\n    before(() => { title = `t ${n}`; });\n    describe('m', () => { it(title, () => {}); });\n};", 'title'],
            ["const make = (n) => {\n    let title;\n    title = `t ${n}`;\n    describe('made', () => { it(title, () => {}); });\n};", 'title'],
        ]) {
            const problems = problemsIn(body);
            assert.ok(problems.length >= 1, `passed: ${body}`);
            assert.ok(
                problems.every((problem) => problem.why.includes(`reads \`${name}\`, a let of a describe body`) || problem.why.includes(`reads \`${name}\`, a let of a function body`)),
                problems.map(problemLine).join('\n'),
            );
        }
    });

    /* The 6978ade re-review's R-P3-2: a describe reached through .call, .apply or .bind is refused wherever it stands. */
    it('refuses a describe reached through .call, .apply or .bind, wherever it stands', () => {
        for (const shape of [
            "describe.call(null, 's', () => { const v = f(); });",
            "describe.apply(null, ['s', () => { const v = f(); }]);",
            "suite.call(null, 's', () => {});",
            "test.describe.call(null, 's', () => {});",
            "it.suite.apply(null, ['s', () => {}]);",
            "describe.skip.apply(null, ['s', () => {}]);",
            "const d = describe.bind(null, 's');",
            "it('t', () => { describe.call(null, 's', () => {}); });",
        ]) {
            const { problems } = describeBodyProblems('a.test.mjs', shape);
            assert.equal(problems.length, 1, `${shape}: ${problems.map(problemLine).join('\n')}`);
            assert.match(problems[0].why, /^a describe reached through \.(call|apply|bind): write the describe itself/, shape);
        }
        // Not a describe: a test reached through .call (a describe body's own rule refuses that), and a name that merely ends in describe.
        for (const shape of ["it.call(null, 't', () => {});", 'other.describe.call(null);', 'fn.call(null);']) {
            assert.deepEqual(describeBodyProblems('a.test.mjs', shape).problems, [], shape);
        }
    });

    /* The fences-followup critic's item 6: a read before the declaration it reads throws as the suite is registered. */
    it('refuses a read before its declaration in a scope the registration reaches through describe callbacks alone', () => {
        for (const [label, text, name] of [
            ['an inner describe’s const read before it, under an outer bare let', "describe('s', () => {\n    let x;\n    before(() => { x = compute(); });\n    describe('inner', () => { it(x, () => {}); const x = 'lit'; });\n});", 'x'],
            ['a module const read in a describe registered before it', "describe('s', () => { it(TITLE, () => {}); });\nconst TITLE = 'x';", 'TITLE'],
            ['a bare let read before it in the same body', "describe('s', () => { it(t, () => {}); let t; });", 't'],
            ['a for...of over its own head', "describe('s', () => { for (const x of x) { it('a', () => {}); } });", 'x'],
        ]) {
            const { problems } = describeBodyProblems('t.test.mjs', text);
            assert.equal(problems.length, 1, `${label}: ${problems.map(problemLine).join('\n')}`);
            assert.match(problems[0].why, new RegExp(`reads \`${name}\` before its declaration|over \`${name}\` before its declaration`), label);
        }
        // Not a read before its declaration: a module const a describe built by a helper reads only when the helper is called, and a function declaration hoists.
        assert.deepEqual(describeBodyProblems('t.test.mjs', "function suiteOf() { describe('s', () => { it(TITLE, () => {}); }); }\nconst TITLE = 'x';\nsuiteOf();").problems, []);
        assert.deepEqual(describeBodyProblems('t.test.mjs', "describe('s', () => { it('t', check); function check() {} });").problems, []);
    });

    /* The fences-followup critic's item 7: a describe reached as a value is not read as one, so it is refused; one in parentheses is read. */
    it('refuses a describe used as a value, and reads one called in parentheses', () => {
        for (const shape of [
            'const d = describe;',
            'const describeIf = WANTED ? describe : describe.skip;',
            "(0, describe)('s', () => {});",
            "Reflect.apply(describe, null, ['s', () => {}]);",
            "const { describe: d } = require('node:test');",
            'export default { describe };',
            'const t2 = test.describe;',
            'const s2 = it.suite.only;',
        ]) {
            const { problems } = describeBodyProblems('a.test.mjs', shape);
            assert.ok(problems.length >= 1, shape);
            assert.ok(problems.every((problem) => /^a describe used as a value/.test(problem.why)), `${shape}: ${problems.map(problemLine).join('\n')}`);
        }
        for (const callee of ['(describe)', '(describe.skip)', '(describe).only', '((test.describe))']) {
            const { problems, describes } = describeBodyProblems('a.test.mjs', `${callee}('a', () => { const x = f(); });`);
            assert.equal(describes, 1, callee);
            assert.equal(problems.length, 1, `${callee}: ${problems.map(problemLine).join('\n')}`);
            assert.match(problems[0].why, /a const that computes/, callee);
        }
        // Not a value: the import, a destructured name, another object's property, a describe called, and a property named describe.
        for (const shape of [
            "import { describe, it } from 'node:test';",
            "const { describe } = require('node:test');",
            'const same = nodeTest.describe === nodeTest.suite;',
            "describe('a', () => { it('t', () => {}); });",
            'const o = { describe: 1 };',
        ]) {
            assert.deepEqual(describeBodyProblems('a.test.mjs', shape).problems, [], shape);
        }
    });

    /* The re-review's item 5: the value rule is for registration code, not for what a test or a hook does when it runs. */
    it('refuses a describe used as a value where the suite is registered, and not inside the body of a test or a hook', () => {
        for (const shape of [
            "it('t', () => { assert.equal(typeof describe, 'function'); });",
            "it('t', (t) => { t.diagnostic(String(typeof describe)); });",
            "test('t', async () => { const same = describe === suite; });",
            "it.skip('t', () => { const d = describe; });",
            "before(() => { const d = describe; });",
            "describe('s', () => { afterEach(() => { Reflect.has(globalThis, 'describe') || describe; }); });",
            "describe('s', () => { it('t', () => { function helper() { return describe.skip; } helper(); }); });",
            "it('t', function named() { return typeof test.describe; });",
        ]) {
            assert.deepEqual(describeBodyProblems('a.test.mjs', shape).problems, [], shape);
        }
        // Registration code: a describe body, a helper that builds a describe, the module top, an argument of a registering call, and a function that is no test's or hook's callback.
        for (const shape of [
            "describe('s', () => { const d = describe; });",
            "function build() { const d = describe; return d; }",
            "it('t', () => {});\nconst d = describe;",
            "it('t', describe);",
            "it('t', () => {}, { run: describe });",
            "const run = () => typeof describe;\nit('t', run);",
            "describe('s', () => { it('t', () => {}); });\nconst after2 = () => describe;",
        ]) {
            const { problems } = describeBodyProblems('a.test.mjs', shape);
            assert.ok(problems.some((problem) => /^a describe used as a value/.test(problem.why)), `${shape}: ${problems.map(problemLine).join('\n') || '(no problem)'}`);
        }
        // Still refused wherever it stands: a describe reached through a method, and one called from a test body is read by its name.
        assert.match(describeBodyProblems('a.test.mjs', "it('t', () => { describe.call(null, 's', () => {}); });").problems[0].why, /^a describe reached through \.call/);
        assert.match(describeBodyProblems('a.test.mjs', "it('t', () => { describe('s', () => { const v = f(); }); });").problems[0].why, /a const that computes/);
    });

    it('refuses a describe callback with a default parameter, which is computed as the suite is registered', () => {
        for (const shape of ["describe('s', (x = f()) => { it('t', () => {}); });", "describe('s', ({ a = f() }) => { it('t', () => {}); });"]) {
            const { problems } = describeBodyProblems('a.test.mjs', shape);
            assert.equal(problems.length, 1, shape);
            assert.match(problems[0].why, /a describe callback with a default parameter/);
        }
        assert.deepEqual(describeBodyProblems('a.test.mjs', "describe('s', (s) => { it('t', () => {}); });").problems, []);
    });

    it('names the line of the statement, not of the describe', () => {
        const [problem] = problemsIn("it('a', () => {});\n\nconst text = read();");
        assert.equal(problem.line, 5);
        assert.equal(problem.statement, 'const text = read();');
    });

    it('reads a nested describe and one with a concise arrow body, and refuses a callback it cannot read', () => {
        const nested = describeBodyProblems('n.test.mjs', "describe('a', () => { describe('b', () => { const x = f(); }); });").problems;
        assert.equal(nested.length, 1);
        assert.match(nested[0].why, /a const that computes/);
        const concise = describeBodyProblems('c.test.mjs', "describe('a', () => compute());").problems;
        assert.equal(concise.length, 1);
        assert.match(concise[0].why, /a call to `compute\(\)`/);
        const named = describeBodyProblems('d.test.mjs', "describe('a', body);").problems;
        assert.equal(named.length, 1);
        assert.match(named[0].why, /callback is not a function written in place/);
        const withOptions = describeBodyProblems('e.test.mjs', "describe('a', { timeout: 5 }, () => { const x = f(); });").problems;
        assert.equal(withOptions.length, 1);
        // A let of an enclosing describe also makes a for...of in the inner one refuse.
        const outerLet = describeBodyProblems('f.test.mjs', "describe('a', () => { let items; describe('b', () => { for (const x of items) { it('c', () => {}); } }); });").problems;
        assert.equal(outerLet.length, 1);
        assert.match(outerLet[0].why, /for\.\.\.of over `items`/);
    });

    it('reads Node\'s own aliases of describe, with .skip, .only and .todo, as a describe', () => {
        for (const callee of ['suite', 'suite.skip', 'suite.only', 'suite.todo', 'describe.skip', 'describe.only', 'describe.todo', 'test.describe', 'test.suite', 'it.describe', 'it.suite', 'test.describe.skip', 'it.suite.todo']) {
            const { problems, describes } = describeBodyProblems('a.test.mjs', `${callee}('a', () => { const x = f(); });`);
            assert.equal(describes, 1, callee);
            assert.equal(problems.length, 1, `${callee}: a body that computes passed`);
            assert.match(problems[0].why, /a const that computes/, callee);
        }
        // Not describes: tests, hooks, and a name that merely ends in describe.
        for (const callee of ['it', 'test', 'it.skip', 'test.only', 'other.describe', 'describe.describe']) {
            assert.equal(describeBodyProblems('a.test.mjs', `${callee}('a', () => { const x = f(); });`).describes, 0, callee);
        }
        // Node really exports them as one function (22.22.0).
        assert.ok(nodeTest.suite === nodeTest.describe && nodeTest.test.describe === nodeTest.describe && nodeTest.it.suite === nodeTest.describe && nodeTest.test.suite === nodeTest.describe && nodeTest.it.describe === nodeTest.describe);
    });

    it('refuses node:test imported in a form the guard cannot follow', () => {
        for (const line of ["import test from 'node:test';", "import * as t from 'node:test';", "import { describe as suite } from 'node:test';"]) {
            const { problems } = describeBodyProblems('i.test.mjs', `${line}\n`);
            assert.equal(problems.length, 1, line);
            assert.match(problems[0].why, /node:test imported by default, as a namespace or under another name/);
        }
        assert.deepEqual(describeBodyProblems('i.test.mjs', "import { describe, it, before } from 'node:test';\n").problems, []);
    });

    it('reads a TypeScript file', () => {
        const { problems, describes } = describeBodyProblems('t.test.ts', "describe('a', () => { const x: number = f(); it('b', () => {}); });");
        assert.equal(describes, 1);
        assert.equal(problems.length, 1);
    });
});

/**
 * The premise, measured on the Node this repository pins (`.nvmrc`,
 * `engines`): a throw in a `describe` body is a suite `not ok` that the
 * summary and the exit status do not count; the same throw in a hook or at
 * module top fails the run. When a Node upgrade changes the first, this test
 * goes red and says so: the guard above may then be retired or relaxed, which
 * is the owner's call.
 */
describe('a-describe-body-that-throws-is-not-a-failed-run-on-this-node', () => {
    let dir;
    before(() => {
        dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-node-test-')));
        scratch.push(dir);
        const head = "import { describe, it, before } from 'node:test';\n";
        writeFileSync(join(dir, 'in-body.test.mjs'), `${head}describe('s', () => { const v = (() => { throw new Error('boom'); })(); it('t', () => {}); });\nit('u', () => {});\n`);
        writeFileSync(join(dir, 'in-hook.test.mjs'), `${head}describe('s', () => { before(() => { throw new Error('boom'); }); it('t', () => {}); });\nit('u', () => {});\n`);
        writeFileSync(join(dir, 'at-top.test.mjs'), `${head}throw new Error('boom');\n`);
    });

    /** `node --test <file>` as a top-level run: the runner's own context variable would make it a child of this one. */
    function run(file) {
        const { NODE_TEST_CONTEXT: _context, ...env } = process.env;
        const out = spawnSync(process.execPath, ['--test', '--test-reporter=tap', join(dir, file)], { cwd: dir, env, encoding: 'utf8', timeout: 60_000 });
        return { status: out.status, out: `${out.stdout}${out.stderr}` };
    }

    it('counts it as neither a failure nor a failed run, though the stream says not ok', () => {
        const { status, out } = run('in-body.test.mjs');
        assert.match(out, /^not ok \d+ - s$/m, out);
        assert.match(out, /^# fail 0$/m, `this Node counts a describe body that throws: ${out}`);
        assert.equal(status, 0, `this Node fails a run whose describe body throws: the guard may be relaxed (the owner's call)\n${out}`);
    });

    it('fails the run for the same throw in a before() hook and at module top', () => {
        for (const file of ['in-hook.test.mjs', 'at-top.test.mjs']) {
            const { status, out } = run(file);
            assert.equal(status, 1, `${file}: ${out}`);
            assert.match(out, /^not ok \d+ - /m, file);
        }
    });
});

/**
 * The runtime half (`scripts/node-test-reporter.mjs`, named by the `test`
 * script as `--test-reporter`): the exit status 1 for a failure the summary
 * does not count, with the output of Node's own TAP reporter otherwise
 * untouched. The spec reporter, which Node picks on a terminal and this one
 * wraps the same way, was compared by hand over a pseudo-terminal, colours
 * included; no test here owns a terminal.
 */
describe('the-test-reporter-fails-the-run-for-a-failure-the-summary-does-not-count', () => {
    const HEAD = "import { describe, it, after } from 'node:test';\n";
    let dir;
    before(() => {
        dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-node-reporter-')));
        scratch.push(dir);
        const files = {
            'in-body.test.mjs': "describe('s', () => { const v = (() => { throw new Error('boom'); })(); it('t', () => {}); });\nit('u', () => {});\n",
            'in-after.test.mjs': "describe('s', () => { after(() => { throw new Error('boom'); }); it('t', () => {}); });\n",
            'green.test.mjs': "describe('s', () => { it('t', () => {}); it('u', () => {}); });\n",
            'plain-fail.test.mjs': "describe('s', () => { it('t', () => { throw new Error('boom'); }); });\n",
            'todo.test.mjs': "it('t', { todo: true }, () => { throw new Error('expected'); });\nit('u', () => {});\n",
            'todo-empty.test.mjs': "it('t', { todo: '' }, () => { throw new Error('expected'); });\n",
            'skip-then-throw.test.mjs': "it('t', async (t) => { t.skip(); throw new Error('after the skip'); });\n",
            'skip-empty.test.mjs': "it('t', { skip: '' }, () => { throw new Error('skipped'); });\n",
        };
        for (const [name, body] of Object.entries(files)) {
            writeFileSync(join(dir, name), `${HEAD}${body}`);
        }
    });

    /** `node --test` as a top-level run, with Node's own reporter (TAP, as on a pipe) or this one. */
    function run(file, reporter) {
        const { NODE_TEST_CONTEXT: _context, ...env } = process.env;
        const args = ['--test', ...(reporter ? [`--test-reporter=${REPORTER}`] : []), join(dir, file)];
        const out = spawnSync(process.execPath, args, { cwd: dir, env, encoding: 'utf8', timeout: 60_000 });
        return { status: out.status, stdout: out.stdout.replace(/duration_ms.*/g, ''), stderr: out.stderr };
    }

    it('exits 1 for a describe body that throws, saying why on stderr, where Node exits 0', () => {
        assert.equal(run('in-body.test.mjs', false).status, 0);
        const { status, stdout, stderr } = run('in-body.test.mjs', true);
        assert.equal(status, 1, stdout);
        assert.match(stdout, /^# fail 0$/m, 'the summary is Node\'s own, and still does not count it');
        assert.match(stdout, /^not ok \d+ - s$/m);
        assert.match(stderr, /^node-test-reporter: 1 failed test or suite event\(s\) above were not counted by the summary; exit status 1$/m);
        assert.doesNotMatch(stderr, /describe body|after\(\)/, 'the note names no cause');
    });

    it('exits 1 for an after() hook inside a describe that throws', () => {
        assert.equal(run('in-after.test.mjs', false).status, 0);
        assert.equal(run('in-after.test.mjs', true).status, 1);
    });

    it('prints what Node prints for a green run and for an ordinary failure, with no note and the same status', () => {
        for (const file of ['green.test.mjs', 'plain-fail.test.mjs', 'todo.test.mjs', 'todo-empty.test.mjs', 'skip-then-throw.test.mjs', 'skip-empty.test.mjs']) {
            const node = run(file, false);
            const ours = run(file, true);
            assert.equal(ours.status, node.status, file);
            assert.equal(ours.stdout, node.stdout, file);
            assert.equal(ours.stderr, '', file);
        }
        assert.equal(run('green.test.mjs', true).status, 0);
        assert.equal(run('plain-fail.test.mjs', true).status, 1);
        assert.equal(run('todo.test.mjs', true).status, 0, 'a todo that fails is not a failed run');
        assert.equal(run('todo-empty.test.mjs', true).status, 0, 'an empty todo is still a todo, as Node counts it');
        assert.equal(run('skip-then-throw.test.mjs', true).status, 0, 'a throw after t.skip() is a skip, as Node counts it');
        assert.equal(run('skip-empty.test.mjs', true).status, 0);
    });

    it('is the reporter the test script names', () => {
        const script = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts.test;
        assert.ok(script.includes('--test-reporter=./scripts/node-test-reporter.mjs'), script);
    });
});
