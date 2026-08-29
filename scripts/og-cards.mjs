#!/usr/bin/env node
/**
 * Renders the three theme OG cards (1200x630) into public/og/.
 *
 * Run it when a theme's look changes or a theme is added; the outputs are
 * committed, because unfurlers need a PNG at a stable URL and rasterising at
 * the edge would mean carrying a font engine there. Headless Chrome, like
 * layout-check — offline: every asset is a file path or inline CSS, and the
 * brand font is the repo's own vendored Inter.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'og');
const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];

const chrome = CHROMES.find((bin) => spawnSync('which', [bin]).status === 0);
if (chrome === undefined) {
    console.error('og-cards: no Chrome found.');
    process.exit(1);
}

const MARK = join(ROOT, 'public', 'apple-touch-icon.png');
const INTER = join(ROOT, 'src', 'ui', 'fonts', 'inter-latin.woff2');

/** One page per look. The shop window in miniature: mark, wordmark, a card. */
function page(theme) {
    const shared = `
        @font-face {
            font-family: Inter;
            src: url('file://${INTER}') format('woff2');
            font-weight: 400 700;
        }
        * { margin: 0; box-sizing: border-box; }
        body {
            width: 1200px; height: 630px; overflow: hidden;
            font-family: ${theme.font};
            background: ${theme.bg};
            background-image: ${theme.backdrop};
            color: ${theme.text};
            position: relative;
        }
        .brand { position: absolute; top: 56px; left: 64px; display: flex; align-items: center; gap: 22px; }
        .brand img { width: 84px; height: 84px; }
        .word { font-size: 76px; font-weight: 700; letter-spacing: ${theme.track}; ${theme.wordExtra} }
        .tag { position: absolute; top: 165px; left: 170px; max-width: 460px; font-size: 26px; line-height: 1.35; color: ${theme.muted}; letter-spacing: ${theme.tagTrack ?? '0'}; ${theme.tagExtra ?? ''} }
        .card {
            position: absolute; right: 84px; top: 150px; width: 430px;
            background: ${theme.surface};
            border: ${theme.cardBorder};
            border-radius: ${theme.radius};
            padding: 34px 36px;
            box-shadow: ${theme.cardShadow};
        }
        .row { display: flex; align-items: center; gap: 22px; }
        .ic {
            width: 72px; height: 72px; border-radius: ${theme.icRadius};
            background: linear-gradient(135deg, ${theme.accent}, ${theme.accent2});
            ${theme.icExtra ?? ''}
            display: grid; place-items: center;
            color: ${theme.bgSolid}; font-weight: 700; font-size: 26px;
        }
        .nm { font-size: 30px; font-weight: 650; }
        .qt { font-size: 19px; color: ${theme.muted}; margin-top: 6px; }
        .rule { border-top: ${theme.rule}; margin: 26px 0 20px; }
        .price { text-align: right; }
        .x { font-size: 54px; font-weight: 700; letter-spacing: -0.01em; }
        .u { font-size: 18px; color: ${theme.muted}; font-weight: 600; letter-spacing: 0.08em; }
        .foot {
            position: absolute; left: 64px; bottom: 52px;
            font-size: 25px; color: ${theme.muted}; letter-spacing: 0.02em;
        }
        .foot b { color: ${theme.accent}; font-weight: 650; }
        .motto {
            position: absolute; left: 64px; top: 280px; width: 520px;
            font-size: 41px; line-height: 1.3; font-weight: 650; letter-spacing: -0.01em;
        }
        ${theme.extraCss ?? ''}
    `;
    return `<!doctype html><html><head><meta charset="utf-8"><style>${shared}</style></head>
    <body>
        ${theme.strip ?? ''}
        <div class="brand"><img src="file://${MARK}"><div class="word">${theme.word}</div></div>
        <div class="tag">${theme.tagline}</div>
        <div class="motto">${theme.motto}</div>
        <div class="card">
            <div class="row"><div class="ic">GT</div><div><div class="nm">Green Tea</div><div class="qt">GREE &middot; 12 left</div></div></div>
            <div class="rule"></div>
            <div class="price"><div class="x">875</div><div class="u">XEC</div></div>
        </div>
        <div class="foot"><b>stall.cash</b> &nbsp;&middot;&nbsp; a shop window on eCash Agora &middot; no keys, no sign-up</div>
    </body></html>`;
}

