import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/**
 * The static half of `no-node-test-computes-in-a-describe-body`
 * (`scripts/node-test-guard.test.mjs`).
 *
 * Why. On Node 22.22.0, `node --test` counts a `describe` callback that
 * throws before it has registered a test as a suite-level `not ok` and
 * nothing else: the summary says `fail 0`, the exit status is 0, and every
 * test in the suite is gone, green. A throw in `before()`, in an `it`, or at
 * module top fails the run (measured by
 * `a-describe-body-that-throws-is-not-a-failed-run-on-this-node`). So a
 * `describe` body may register and may not compute: anything that reads a file, runs git
 * or builds a value goes into a `before()` hook, or to the module top when the
 * tests registered depend on it.
 *
 * What a `describe` body (and a `for...of` body inside one) may hold:
 *   - a call to `describe`, `suite`, `it`, `test`, `before`, `after`,
 *     `beforeEach` or `afterEach`, by its bare name (`it.skip`, `describe.only` and the other
 *     dotted forms are refused), whose arguments compute nothing;
 *   - a function declaration;
 *   - a `const` whose initializer is a function or arrow expression or a
 *     literal: a string, number, boolean, null, regular expression, template
 *     with no substitution, two of those joined by `+`, or an array or object
 *     literal of those;
 *   - a `let` with no initializer: the slot a `before()` hook fills;
 *   - a `for...of` over a bare name or an array literal, whose body is held
 *     to these same rules, so tests can be generated one per item (the items
 *     are built at module top, where a throw fails the file). The name must
 *     not be a `let` of a describe body: it is empty until a hook has run,
 *     and the loop runs first.
 *
 * What an argument of those calls may hold: a function or arrow expression,
 * a literal, a bare name or a chain of property reads, a template whose
 * substitutions are such names, or an object literal of these. No call, no
 * conditional, no index: the title and the options of a test are read when it
 * is registered, in the describe body, and a throw there is the same hole.
 * And no argument may read a `let` of a describe body, by its name, the root
 * of a property chain, a shorthand property, a property value or a template
 * substitution: the registration reads it before any hook has filled it, so a
 * title becomes `undefined`, a `{ skip }` option is lost, a callback is not
 * one, and a property read on it throws in the body. A `let` is for what a
 * test or a hook body reads when it runs.
 *
 * `describe` is also `suite`, `test.describe`, `test.suite`, `it.describe` and
 * `it.suite` on Node 22.22.0, each with `.skip`, `.only` and `.todo`
 * (`describe === suite`, checked); the guard reads all of them as a describe.
 *
 * Not decided here, stated: that a bare name names an iterable, a function or
 * an initialised binding; what a hook or a test does when it runs (a failure
 * there is counted). An `after()` hook inside a describe that throws is not
 * counted either (measured) and is not read here: the reporter
 * (`scripts/node-test-reporter.mjs`) fails the run for it.
 */

/** The registering calls, by bare name. */
export const REGISTRARS = ['describe', 'suite', 'it', 'test', 'before', 'after', 'beforeEach', 'afterEach'];
const REGISTRAR_SET = new Set(REGISTRARS);

const K = ts.SyntaxKind;

/** The command lines of `scripts.test` that run `node ... --test <files>`, as the files each names. */
export function nodeTestFilesOf(packageJsonText) {
    const script = JSON.parse(packageJsonText).scripts?.test;
    if (typeof script !== 'string') {
        throw new Error('package.json has no scripts.test');
    }
    const files = [];
    for (const command of script.split('&&')) {
        const words = command.trim().split(/\s+/);
        const at = words.indexOf('--test');
        if (words[0] === 'node' && at !== -1) {
            files.push(...words.slice(at + 1).filter((word) => !word.startsWith('-')));
        }
    }
    return files;
}

/** The files the package's `test` script runs with `node --test`, read from `package.json` under `root`. */
export function nodeTestFiles(root) {
    return nodeTestFilesOf(readFileSync(join(root, 'package.json'), 'utf8'));
}

/**
 * Every file under `scripts/` and `worker-icons/` named `*.test.<ext>` that
 * imports `node:test`, by relative path: whatever the `test` script's spelling,
 * these are the files a `node --test` run is owed. A file here that the script
 * does not name is never run at all.
 */
export function nodeTestFilesOnDisk(root) {
    const found = [];
    const walk = (relative) => {
        for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
            const path = `${relative}/${entry.name}`;
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    walk(path);
                }
            } else if (/\.test\.(mjs|cjs|js|mts|cts|ts)$/.test(entry.name) && /['"]node:test['"]/.test(readFileSync(join(root, path), 'utf8'))) {
                found.push(path);
            }
        }
    };
    for (const top of ['scripts', 'worker-icons']) {
        if (existsSync(join(root, top))) {
            walk(top);
        }
    }
    return found.sort();
}

const isFunction = (node) => node.kind === K.ArrowFunction || node.kind === K.FunctionExpression;

