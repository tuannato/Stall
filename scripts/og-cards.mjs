#!/usr/bin/env node
/**
 * Renders the three theme OG cards (1200x630) into public/og/.
 *
 * The cards are the design's own files, checked in verbatim under
 * `scripts/og/` (pulled from the Stall Design project's `unfurl/` group,
 * 2026-08-30) — self-contained HTML with the logo and the Inter subset
 * embedded as data URIs, so the render is offline and reproducible. This
 * script no longer composes a page of its own: when a card should change,
 * the design changes and this file only shoots it.
 *
 * Run it when a card's design changes or a theme is added; the outputs are
 * committed, because unfurlers need a PNG at a stable URL and rasterising at
 * the edge would mean carrying a font engine there. Headless Chrome, like
 * layout-check. 1200x630 is safely above the ~500px width floor new
 * headless silently clamps to (layout/PROBE-RULES.md).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CARDS = join(ROOT, 'scripts', 'og');
const OUT = join(ROOT, 'public', 'og');
const LOOKS = ['modern', 'neo', 'rural'];
const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];

const chrome = CHROMES.find((bin) => spawnSync('which', [bin]).status === 0);
if (chrome === undefined) {
    console.error('og-cards: no Chrome found.');
    process.exit(1);
}

mkdirSync(OUT, { recursive: true });
let failed = false;
for (const look of LOOKS) {
    const html = join(CARDS, `og-${look}.html`);
    if (!existsSync(html)) {
        console.error(`og-cards: missing ${html}`);
        failed = true;
        continue;
    }
    const png = join(OUT, `stall-${look}.png`);
    const profile = mkdtempSync(join(tmpdir(), 'stall-og-'));
    const r = spawnSync(chrome, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--user-data-dir=${profile}`,
        '--window-size=1200,630',
        '--force-device-scale-factor=1',
        // The fonts are data URIs, but give the raster a settled frame.
        '--virtual-time-budget=3000',
        `--screenshot=${png}`,
        `file://${html}`,
    ]);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (r.status !== 0) {
        console.error(`og-cards: chrome failed on ${look}: ${r.stderr}`);
        failed = true;
        continue;
    }
    const size = statSync(png).size;
    // A near-empty shot means the page never painted; say so instead of
    // committing a blank card.
    if (size < 20_000) {
        console.error(`og-cards: ${png} is ${size} bytes — looks unpainted.`);
        failed = true;
        continue;
    }
    console.log(`og-cards: wrote ${png} (${Math.round(size / 1024)} KB)`);
}
process.exit(failed ? 1 : 0);
