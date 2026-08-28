import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            out.push(...walk(p));
        } else if (p.endsWith('.ts') || p.endsWith('.css')) {
            out.push(p);
        }
    }
    return out;
}

/**
 * The file with its comments removed.
 *
 * This wall is a text scan, and it cannot tell prose from code. Twice now a
 * comment explaining *why* a module never touches the DOM has tripped the rule
 * against touching the DOM — which pushes an author towards writing a worse
 * comment to appease a grep, and a rule that punishes explaining itself is
 * worse than no rule.
 *
 * Stripping comments makes the scan strictly more accurate, not weaker: a
 * comment cannot call `document`, import chronik, or read `localStorage`. Only
 * code can, and only code is what is left.
 */
export function stripForTest(source: string): string {
    return strip(source);
}

function strip(source: string): string {
    return (
        source
            // Block comments, which is where the long explanations live.
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Line comments only when they are the whole line. Telling a
            // trailing `//` from one inside a string needs a real tokeniser,
            // and a guard is not worth one — a trailing comment that trips the
            // scan can be written as a block comment instead.
            .replace(/^[ \t]*\/\/.*$/gm, '')
    );
}

function read(p: string): string {
    return strip(readFileSync(p, 'utf8'));
}

describe('directory-walls', () => {
    it('keeps domain pure, net off document, ui off chronik, and keys empty', () => {
        const files = walk(SRC);
        for (const file of files) {
            const rel = relative(SRC, file).replaceAll('\\', '/');
            const text = read(file);
            if (rel.startsWith('domain/')) {
                expect(text, rel).not.toMatch(/\bdocument\b/);
                expect(text, rel).not.toMatch(/\bfetch\s*\(/);
                expect(text, rel).not.toMatch(/from ['"]chronik-client['"]/);
                expect(text, rel).not.toMatch(/from ['"]ecash-agora['"]/);
            }
            if (rel.startsWith('net/')) {
                expect(text, rel).not.toMatch(/\bdocument\b/);
                expect(text, rel).not.toMatch(/localStorage/);
            }
            if (rel.startsWith('ui/')) {
                expect(text, rel).not.toMatch(/from ['"]chronik-client['"]/);
                expect(text, rel).not.toMatch(/from ['"]ecash-agora['"]/);
            }
            expect(text, rel).not.toMatch(/from ['"]ecash-wallet['"]/);
        }
        const keys = readdirSync(join(SRC, 'keys'));
        expect(keys).toEqual(['.gitkeep']);
    });
});

describe('directory-walls-still-sees-code', () => {
    /**
     * Stripping comments must not blind the scan. Proved on strings shaped like
     * the real thing rather than by editing a source file: a guard that is only
     * ever exercised by the code that happens to be there is a guard nobody has
     * seen fail.
     */
    it('strips prose and keeps the statements', () => {
        const stripped = stripForTest(
            [
                '/** This module never touches the document. */',
                "        // It does not import from 'chronik-client' either.",
                "import { thing } from 'chronik-client';",
                'const el = document.body;',
                'const url = "https://example.com/a//b";',
            ].join('\n'),
        );
        // The prose is gone.
        expect(stripped).not.toContain('never touches');
        expect(stripped).not.toContain('does not import');
        // The code is not.
        expect(stripped).toMatch(/from ['"]chronik-client['"]/);
        expect(stripped).toMatch(/\bdocument\b/);
        // A `//` inside a string is not a comment.
        expect(stripped).toContain('https://example.com/a//b');
    });
});