/** A value that computes nothing and cannot throw. */
function isLiteral(node) {
    switch (node.kind) {
        case K.StringLiteral:
        case K.NumericLiteral:
        case K.NoSubstitutionTemplateLiteral:
        case K.TrueKeyword:
        case K.FalseKeyword:
        case K.NullKeyword:
        case K.RegularExpressionLiteral:
            return true;
        case K.ParenthesizedExpression:
            return isLiteral(node.expression);
        case K.PrefixUnaryExpression:
            return (node.operator === K.MinusToken || node.operator === K.PlusToken) && node.operand.kind === K.NumericLiteral;
        case K.BinaryExpression:
            return node.operatorToken.kind === K.PlusToken && isLiteral(node.left) && isLiteral(node.right);
        case K.ArrayLiteralExpression:
            return node.elements.every(isLiteral);
        case K.ObjectLiteralExpression:
            return node.properties.every(
                (property) =>
                    property.kind === K.PropertyAssignment &&
                    (property.name.kind === K.Identifier || property.name.kind === K.StringLiteral || property.name.kind === K.NumericLiteral) &&
                    isLiteral(property.initializer),
            );
        default:
            return false;
    }
}

/** A name, or a chain of property reads on one. */
function isName(node) {
    return node.kind === K.Identifier || (node.kind === K.PropertyAccessExpression && isName(node.expression));
}

/** An argument of a registering call: nothing that runs. */
function isPlainArgument(node) {
    if (isFunction(node) || isLiteral(node) || isName(node)) {
        return true;
    }
    if (node.kind === K.TemplateExpression) {
        return node.templateSpans.every((span) => isName(span.expression));
    }
    if (node.kind === K.ObjectLiteralExpression) {
        return node.properties.every(
            (property) =>
                property.kind === K.ShorthandPropertyAssignment ||
                (property.kind === K.PropertyAssignment &&
                    (property.name.kind === K.Identifier || property.name.kind === K.StringLiteral || property.name.kind === K.NumericLiteral) &&
                    isPlainArgument(property.initializer)),
        );
    }
    return false;
}

/**
 * The name of a `let` of a describe body that `node` reads when it is
 * evaluated, or undefined: a bare name, the root of a property chain, a
 * shorthand property, a property value, a template substitution. A function's
 * body runs later and is not read.
 */
function letRead(node, lets) {
    switch (node.kind) {
        case K.Identifier:
            return lets.has(node.text) ? node.text : undefined;
        case K.PropertyAccessExpression:
            return letRead(node.expression, lets);
        case K.ParenthesizedExpression:
            return letRead(node.expression, lets);
        case K.ShorthandPropertyAssignment:
            return lets.has(node.name.text) ? node.name.text : undefined;
        case K.PropertyAssignment:
            return letRead(node.initializer, lets);
        case K.TemplateExpression:
            return node.templateSpans.map((span) => letRead(span.expression, lets)).find((name) => name !== undefined);
        case K.ObjectLiteralExpression:
            return node.properties.map((property) => letRead(property, lets)).find((name) => name !== undefined);
        default:
            return undefined;
    }
}

/** The `let` names declared directly in a statement list. */
function letNamesOf(statements) {
    const names = new Set();
    for (const statement of statements) {
        if (statement.kind === K.VariableStatement && statement.declarationList.flags & ts.NodeFlags.Let) {
            for (const declaration of statement.declarationList.declarations) {
                if (declaration.name.kind === K.Identifier) {
                    names.add(declaration.name.text);
                }
            }
        }
    }
    return names;
}

function bindingIsPlain(name) {
    if (name.kind === K.Identifier) {
        return true;
    }
    return name.elements.every((element) => element.kind !== K.OmittedExpression && !element.initializer && bindingIsPlain(element.name));
}

/**
 * Why `statement` may not stand in a describe body, or undefined. `lets` is
 * every `let` name of the describe bodies around it.
 */
function statementProblem(statement, lets) {
    switch (statement.kind) {
        case K.EmptyStatement:
        case K.FunctionDeclaration:
            return undefined;
        case K.ExpressionStatement:
            return expressionProblem(statement.expression, lets);
        case K.VariableStatement: {
            const list = statement.declarationList;
            if (list.flags & ts.NodeFlags.Const) {
                return list.declarations.every((declaration) => declaration.name.kind === K.Identifier && declaration.initializer && (isFunction(declaration.initializer) || isLiteral(declaration.initializer)))
                    ? undefined
                    : 'a const that computes its value: build it at module top (a title, an option or a loop reads it when the suite is registered), or fill a `let` in a before() hook (only a test or hook body may read that)';
            }
            if (list.flags & ts.NodeFlags.Let) {
                return list.declarations.every((declaration) => declaration.name.kind === K.Identifier && !declaration.initializer)
                    ? undefined
                    : 'a let with a value: declare it bare and fill it in a before() hook';
            }
            return 'a var declaration';
        }
        case K.ForOfStatement: {
            if (statement.awaitModifier) {
                return 'a for await loop';
            }
            const head = statement.initializer;
            if (head.kind !== K.VariableDeclarationList || !head.declarations.every((declaration) => !declaration.initializer && bindingIsPlain(declaration.name))) {
                return 'a for...of whose binding is not a plain name or pattern';
            }
            const list = statement.expression;
            if (list.kind === K.Identifier) {
                if (lets.has(list.text)) {
                    return `a for...of over \`${list.text}\`, a let of a describe body: it is empty until a hook has run, and this loop runs first; build it at module top`;
                }
            } else if (!(list.kind === K.ArrayLiteralExpression && isLiteral(list))) {
                return 'a for...of over something that is computed: build the items at module top and loop over the name';
            }
            const body = statement.statement.kind === K.Block ? statement.statement.statements : [statement.statement];
            for (const inner of body) {
                const problem = statementProblem(inner, lets);
                if (problem !== undefined) {
                    return `inside a for...of: ${problem}`;
                }
            }
            return undefined;
        }
        default:
            return `a ${ts.SyntaxKind[statement.kind]}, which runs when the suite is registered`;
    }
}

