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
 *     not read a `let` of a describe body: it is empty until a hook has run,
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
 * test or a hook body reads when it runs. "Reads" is by scope (the 6978ade
 * re-review's R-P3-1): a name reads the nearest binding of it, walking out
 * from where it stands (`readOf`). A bare `let` declared directly in any
 * function's body — a describe callback's, a helper's that builds a
 * describe, a hook's — or in the block of a `for...of` standing in a
 * describe body is a slot a hook fills and is refused, whatever fills it
 * (a helper's, set in its own body, is refused too: fail closed, the
 * fences-followup critic's item 6). A loop head (`for...of`, `for...in`,
 * `for`), any function's parameters (a method's, a constructor's, an
 * accessor's), a function expression's own name, a `var` written anywhere
 * in a function, an inner body's `const`, function or class declaration and
 * a `let` with a value, met first, are the binding the name reads; a bare
 * `let` at module top is no slot (a module runs top to bottom before its
 * tests). And a name read before its declaration in a scope the
 * registration reaches through describe callbacks alone — an inner body's
 * `const` below the read, a module constant below the describe that reads
 * it, `for (const x of x)` — throws as the suite is registered and is
 * refused (that critic's item 6).
 *
 * `describe` is also `suite`, `test.describe`, `test.suite`, `it.describe` and
 * `it.suite` on Node 22.22.0, each with `.skip`, `.only` and `.todo`
 * (`describe === suite`, checked); the guard reads all of them as a describe,
 * in parentheses or not. Reached through `.call`, `.apply` or `.bind` it is
 * refused wherever it stands (R-P3-2): the guard reads a describe written as
 * one, and a callback passed through those is one it would have to find
 * among other arguments. Used as a value — an alias (`const d = describe`),
 * a conditional (`cond ? describe : describe.skip`), a comma (`(0,
 * describe)(…)`), an argument (`Reflect.apply(describe, …)`), a renamed
 * binding (`const { describe: d } = require('node:test')`) — it is refused
 * too (that critic's item 7): what it is called as is not read. Not inside
 * the body of a test or a hook (`typeof describe` in an `it`, the re-review's
 * item 5): that runs when the test does and registers nothing, so a value
 * there is not refused — and a describe aliased in a test body and called
 * from it is not read, as a describe reached through another namespace is
 * not. A describe callback with a default parameter is refused (the default
 * is computed as the suite is registered).
 *
 * Not decided here, stated: that a bare name names an iterable, a function or
 * a binding a hook fills (one at module top or past a helper is not read);
 * what a hook or a test does when it runs (a failure there is counted); a
 * describe reached through a namespace other than `test` or `it` (`await
 * import('node:test')` bound to another name, `require` into an object), a
 * local function named `describe` or `it` (read as Node's), and a getter
 * read as a title. An `after()` hook inside a describe that throws is not
 * counted either (measured) and is not read here: the reporter
 * (`scripts/node-test-reporter.mjs`) fails the run for it, as it does for
 * any throw this guard does not see.
 */

/** The ways to call a function that are not a call of it written out: a describe reached through one is refused. */
const THROUGH = ['call', 'apply', 'bind'];

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

/** Every name a binding pattern binds. */
function boundNames(name, into = new Set()) {
    if (name.kind === K.Identifier) {
        into.add(name.text);
    } else {
        for (const element of name.elements) {
            if (element.kind !== K.OmittedExpression) {
                boundNames(element.name, into);
            }
        }
    }
    return into;
}

/** `node` with the parentheses around it taken off. */
function unwrap(node) {
    let inner = node;
    while (inner.kind === K.ParenthesizedExpression) {
        inner = inner.expression;
    }
    return inner;
}

/** The describe call whose in-place callback `fn` is, or undefined: the callback is its last argument that is not an object literal. */
function describeOf(fn) {
    const call = fn.parent;
    if (!call || call.kind !== K.CallExpression || !isDescribeCallee(call.expression)) {
        return undefined;
    }
    return [...call.arguments].reverse().find((argument) => argument.kind !== K.ObjectLiteralExpression) === fn ? call : undefined;
}

/** Whether `block` is a describe body: a describe callback's own block, or the block of a `for...of` standing in one. */
function isDescribeBlock(block) {
    const parent = block.parent;
    if (block.kind !== K.Block || !parent) {
        return false;
    }
    if (isFunction(parent)) {
        return parent.body === block && describeOf(parent) !== undefined;
    }
    return parent.kind === K.ForOfStatement && parent.statement === block && standsInDescribeBody(parent);
}

/** Whether `statement` stands directly in a describe body, or as the unbraced body of a `for...of` that does. */
function standsInDescribeBody(statement) {
    const parent = statement.parent;
    if (parent?.kind === K.Block) {
        return isDescribeBlock(parent);
    }
    return parent?.kind === K.ForOfStatement && parent.statement === statement && standsInDescribeBody(parent);
}

/** Whether `block` is a body a hook-filled `let` can stand in: any function's own block (a describe callback's, a helper's, a hook's), or a describe body's `for...of` block. */
function isBodyBlock(block) {
    return block.kind === K.Block && block.parent !== undefined && ((ts.isFunctionLike(block.parent) && block.parent.body === block) || isDescribeBlock(block));
}

/**
 * The declaration of `name` among `statements`, or undefined: `{ kind,
 * node }`, `kind` one of `bare-let` (a `let` with no initializer: the slot
 * a hook fills), `let`, `const`, `var`, `function`, `class` or `import`,
 * and `node` the statement that declares it.
 */
function declarationIn(statements, name) {
    for (const statement of statements) {
        if (statement.kind === K.VariableStatement) {
            const flags = statement.declarationList.flags;
            for (const declaration of statement.declarationList.declarations) {
                if (boundNames(declaration.name).has(name)) {
                    const kind = flags & ts.NodeFlags.Let ? (declaration.name.kind === K.Identifier && !declaration.initializer ? 'bare-let' : 'let') : flags & ts.NodeFlags.Const ? 'const' : 'var';
                    return { kind, node: statement };
                }
            }
        } else if (statement.kind === K.FunctionDeclaration && statement.name?.text === name) {
            return { kind: 'function', node: statement };
        } else if (statement.kind === K.ClassDeclaration && statement.name?.text === name) {
            return { kind: 'class', node: statement };
        } else if (statement.kind === K.ImportDeclaration) {
            const clause = statement.importClause;
            const bindings = clause?.namedBindings;
            if (clause?.name?.text === name || bindings?.name?.text === name || bindings?.elements?.some((element) => element.name.text === name)) {
                return { kind: 'import', node: statement };
            }
        }
    }
    return undefined;
}

/** Whether a `var` named `name` is declared anywhere in `scope` outside a nested function: a `var` belongs to its function, wherever it is written. */
function varHoisted(scope, name) {
    let found = false;
    const walk = (node) => {
        if (found || ts.isFunctionLike(node)) {
            return;
        }
        if (node.kind === K.VariableDeclarationList && (node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) === 0 && node.declarations.some((declaration) => boundNames(declaration.name).has(name))) {
            found = true;
            return;
        }
        ts.forEachChild(node, walk);
    };
    ts.forEachChild(scope, walk);
    return found;
}

/**
 * What the identifier `id` reads when the registration it stands in runs:
 *   - `hook`: a bare `let` declared directly in a function's body or a
 *     describe body (`isBodyBlock`) — the slot a hook fills, still empty;
 *   - `tdz`: a `let`, `const` or `class` (or a loop head, read by its own
 *     list) declared after it in a scope the walk reached through describe
 *     callbacks alone, which run as they are registered — so the read throws
 *     before the binding exists;
 * or undefined. The nearest binding of the name decides, walking out from
 * where `id` stands: a `for...of`, `for...in` or `for` head (for what it
 * covers), any function's parameters (a method's, a constructor's, an
 * accessor's included) or a function expression's own name, a `var` written
 * anywhere in a function, and any other declaration met first are the
 * binding it reads. A bare `let` at module top is no slot (a module runs
 * top to bottom before its tests), and neither is a binding past a function
 * that is not a describe callback (it runs when it is called).
 */
function readOf(id) {
    const name = id.text;
    const at = id.getStart();
    let from = id;
    let immediate = true;
    for (let up = id.parent; up; from = up, up = up.parent) {
        if ((up.kind === K.ForOfStatement || up.kind === K.ForInStatement || up.kind === K.ForStatement) && up.initializer?.kind === K.VariableDeclarationList && up.initializer.declarations.some((declaration) => boundNames(declaration.name).has(name))) {
            if (up.kind !== K.ForStatement && from === up.expression) {
                // `for (const x of x)`: the list is read in the head's own scope, before its binding exists.
                return immediate && (up.initializer.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0 ? 'tdz' : undefined;
            }
            return undefined;
        }
        if (ts.isFunctionLike(up)) {
            if (up.parameters.some((parameter) => boundNames(parameter.name).has(name)) || (up.kind === K.FunctionExpression && up.name?.text === name)) {
                return undefined;
            }
            if (!(isFunction(up) && describeOf(up) !== undefined)) {
                immediate = false;
            }
        }
        if (up.kind === K.Block || up.kind === K.SourceFile) {
            const declared = declarationIn(up.statements, name);
            if (declared !== undefined) {
                const hoisted = declared.kind === 'var' || declared.kind === 'function' || declared.kind === 'import';
                if (!hoisted && immediate && at < declared.node.end) {
                    return 'tdz';
                }
                return declared.kind === 'bare-let' && isBodyBlock(up) ? 'hook' : undefined;
            }
            if ((up.kind === K.SourceFile || (ts.isFunctionLike(up.parent) && up.parent.body === up)) && varHoisted(up, name)) {
                return undefined;
            }
        }
    }
    return undefined;
}

/**
 * The read of a slot a hook fills, or of a binding before it exists, that
 * `node` makes when it is evaluated — `{ name, why }`, `why` as `readOf`
 * answers — or undefined: a bare name, the root of a property chain, a
 * shorthand property, a property value, a template substitution. A
 * function's body runs later and is not read.
 */
function letRead(node) {
    const named = (id) => {
        const why = readOf(id);
        return why === undefined ? undefined : { name: id.text, why, where: isDescribeBlock(bodyOf(id)) ? 'a describe body' : 'a function body' };
    };
    switch (node.kind) {
        case K.Identifier:
            return named(node);
        case K.PropertyAccessExpression:
            return letRead(node.expression);
        case K.ParenthesizedExpression:
            return letRead(node.expression);
        case K.ShorthandPropertyAssignment:
            return named(node.name);
        case K.PropertyAssignment:
            return letRead(node.initializer);
        case K.TemplateExpression:
            return node.templateSpans.map((span) => letRead(span.expression)).find((read) => read !== undefined);
        case K.ObjectLiteralExpression:
            return node.properties.map((property) => letRead(property)).find((read) => read !== undefined);
        default:
            return undefined;
    }
}

/** The block that declares the binding `id` reads as a slot, for the message: the nearest block declaring a bare `let` of its name. */
function bodyOf(id) {
    for (let up = id.parent; up; up = up.parent) {
        if (up.kind === K.Block && declarationIn(up.statements, id.text)?.kind === 'bare-let') {
            return up;
        }
    }
    return id;
}

/** Why a registration reads `read`: a slot no hook has filled yet, or a binding not declared yet. */
function readProblem(subject, read) {
    return read.why === 'tdz'
        ? `${subject} reads \`${read.name}\` before its declaration: the registration runs first and the read throws; declare it first, at module top`
        : `${subject} reads \`${read.name}\`, a let of ${read.where}: it is empty until a hook has run, and this registration reads it first; build it at module top`;
}

function bindingIsPlain(name) {
    if (name.kind === K.Identifier) {
        return true;
    }
    return name.elements.every((element) => element.kind !== K.OmittedExpression && !element.initializer && bindingIsPlain(element.name));
}

/** Why `statement` may not stand in a describe body, or undefined. */
function statementProblem(statement) {
    switch (statement.kind) {
        case K.EmptyStatement:
        case K.FunctionDeclaration:
            return undefined;
        case K.ExpressionStatement:
            return expressionProblem(statement.expression);
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
                const read = letRead(list);
                if (read !== undefined) {
                    return read.why === 'tdz'
                        ? `a for...of over \`${read.name}\` before its declaration: the loop runs as the suite is registered and the read throws; declare it first, at module top`
                        : `a for...of over \`${read.name}\`, a let of ${read.where}: it is empty until a hook has run, and this loop runs first; build it at module top`;
                }
            } else if (!(list.kind === K.ArrayLiteralExpression && isLiteral(list))) {
                return 'a for...of over something that is computed: build the items at module top and loop over the name';
            }
            const body = statement.statement.kind === K.Block ? statement.statement.statements : [statement.statement];
            for (const inner of body) {
                const problem = statementProblem(inner);
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

function expressionProblem(expression) {
    if (expression.kind !== K.CallExpression) {
        return `a ${ts.SyntaxKind[expression.kind]} expression, which runs when the suite is registered`;
    }
    const callee = unwrap(expression.expression);
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
        const read = letRead(argument);
        if (read !== undefined) {
            return readProblem(`an argument of ${callee.text}() that`, read);
        }
    }
    return undefined;
}

/** The names that register a test or a hook, whose callbacks run when the test or the hook does: never as the suite is registered. */
const TEST_REGISTRARS = new Set(['it', 'test', 'before', 'after', 'beforeEach', 'afterEach']);

/** Whether `callee` is a test or hook registrar by bare name, with `.skip`, `.only` or `.todo`, in parentheses or not. */
function isTestOrHookCallee(callee) {
    let node = unwrap(callee);
    if (node.kind === K.PropertyAccessExpression && ['skip', 'only', 'todo'].includes(node.name.text)) {
        node = unwrap(node.expression);
    }
    return node.kind === K.Identifier && TEST_REGISTRARS.has(node.text);
}

/**
 * Whether `node` stands inside the body of a test or a hook: inside a
 * function written in place as an argument of a test's or a hook's
 * registering call, at any depth. That body runs when the test does, so what
 * it holds registers nothing.
 */
function inTestOrHookBody(node) {
    for (let up = node.parent; up; up = up.parent) {
        if (isFunction(up) && up.parent?.kind === K.CallExpression && up.parent.arguments.includes(up) && isTestOrHookCallee(up.parent.expression)) {
            return true;
        }
    }
    return false;
}

/** `describe`, `suite`, `test.describe`, `test.suite`, `it.describe`, `it.suite`, each with `.skip`, `.only` or `.todo`, in parentheses or not. */
function isDescribeCallee(callee) {
    let node = unwrap(callee);
    if (node.kind === K.PropertyAccessExpression && ['skip', 'only', 'todo'].includes(node.name.text)) {
        node = unwrap(node.expression);
    }
    if (node.kind === K.Identifier) {
        return node.text === 'describe' || node.text === 'suite';
    }
    return node.kind === K.PropertyAccessExpression && node.expression.kind === K.Identifier && ['test', 'it'].includes(node.expression.text) && ['describe', 'suite'].includes(node.name.text);
}

/**
 * A reference to a describe that is no part of a larger one: `describe` or
 * `suite` by bare name where it is read as a value (never a declared name,
 * an imported one or a property's name), `test.describe`, `test.suite`,
 * `it.describe` or `it.suite`.
 */
function isDescribeRoot(node) {
    if (node.kind === K.PropertyAccessExpression) {
        return node.expression.kind === K.Identifier && ['test', 'it'].includes(node.expression.text) && ['describe', 'suite'].includes(node.name.text);
    }
    if (node.kind !== K.Identifier || !['describe', 'suite'].includes(node.text)) {
        return false;
    }
    const parent = node.parent;
    switch (parent?.kind) {
        case undefined:
        case K.ImportSpecifier:
        case K.ImportClause:
        case K.NamespaceImport:
        case K.ExportSpecifier:
        case K.QualifiedName:
        case K.TypeReference:
        case K.LabeledStatement:
        case K.BreakStatement:
        case K.ContinueStatement:
            return false;
        case K.PropertyAccessExpression:
            return parent.expression === node;
        case K.PropertyAssignment:
            return parent.initializer === node;
        case K.BindingElement:
            // `const { describe } = …` declares the name; `const { describe: d } = …` hands it on under another.
            return parent.propertyName === node && !(parent.name.kind === K.Identifier && parent.name.text === node.text);
        case K.VariableDeclaration:
        case K.Parameter:
        case K.FunctionDeclaration:
        case K.FunctionExpression:
        case K.ClassDeclaration:
        case K.ClassExpression:
        case K.MethodDeclaration:
        case K.PropertyDeclaration:
        case K.GetAccessor:
        case K.SetAccessor:
        case K.PropertySignature:
        case K.MethodSignature:
            return parent.name !== node;
        default:
            return true;
    }
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
        if (isDescribeRoot(node)) {
            // Up through `.skip`, `.only`, `.todo` and parentheses to what is done with it: called, reached through a method, or used as a value.
            let top = node;
            for (let up = top.parent; up && (up.kind === K.ParenthesizedExpression || (up.kind === K.PropertyAccessExpression && up.expression === top && ['skip', 'only', 'todo'].includes(up.name.text))); up = top.parent) {
                top = up;
            }
            const used = top.parent;
            if (used?.kind === K.PropertyAccessExpression && used.expression === top && THROUGH.includes(used.name.text)) {
                report(used, `a describe reached through .${used.name.text}: write the describe itself, which the guard reads (it does not look for the callback among another call's arguments)`);
            } else if (!(used?.kind === K.CallExpression && used.expression === top) && !inTestOrHookBody(node)) {
                report(node, 'a describe used as a value (an alias, a conditional, an argument, a comma, a renamed binding): the guard reads a describe where it is called by its name, so write the call itself');
            }
        }
        if (node.kind === K.CallExpression) {
            if (isDescribeCallee(node.expression)) {
                describes += 1;
                const callback = [...node.arguments].reverse().find((argument) => argument.kind !== K.ObjectLiteralExpression);
                if (!callback || !isFunction(callback)) {
                    report(node, 'a describe whose callback is not a function written in place');
                } else if (!callback.parameters.every((parameter) => !parameter.initializer && bindingIsPlain(parameter.name))) {
                    report(callback, 'a describe callback with a default parameter: the default is computed when the suite is registered');
                } else if (callback.body.kind !== K.Block) {
                    const why = expressionProblem(callback.body);
                    if (why !== undefined) {
                        report(callback.body, why);
                    }
                } else {
                    for (const statement of callback.body.statements) {
                        const why = statementProblem(statement);
                        if (why !== undefined) {
                            report(statement, why);
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
