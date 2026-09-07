#!/usr/bin/env node
// Sample both price feeds and print the gap, so `RATE_DISAGREE_PCT`
// (src/domain/fiat.ts) can be pinned on a measured number instead of one
// sample. Run by hand, on a machine with network, for as long as a day:
//
//     node scripts/rate-gap.mjs [minutes=60] [intervalSeconds=30]
//
// Prints one line per sample and the maximum gap at the end. The gap is
// |a - b| / max(a, b), the same shape `ratesDisagree` uses. Nothing here is
// imported by the app; it is a measuring stick, not a dependency.
const minutes = Number(process.argv[2] ?? 60);
const intervalSeconds = Number(process.argv[3] ?? 30);
const PRIMARY = 'https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd';
const CHECK = 'https://api.coinpaprika.com/v1/tickers/xec-ecash';

async function read(url, pick) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        return { value: pick(await res.json()) };
    } catch (e) {
        return { error: String(e?.message ?? e) };
    }
}

const samples = [];
const deadline = Date.now() + minutes * 60_000;
while (Date.now() < deadline) {
    const [a, b] = await Promise.all([
        read(PRIMARY, (j) => j?.ecash?.usd),
        read(CHECK, (j) => j?.quotes?.USD?.price),
    ]);
    const at = new Date().toISOString();
    if (typeof a.value === 'number' && typeof b.value === 'number' && a.value > 0 && b.value > 0) {
        const gap = Math.abs(a.value - b.value) / Math.max(a.value, b.value);
        samples.push(gap);
        console.log(`${at}  gecko=${a.value}  paprika=${b.value}  gap=${(gap * 100).toFixed(3)}%`);
    } else {
        console.log(`${at}  gecko=${a.error ?? a.value}  paprika=${b.error ?? b.value}  (no gap)`);
    }
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
}
if (samples.length > 0) {
    const max = Math.max(...samples);
    const sorted = [...samples].sort((x, y) => x - y);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    console.log(`\nsamples=${samples.length}  max=${(max * 100).toFixed(3)}%  p95=${(p95 * 100).toFixed(3)}%  line=5%`);
}
