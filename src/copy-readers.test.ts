import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            walk(p, out);
        } else if ((p.endsWith('.ts') || p.endsWith('.mjs')) && !p.endsWith('.test.ts')) {
            out.push(p);
        }
    }
    return out;
}

describe('every-copy-constant-has-a-reader', () => {
    /**
     * `copy.ts` is the product's spec, and a constant nothing paints is a
     * sentence the spec still argues for while no screen carries it — the
     * copy analogue of `every-theme-var-reaches-the-stylesheet`. A test that
     * asserts the constant's text is not a reader: it documents wording a
     * visitor never sees. Readers are the app, the edge, the probe fixtures
     * and the pay-screens audit; a constant with none is deleted, never kept.
     */
    it('finds a reader outside copy.ts and the tests for every export', () => {
        const copy = readFileSync(join(ROOT, 'src', 'ui', 'copy.ts'), 'utf8');
        const names = [...copy.matchAll(/^export (?:const|function) ([A-Za-z_][A-Za-z0-9_]*)/gm)].map(
            (m) => m[1]!,
        );
        expect(names.length).toBeGreaterThan(300);
        const readers = [
            ...walk(join(ROOT, 'src')),
            ...walk(join(ROOT, 'functions')),
            ...walk(join(ROOT, 'layout')),
            join(ROOT, 'scripts', 'pay-screens.mjs'),
        ].filter((p) => !p.endsWith(join('ui', 'copy.ts')));
        const blob = readers.map((p) => readFileSync(p, 'utf8')).join('\n');
        // A reader inside copy.ts counts too (`summaryLine` calls
        // `descBytesLeft`): more than the one occurrence that is its own
        // definition.
        const orphans = names.filter((name) => {
            const re = new RegExp(`\\b${name}\\b`, 'g');
            const inCopy = (copy.match(re) ?? []).length;
            return !re.test(blob) && inCopy <= 1;
        });
        expect(orphans, 'copy constants nothing paints').toEqual([]);
    });
});
