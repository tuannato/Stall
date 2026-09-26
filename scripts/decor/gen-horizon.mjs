// Neo · Grid horizon v6 (option B, owner 2026-09-25): the skyline standing on
// the horizon line, a crescent moon and stars. Seeded, so a re-run writes the
// same bytes. Ported from the approved design mock's generators (the skyline
// and the sky); run `node scripts/decor/gen-horizon.mjs` to regenerate
// `src/ui/decor/horizon-*.svg`. The colours are Neo's own literals: drawn art
// cannot follow a mood, and `stall.css`'s rule says what that costs.
import { writeFileSync } from 'node:fs';
const OUT = new URL('../../src/ui/decor/', import.meta.url);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const BODY = '#0b1122', RIM = '#2ce9e0';
const LIT = [['#2ce9e0', 0.9], ['#ff4d7a', 0.85], ['#ffd27a', 0.8]];
function cluster({ w, h, seed, profile, antenna }) {
  const r = rng(seed); let x = 0; const parts = [];
  while (x < w) {
    const bw = 7 + Math.floor(r() * 14);
    const t = (x + bw / 2) / w;
    const bh = Math.max(4, Math.round(profile(t) * h * (0.7 + r() * 0.3)));
    const y = h - bh;
    parts.push(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${BODY}"/>`);
    parts.push(`<rect x="${x}" y="${y}" width="${bw}" height="0.8" fill="${RIM}" fill-opacity="0.35"/>`);
    // windows
    for (let wy = y + 3; wy < h - 2; wy += 3.2) for (let wx = x + 2; wx < x + bw - 2; wx += 2.8) {
      if (r() < 0.16) { const [c, o] = LIT[Math.floor(r() * LIT.length)]; parts.push(`<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="1.3" height="1.7" fill="${c}" fill-opacity="${o}"/>`); }
    }
    if (antenna && bh > h * 0.8 && r() < 0.5) {
      const ax = x + bw / 2; parts.push(`<rect x="${(ax - 0.4).toFixed(1)}" y="${y - 6}" width="0.8" height="6" fill="${BODY}"/><circle cx="${ax}" cy="${y - 6.4}" r="0.9" fill="#ff4d7a"/>`);
    }
    x += bw + (r() < 0.3 ? 1 : 0);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 ${w} ${h + 8}" width="${w}" height="${h + 8}">${parts.join('')}</svg>`;
}
const H = 30;
writeFileSync(new URL('horizon-sky-left.svg', OUT), cluster({ w: 150, h: H, seed: 7, antenna: true, profile: (t) => 1 - 0.75 * t }));
writeFileSync(new URL('horizon-sky-right.svg', OUT), cluster({ w: 150, h: H, seed: 21, antenna: true, profile: (t) => 0.25 + 0.75 * t }));
writeFileSync(new URL('horizon-sky-fill.svg', OUT), cluster({ w: 220, h: H, seed: 42, antenna: false, profile: () => 0.3 }));

const rs = rng(99); const stars = [];
for (let i = 0; i < 16; i++) { const x = (rs() * 240).toFixed(1), y = (rs() * 56).toFixed(1), rad = (0.4 + rs() * 0.7).toFixed(2); const c = rs() < 0.7 ? '#e8fbff' : '#2ce9e0'; stars.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="${c}" fill-opacity="${(0.35 + rs() * 0.5).toFixed(2)}"/>`); }
writeFileSync(new URL('horizon-stars.svg', OUT), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60">${stars.join('')}</svg>`);
writeFileSync(new URL('horizon-moon.svg', OUT), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40"><defs><radialGradient id="g"><stop offset="0" stop-color="#ffe9b8" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient><mask id="m"><rect width="40" height="40" fill="#fff"/><circle cx="24" cy="17" r="8.5" fill="#000"/></mask></defs><circle cx="20" cy="20" r="19" fill="url(#g)"/><circle cx="20" cy="20" r="9" fill="#ffe9b8" mask="url(#m)"/></svg>`);