function expressionProblem(expression, lets) {
    if (expression.kind !== K.CallExpression) {
        return `a ${ts.SyntaxKind[expression.kind]} expression, which runs when the suite is registered`;
    }
    const callee = expression.expression;
    if (callee.kind !== K.Identifier) {
        return `a call to \`${callee.getText()}\`: only a bare describe, it, test, before, after, beforeEach or afterEach may be called (no .skip, .only or .todo, and nothing else)`;
    }
    if (!REGISTRAR_SET.has(callee.text)) {
        return `a call to \`${callee.text}()\`, which runs when the suite is registered`;
    }
    for (const argument of expression.arguments) {
        if (!isPlainArgument(argument)) {
            return `an argument of ${callee.text}() that computes (${ts.SyntaxKind[argument.kind]}): build it at module top`;
        }
        const name = letRead(argument, lets);
        if (name !== undefined) {
            return `an argument of ${callee.text}() that reads \`${name}\`, a let of a describe body: it is empty until a hook has run, and this registration reads it first; build it at module top`;
        }
    }
    return undefined;
}

/** `describe`, `suite`, `test.describe`, `test.suite`, `it.describe`, `it.suite`, each with `.skip`, `.only` or `.todo`. */
function isDescribeCallee(callee) {
    let node = callee;
    if (node.kind === K.PropertyAccessExpression && ['skip', 'only', 'todo'].includes(node.name.text)) {
        node = node.expression;
    }
    if (node.kind === K.Identifier) {
        return node.text === 'describe' || node.text === 'suite';
    }
    return node.kind === K.PropertyAccessExpression && node.expression.kind === K.Identifier && ['test', 'it'].includes(node.expression.text) && ['describe', 'suite'].includes(node.name.text);
}

/**
 * Every statement a `describe` body of `text` may not hold, as
 * `{ line, why, statement }`; and the way `node:test` is imported, when the
 * guard could not follow it. `name` is only for the messages.
 */
export function describeBodyProblems(name, text) {
    const kind = name.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, kind);
    const problems = [];
    const lineOf = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const report = (node, why) => problems.push({ file: name, line: lineOf(node), why, statement: node.getText(source).split('\n')[0].trim().slice(0, 120) });

    let describes = 0;
    const visit = (node) => {
        if (node.kind === K.ImportDeclaration && node.moduleSpecifier.text === 'node:test') {
            const clause = node.importClause;
            const bindings = clause?.namedBindings;
            if (clause?.name || bindings?.kind === K.NamespaceImport || bindings?.elements?.some((element) => element.propertyName)) {
                report(node, 'node:test imported by default, as a namespace or under another name: `test.describe` is a describe, and the guard follows the bare names only');
            }
        }
        if (node.kind === K.CallExpression) {
            if (isDescribeCallee(node.expression)) {
                describes += 1;
                const callback = [...node.arguments].reverse().find((argument) => argument.kind !== K.ObjectLiteralExpression);
                if (!callback || !isFunction(callback)) {
                    report(node, 'a describe whose callback is not a function written in place');
                } else {
                    // Every `let` of the describe bodies around this one, and of this one.
                    const lets = new Set();
                    for (let up = node.parent; up; up = up.parent) {
                        if (up.kind === K.Block && up.parent && isFunction(up.parent)) {
                            for (const name of letNamesOf(up.statements)) {
                                lets.add(name);
                            }
                        }
                    }
                    if (callback.body.kind !== K.Block) {
                        const why = expressionProblem(callback.body, lets);
                        if (why !== undefined) {
                            report(callback.body, why);
                        }
                    } else {
                        for (const name of letNamesOf(callback.body.statements)) {
                            lets.add(name);
                        }
                        for (const statement of callback.body.statements) {
                            const why = statementProblem(statement, lets);
                            if (why !== undefined) {
                                report(statement, why);
                            }
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return { problems, describes };
}

/** A problem as a line a person can act on: file, line, the statement and why it may not stand. */
export function problemLine({ file, line, why, statement }) {
    return `${file}:${line}: ${why}\n      ${statement}`;
}