const THEMES = {
    modern: {
        font: 'Inter, system-ui, sans-serif',
        bg: '#f8f8f6',
        bgSolid: '#f8f8f6',
        backdrop:
            'radial-gradient(1400px 500px at 50% -160px, rgba(37,99,235,0.09), transparent 70%)',
        text: '#14171a',
        muted: '#6b7580',
        accent: '#2563eb',
        accent2: '#2563eb',
        surface: '#ffffff',
        cardBorder: '1px solid rgba(107,117,128,0.16)',
        cardShadow: '0 2px 4px rgba(20,23,26,0.06), 0 18px 50px rgba(20,23,26,0.10)',
        radius: '18px',
        icRadius: '16px',
        rule: '1px solid rgba(107,117,128,0.22)',
        track: '-0.02em',
        word: 'Stall',
        wordExtra: '',
        tagline: 'Your shop, straight from the chain',
        motto: 'A storefront for one seller&rsquo;s listings &mdash; priced as the contract encodes it.',
    },
    neo: {
        font: "'SF Mono', ui-monospace, Menlo, monospace",
        bg: '#080a12',
        bgSolid: '#080a12',
        backdrop: [
            'repeating-linear-gradient(0deg, rgba(24,224,216,0.05) 0 1px, transparent 1px 4px)',
            'repeating-linear-gradient(168deg, rgba(24,224,216,0.16) 0 1px, transparent 1px 34px)',
            'repeating-linear-gradient(172deg, rgba(255,77,122,0.10) 0 1px, transparent 1px 55px)',
            'linear-gradient(180deg, rgba(24,224,216,0.12), #080a12 420px)',
        ].join(', '),
        text: '#dff6ff',
        muted: '#6e86a8',
        accent: '#18e0d8',
        accent2: '#ff4d7a',
        surface: '#111524',
        cardBorder: '1px solid rgba(24,224,216,0.4)',
        cardShadow: 'inset 0 0 24px rgba(24,224,216,0.07), 0 18px 60px rgba(0,0,0,0.6)',
        radius: '0',
        icRadius: '0',
        icExtra: 'clip-path: polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%);',
        rule: '1px solid rgba(24,224,216,0.3)',
        track: '0.10em',
        word: 'STALL',
        wordExtra:
            'color:#18e0d8; text-shadow: 0 0 18px rgba(24,224,216,0.65), 0 0 44px rgba(24,224,216,0.3);',
        tagline: '// your shop, straight from the chain',
        tagTrack: '0.14em',
        motto: 'A storefront for one seller&rsquo;s listings &mdash; priced as the contract encodes it.',
        strip: `<div style="position:absolute;top:0;left:0;right:0;height:44px;border-bottom:1px solid rgba(24,224,216,0.28);display:grid;place-items:center;color:#18e0d8;font-size:17px;letter-spacing:0.42em;">// STALL.CASH</div>`,
    },
    rural: {
        font: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
        bg: '#fbf4e6',
        bgSolid: '#fbf4e6',
        backdrop: [
            'repeating-linear-gradient(0deg, rgba(138,116,88,0.05) 0 1px, transparent 1px 3px)',
            'repeating-linear-gradient(90deg, rgba(138,116,88,0.05) 0 1px, transparent 1px 3px)',
        ].join(', '),
        text: '#3a2c1c',
        muted: '#8a7458',
        accent: '#b4552c',
        accent2: '#8a7458',
        surface: '#f3e7ce',
        cardBorder: '2px dashed rgba(138,116,88,0.6)',
        cardShadow: 'none',
        radius: '14px',
        icRadius: '999px',
        rule: '1px dashed rgba(138,116,88,0.55)',
        track: '0',
        word: 'Stall',
        wordExtra: '',
        tagline: 'Your shop, straight from the chain',
        motto: 'A storefront for one seller&rsquo;s listings &mdash; priced as the contract encodes it.',
        strip: `<div style="position:absolute;top:0;left:0;right:0;height:44px;border-bottom:4px double rgba(138,116,88,0.5);display:grid;place-items:center;color:#8a7458;font-size:17px;letter-spacing:0.3em;">MARKET STALL</div>`,
    },
};

mkdirSync(OUT, { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
    const dir = mkdtempSync(join(tmpdir(), `og-${name}-`));
    const html = join(dir, 'card.html');
    writeFileSync(html, page(theme));
    const png = join(OUT, `stall-${name}.png`);
    const r = spawnSync(chrome, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--user-data-dir=${join(dir, 'profile')}`,
        '--window-size=1200,630',
        `--screenshot=${png}`,
        `file://${html}`,
    ]);
    rmSync(dir, { recursive: true, force: true });
    if (r.status !== 0) {
        console.error(`og-cards: ${name} failed`);
        process.exit(1);
    }
    console.log(`wrote ${png}`);
}
