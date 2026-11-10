// @vitest-environment happy-dom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { SCREENS, handlers } from '../../layout/fixtures';
import { measuredLooks, paintView } from '../../layout/looks';
import { CARD_FIGURE_CEILINGS, FIGURE_STEP_CEILINGS, STRIP_BREAK_CHARS, cardFigureTier, markFigureStep, renderStall } from './render';

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

/** What names the attribute in code: a string literal of it, or `dataset.figureStep`, with the call it sits in. */
function namings(): string[] {
    const out: string[] = [];
    for (const file of ['src', 'functions', 'layout', 'workshop'].flatMap((dir) => walk(join(ROOT, dir)))) {
        const text = readFileSync(file, 'utf8');
        if (!text.includes('figure-step') && !text.includes('figureStep')) continue;
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        const at = (node: ts.Node) => `${relative(ROOT, file)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
        const enclosing = (node: ts.Node): string => {
            for (let up: ts.Node | undefined = node.parent; up !== undefined; up = up.parent) {
                if (ts.isFunctionDeclaration(up) && up.name !== undefined) return up.name.text;
            }
            return '(top level)';
        };
        const visit = (node: ts.Node): void => {
            if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && /data-figure-step(?![\w-])/.test(node.text)) {
                const call = node.parent;
                const how =
                    ts.isCallExpression(call) && call.arguments[0] === node && ts.isPropertyAccessExpression(call.expression)
                        ? call.expression.name.text
                        : 'literal';
                out.push(`${how} in ${enclosing(node)} (${at(node)})`);
            }
            if (
                (ts.isPropertyAccessExpression(node) && node.name.text === 'figureStep' && /dataset$/.test(node.expression.getText())) ||
                (ts.isElementAccessExpression(node) && /dataset$/.test(node.expression.getText()) && /figureStep/.test(node.argumentExpression.getText()))
            ) {
                out.push(`dataset in ${enclosing(node)} (${at(node)})`);
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    return out.map((line) => line.replace(/ \([^)]*\)$/, ''));
}

describe('the-figure-step-has-one-writer', () => {
    /**
     * `data-figure-step` is a hook a look may select (`LOOK_HOOK_ATTRIBUTES`
     * in `scripts/workshop-css.mjs`, step 8g3-pre), so what writes it is held
     * here and not by a string match: parsed, every naming of it in code
     * under `src/`, `functions/`, `layout/` and `workshop/` is
     * `markFigureStep`'s one write and one removal, and the probe's two reads
     * in `cardFigureFaults` and `honestFigureStepOf`, and the one literal the probe page asks the loaded stylesheets with (`namesStep`, `loadedSheetNames`: it reads a sheet's selectors, not an element; step 8g3-honest). A second writer, a `dataset` write, or a literal
     * held in a variable or a template anywhere turns it red. Not seen,
     * stated: a name built from pieces at run time.
     */
    it('is written and taken off by markFigureStep alone, and read by the probe', () => {
        expect(namings().sort()).toEqual(['getAttribute in cardFigureFaults', 'getAttribute in honestFigureStepOf', 'literal in (top level)', 'removeAttribute in markFigureStep', 'setAttribute in markFigureStep'].sort());
    });
});

describe('pins the figure steps by value', () => {
    /**
     * The table is a number a fourth look may not move (CLAUDE.md §6): a look
     * that sizes by a step has its rules mapped to these cuts. Every
     * expectation is a literal, never the symbol it tests.
     */
    it('is six steps over 9, 11, 14, 17 and 21, the last three the card ladder\'s tiers, the fifth starting where the strip breaks', () => {
        expect([...FIGURE_STEP_CEILINGS]).toEqual([9, 11, 14, 17, 21]);
        expect([...CARD_FIGURE_CEILINGS]).toEqual([14, 17, 21]);
        expect([...FIGURE_STEP_CEILINGS.slice(2)]).toEqual([14, 17, 21]);
        expect(STRIP_BREAK_CHARS).toBe(18);
        expect(FIGURE_STEP_CEILINGS[3] + 1).toBe(18);
    });

    it('marks each length with its step, and steps 4, 5 and 6 are tiers 1, 2 and 3', () => {
        const row = document.createElement('div');
        const stepOf = (length: number): string | null => {
            markFigureStep(row, '9'.repeat(length));
            return row.getAttribute('data-figure-step');
        };
        const expected: Record<number, string> = { 1: '1', 4: '1', 9: '1', 10: '2', 11: '2', 12: '3', 14: '3', 15: '4', 17: '4', 18: '5', 21: '5', 22: '6', 26: '6', 30: '6' };
        for (const [length, step] of Object.entries(expected)) expect(stepOf(Number(length)), `${length} characters`).toBe(step);
        for (let length = 1; length <= 40; length += 1) {
            const step = Number(stepOf(length));
            const tier = cardFigureTier('9'.repeat(length));
            expect(step >= 4 ? step - 3 : 0, `${length} characters: step ${step}, tier ${tier}`).toBe(tier);
        }
    });

    it('takes the step off a row that holds no figure', () => {
        const row = document.createElement('div');
        markFigureStep(row, '1,234');
        expect(row.getAttribute('data-figure-step')).toBe('1');
        markFigureStep(row, '');
        expect(row.hasAttribute('data-figure-step')).toBe(false);
    });
});

/** A row's own child matching a selector (`:scope >`, which happy-dom does not read). */
function child(row: Element, selector: string): Element | undefined {
    return [...row.children].find((c) => c.matches(selector));
}

/** The figure each place's money node holds, as the step counts it, and the row that carries the step. */
const PLACES: readonly (readonly [string, string, (row: Element) => string | undefined])[] = [
    ['face', '.face-x', (row) => child(row, '[data-role="price"], [data-role="seller-price"]')?.textContent ?? undefined],
    ['paid', '.row.big', (row) => child(row, 'dd')?.textContent?.replace(/ XEC$/, '')],
    ['pay', '.pay-x', (row) => child(row, '[data-role="price"]')?.textContent ?? undefined],
    ['strip', '.sel-totalblk', (row) => child(row, '[data-role="selection-total"]')?.textContent ?? undefined],
];

describe('every-figure-step-is-painted-on-every-surface', () => {
    /**
     * The four places `markFigureStep` is called from carry the step their
     * own figure earns, on every probe screen and every look a vitest run
     * measures, and between them the screens paint all six steps on each of
     * the four (the probe owes the same in Chrome, `FIGURE_STEPS_OWED`). A
     * pay sheet with no rate holds no figure and carries no step.
     */
    const looks = measuredLooks().filter((l) => ['t-modern', 't-neo', 't-rural', 't-skeleton'].includes(l.theme.sheetClass));
    const root = document.createElement('div');
    root.id = 'app';
    const seen: Record<string, Set<string>> = {};
    const wrong: string[] = [];
    document.body.append(root);
    for (const look of looks) {
        for (const [screen, view] of Object.entries(SCREENS)) {
            renderStall(root, paintView(view, look, []), handlers);
            for (const [place, selector, figureOf] of PLACES) {
                for (const row of root.querySelectorAll(selector)) {
                    const figure = figureOf(row);
                    const step = row.getAttribute('data-figure-step');
                    if (figure === undefined || figure === '') {
                        if (step !== null) wrong.push(`${look.theme.sheetClass} ${screen} ${place}: no figure, step ${step}`);
                        continue;
                    }
                    const probe = document.createElement('div');
                    markFigureStep(probe, figure);
                    if (step !== probe.getAttribute('data-figure-step')) wrong.push(`${look.theme.sheetClass} ${screen} ${place}: "${figure}" carries ${step}`);
                    if (step !== null) (seen[place] ??= new Set()).add(step);
                }
            }
        }
    }
    root.remove();

    it('carries the step each figure earns', () => {
        expect(wrong).toEqual([]);
    });

    it('paints all six steps on each of the four places', () => {
        for (const [place] of PLACES) expect([...(seen[place] ?? [])].sort(), place).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('carries no step on a pay sheet with no rate yet', () => {
        const look = looks[0]!;
        const box = document.createElement('div');
        renderStall(box, paintView({ ...SCREENS['pay']!, payRate: undefined }, look, []), handlers);
        const row = box.querySelector('.pay-x');
        expect(row, 'the pay sheet paints its figure row').not.toBeNull();
        expect(row!.hasAttribute('data-figure-step')).toBe(false);
    });
});
