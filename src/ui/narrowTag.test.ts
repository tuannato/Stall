import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            if (name !== 'node_modules') out.push(...walk(path));
        } else if (/\.(ts|mts|mjs|js)$/.test(name) && !/\.test\.(ts|mjs)$/.test(name)) {
            out.push(path);
        }
    }
    return out;
}

/** What names the attribute in code: a string literal of it, or `dataset.narrowTag`, with the call it sits in. */
function namings(): string[] {
    const out: string[] = [];
    for (const file of ['src', 'functions', 'layout', 'workshop'].flatMap((dir) => walk(join(ROOT, dir)))) {
        const text = readFileSync(file, 'utf8');
        if (!text.includes('narrow-tag') && !text.includes('narrowTag')) continue;
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        const at = (node: ts.Node) => `${relative(ROOT, file)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
        const enclosing = (node: ts.Node): string => {
            for (let up: ts.Node | undefined = node.parent; up !== undefined; up = up.parent) {
                if (ts.isFunctionDeclaration(up) && up.name !== undefined) return up.name.text;
            }
            return '(top level)';
        };
        const visit = (node: ts.Node): void => {
            if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /narrow-tag/.test(node.text)) {
                const call = node.parent;
                const how =
                    ts.isCallExpression(call) && call.arguments[0] === node && ts.isPropertyAccessExpression(call.expression)
                        ? call.expression.name.text
                        : 'literal';
                out.push(`${how} in ${enclosing(node)} (${at(node)})`);
            }
            if ((ts.isPropertyAccessExpression(node) && node.name.text === 'narrowTag' && /dataset$/.test(node.expression.getText())) ||
                (ts.isElementAccessExpression(node) && /dataset$/.test(node.expression.getText()) && /narrowTag/.test(node.argumentExpression.getText()))) {
                out.push(`dataset in ${enclosing(node)} (${at(node)})`);
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    return out.map((line) => line.replace(/ \([^)]*\)$/, ''));
}

describe('the-narrow-tag-has-one-writer', () => {
    /**
     * `data-narrow-tag` is a state attribute (`STATE_ATTRIBUTES`) a look may
     * select, so what writes it is held here and not by a string match
     * (round 4, the critic's P3-3): parsed, every naming of it in code under
     * `src/`, `functions/`, `layout/` and `workshop/` is `dressLook`'s one
     * write and the two removals — `dressLook`'s and `paintHome`'s. A second
     * writer, a `dataset` write or a literal held in a variable anywhere
     * turns it red (proved with a planted `setAttribute` in window.ts).
     * Not seen, stated: a name built from pieces at run time.
     */
    it('is written by dressLook alone and taken off by dressLook and paintHome', () => {
        expect(namings().sort()).toEqual(['removeAttribute in dressLook', 'removeAttribute in paintHome', 'setAttribute in dressLook'].sort());
    });
});
