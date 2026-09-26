// Rural · Yard beetle v3 (owner 2026-09-25): the meadow tile, the tall cosmos
// the beetle climbs at the far end, and the beetle's two sprites (walking and
// flying). Seeded, so a re-run writes the same bytes. Ported from the
// approved design mock's generator; run `node scripts/decor/gen-beetle.mjs`
// to regenerate `src/ui/decor/beetle-*.svg`. The mock's second walking frame
// is not shipped: the roam uses one walking sprite.
import { writeFileSync } from 'node:fs';
const out = (n, s) => writeFileSync(new URL(n, new URL('../../src/ui/decor/', import.meta.url)), s);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const r = rng(3);
const W = 320, H = 48;
const G = ['#4A6939', '#5B7B46', '#6F8F55', '#7E9C60'];
const BACK = ['#9DB07F', '#A9BA8C', '#B4C39A'];
const blade = (x, h, lean, col, w) => `<path d="M${x} ${H}c${(lean * 0.3).toFixed(1)} -${(h * 0.5).toFixed(1)} ${(lean * 0.7).toFixed(1)} -${(h * 0.8).toFixed(1)} ${lean.toFixed(1)} -${h.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
const parts = [];
// back meadow: soft, lighter, shorter blades
for (let x = 2; x < W; x += 3 + r() * 4) parts.push(blade(x.toFixed(1), 8 + r() * 12, (r() - 0.5) * 8, BACK[Math.floor(r() * 3)], 1.1));
// soil line
parts.push(`<rect x="0" y="${H - 5}" width="${W}" height="5" fill="#B79A73"/><rect x="0" y="${H - 5}" width="${W}" height="1" fill="#A3865F"/>`);
// flowers & bits (front)
const daisy = (x, h) => `<path d="M${x} ${H}V${H - h}" stroke="#5B7B46" stroke-width="1.2"/>` + [0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="${x}" cy="${H - h - 3.2}" rx="1.3" ry="3" fill="#FBF6EA" transform="rotate(${a} ${x} ${H - h})"/>`).join('') + `<circle cx="${x}" cy="${H - h}" r="1.9" fill="#E0B23C"/>`;
const poppy = (x, h) => `<path d="M${x} ${H}c0-${h * 0.5} 2-${h * 0.8} 1-${h}" fill="none" stroke="#5B7B46" stroke-width="1.3"/><path d="M${x + 1} ${H - h}c-5 0-6.5-4-4-6.5 1.5-1.4 3.4-.8 4 .4 .6-1.2 2.5-1.8 4-.4 2.5 2.5 1 6.5-4 6.5z" fill="#C1502A"/><circle cx="${x + 1}" cy="${H - h - 2}" r="1.3" fill="#5E2610"/>`;
const bell = (x, h) => `<path d="M${x} ${H}V${H - h}" stroke="#5B7B46" stroke-width="1.1"/><path d="M${x - 2.4} ${H - h + 1}q2.4-6 4.8 0z" fill="#8C7AB8"/><path d="M${x + 2} ${H - h + 7}q2.2-5 4.4 0z" fill="#9C8BC4"/><path d="M${x} ${H - h + 5}q1.5 1 3 2" stroke="#5B7B46" stroke-width=".9" fill="none"/>`;
const shroom = (x) => `<rect x="${x - 1.2}" y="${H - 9}" width="2.4" height="5" rx="1" fill="#F1E6D0"/><path d="M${x - 5} ${H - 8.5}q5-7 10 0z" fill="#C1502A"/><circle cx="${x - 2}" cy="${H - 11}" r=".9" fill="#FBF6EA"/><circle cx="${x + 1.8}" cy="${H - 10.4}" r=".8" fill="#FBF6EA"/>`;
const stone = (x) => `<ellipse cx="${x}" cy="${H - 4.2}" rx="5.5" ry="2.4" fill="#A79D8B"/><ellipse cx="${x - 0.8}" cy="${H - 5}" rx="3.6" ry="1.4" fill="#C2B9A6"/>`;
const tuft = (x) => [0, 1, 2, 3].map((i) => blade((x + i * 2.2).toFixed(1), 10 + r() * 14, (r() - 0.3) * 9, G[Math.floor(r() * 4)], 1.5)).join('');
const plan = [['tuft', 6], ['daisy', 22, 20], ['tuft', 34], ['stone', 52], ['poppy', 66, 24], ['tuft', 78], ['bell', 98, 22], ['tuft', 112], ['shroom', 130], ['tuft', 140], ['daisy', 158, 16], ['tuft', 170], ['poppy', 190, 20], ['tuft', 204], ['stone', 222], ['tuft', 236], ['daisy', 252, 22], ['bell', 268, 18], ['tuft', 282], ['tuft', 300]];
for (const [k, x, h] of plan) parts.push(k === 'tuft' ? tuft(x) : k === 'daisy' ? daisy(x, h) : k === 'poppy' ? poppy(x, h) : k === 'bell' ? bell(x, h) : k === 'shroom' ? shroom(x) : stone(x));
out('beetle-yard-v3.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join('')}</svg>`);
// the tall bloom the beetle climbs (cosmos), 60 tall
out('beetle-bloom.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 62" width="30" height="62"><path d="M15 62c0-18 1-34-1-50" fill="none" stroke="#4A6939" stroke-width="2"/><path d="M14.5 40c-5-2-8-6-8-10 4 1 7 4 8 9z" fill="#5B7B46"/><path d="M15 30c5-2 8-5 8.5-9-4 .5-7 3.5-8.5 8z" fill="#6F8F55"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="15" cy="4.5" rx="3.2" ry="6" fill="#E9A3B8" transform="rotate(${a} 15 11)"/>`).join('') + `<circle cx="15" cy="11" r="3.4" fill="#E0B23C"/><circle cx="15" cy="11" r="1.6" fill="#B8862A"/></svg>`);
// beetle, walking (head to the right)
const legs = (dy) => `<g stroke="#3A2716" stroke-width="1.5" stroke-linecap="round" fill="none"><path d="M13 ${21 + dy}l-3 4-3 1"/><path d="M20 ${22 + dy}l-1 4-3 1.2"/><path d="M28 ${22 + dy}l2 4 3 1"/><path d="M16 ${22 - dy}l-1 4-3 1"/><path d="M24 ${22 - dy}l1 4 3 1"/><path d="M31 ${21 - dy}l3 3.5 3 1"/></g>`;
const head = `<path d="M34.5 13c3-3.6 5.2-4 7-6.8" stroke="#3A2716" stroke-width="1.3" fill="none"/><circle cx="41.8" cy="6" r="1.4" fill="#3A2716"/><path d="M35.5 12.4c3-.6 5.4-.2 7.6-1.6" stroke="#3A2716" stroke-width="1.3" fill="none"/><circle cx="43.3" cy="10.7" r="1.4" fill="#3A2716"/><path d="M31 21a5.6 5.6 0 1 0 5.6-9.4z" fill="#241710"/><circle cx="36.2" cy="14.6" r="1.25" fill="#FFF6E6"/><circle cx="33.6" cy="13.4" r=".9" fill="#FFF6E6"/>`;
const shell = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2582E"/><stop offset=".55" stop-color="#B2461F"/><stop offset="1" stop-color="#8B3614"/></linearGradient></defs><path d="M4 22C3.6 12.4 10 6 18.5 6S33 12 33.4 22z" fill="url(#s)" stroke="#5A230E" stroke-width="1.1"/><path d="M18.5 6.3V22" stroke="#4A1D0B" stroke-width="1"/><g fill="#1E120B"><circle cx="18.5" cy="9.6" r="2.3"/><circle cx="11.5" cy="12.8" r="2.4"/><circle cx="25.6" cy="12.8" r="2.4"/><circle cx="9" cy="18.6" r="2.1"/><circle cx="28" cy="18.6" r="2.1"/><circle cx="14.5" cy="17.4" r="1.7"/><circle cx="22.6" cy="17.4" r="1.7"/></g><path d="M9.5 11.5C11.5 8.6 14.6 7.2 17.2 7" stroke="#FFF1E0" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".75"/>`;
out('beetle-walk.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 30" width="46" height="30">${legs(0)}${head}${shell}</svg>`);
// flying: elytra lifted, hind wings out
out('beetle-fly.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 30" width="46" height="30"><path d="M16 12c-6-8-14-9-15-5 1 5 8 7 15 7z" fill="#EAF2F4" fill-opacity=".75" stroke="#B9C7CC" stroke-width=".6"/><path d="M22 12c6-9 15-11 17-7-1 5-9 8-17 8z" fill="#EAF2F4" fill-opacity=".75" stroke="#B9C7CC" stroke-width=".6"/>${head}<g stroke="#3A2716" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M15 21l-2 4"/><path d="M20 22l0 4"/><path d="M26 21l2 4"/></g><path d="M8 21c1-6 6-9 10.5-9s9.5 3 10.5 9z" fill="#241710"/><path d="M8 20.5C5.5 14 7 8.5 12 6.5c1.5 5 1 10-4 14z" fill="url(#s)" stroke="#5A230E" stroke-width="1"/><path d="M29 20.5c2.5-6.5 1-12-4-14-1.5 5-1 10 4 14z" fill="url(#s)" stroke="#5A230E" stroke-width="1"/><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2582E"/><stop offset="1" stop-color="#8B3614"/></linearGradient></defs><g fill="#1E120B"><circle cx="10" cy="12" r="1.6"/><circle cx="9.4" cy="17" r="1.4"/><circle cx="27" cy="12" r="1.6"/><circle cx="27.6" cy="17" r="1.4"/></g></svg>`);
