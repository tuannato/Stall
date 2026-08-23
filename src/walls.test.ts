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

function read(p: string): string {
    return readFileSync(p, 'utf8');
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
