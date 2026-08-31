/**
 * Read-only traffic report for stall.cash, from Cloudflare's edge analytics.
 *
 * WHY THIS SHAPE — read before "improving" it. AGENTS.md §7 bans analytics
 * *in the app*: no beacon script, no cookie, no third-party tag ever ships
 * to a visitor, and that rule stands (owner re-confirmed 2026-08-31 when
 * asking for this visibility). What this script reads is what Cloudflare
 * already records by being the CDN — the page cannot opt out of its own
 * edge — so running it adds zero collection. It runs on the owner's
 * machine with the owner's token; nothing in the repo or the deploy calls
 * it.
 *
 * Usage:
 *   CF_API_TOKEN=<token> CF_ZONE_ID=<hex32> node scripts/traffic.mjs [days]
 *
 * The token needs "Account Analytics: Read" / zone "Analytics: Read" only —
 * make a dedicated one, never reuse a deploy token. With CF_ZONE_ID unset
 * the script looks the zone up by name, which additionally needs
 * "Zone: Read". Days defaults to 7, capped at 30 (the free-plan window).
 *
 * The GraphQL dataset (`httpRequests1dGroups`) is the one the dashboard's
 * own Analytics tab reads, available on free zones. Field names follow the
 * public schema as this was written (2026-08-31) and are NOT live-verified —
 * this machine holds no Cloudflare token on purpose — so on the first run,
 * trust the error text over this file: the script prints Cloudflare's
 * errors verbatim rather than guessing.
 *
 * Ceiling, stated: zone totals fold every hostname on the zone together —
 * stall.cash and icons.stall.cash are one number here. The per-hostname
 * split lives in `httpRequestsAdaptiveGroups`, which needs a paid plan; do
 * not add it speculatively.
 */

const API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'stall.cash';

const token = process.env.CF_API_TOKEN;
if (!token) {
    console.error('CF_API_TOKEN is not set. Make a read-only Analytics token in the Cloudflare dashboard.');
    process.exit(1);
}
const days = Math.min(Math.max(Number(process.argv[2] ?? 7) || 7, 1), 30);

async function cf(path, init = {}) {
    const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    });
    const body = await res.json();
    if (!res.ok || body.success === false || body.errors?.length) {
        console.error(`Cloudflare answered ${res.status} for ${path}:`);
        console.error(JSON.stringify(body.errors ?? body, null, 2));
        process.exit(1);
    }
    return body;
}

let zoneId = process.env.CF_ZONE_ID;
if (!zoneId) {
    const zones = await cf(`/zones?name=${ZONE_NAME}`);
    zoneId = zones.result?.[0]?.id;
    if (!zoneId) {
        console.error(`No zone named ${ZONE_NAME} visible to this token — set CF_ZONE_ID, or add Zone:Read.`);
        process.exit(1);
    }
}

const until = new Date();
const since = new Date(until.getTime() - days * 86_400_000);
const day = (d) => d.toISOString().slice(0, 10);

// Dates are inlined rather than passed as typed variables: the two date
// scalars have moved names in Cloudflare's schema before, and an inline
// string literal is accepted wherever the filter is. Both values come from
// our own Date objects above, never from input.
const query = `
query($zone: String!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      httpRequests1dGroups(
        limit: 31,
        filter: { date_geq: "${day(since)}", date_leq: "${day(until)}" },
        orderBy: [date_ASC]
      ) {
        dimensions { date }
        sum {
          requests
          pageViews
          cachedRequests
          bytes
          countryMap { clientCountryName requests }
          responseStatusMap { edgeResponseStatus requests }
        }
        uniq { uniques }
      }
    }
  }
}`;

const body = await cf('/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables: { zone: zoneId } }),
});
if (body.errors?.length) {
    console.error('GraphQL errors, verbatim:');
    console.error(JSON.stringify(body.errors, null, 2));
    process.exit(1);
}

const groups = body.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
if (groups.length === 0) {
    console.log(`No analytics rows for ${ZONE_NAME} in the last ${days} day(s).`);
    process.exit(0);
}

const mb = (n) => (n / 1_048_576).toFixed(1);
let requests = 0, pageViews = 0, cached = 0, bytes = 0, uniques = 0;
const countries = new Map();
const statuses = new Map();

console.log(`\n${ZONE_NAME} — last ${days} day(s), zone-wide (icons host included)\n`);
console.log('date        requests  pageviews  uniques   cached  MB served');
for (const g of groups) {
    const s = g.sum;
    requests += s.requests; pageViews += s.pageViews; cached += s.cachedRequests;
    bytes += s.bytes; uniques += g.uniq.uniques;
    for (const c of s.countryMap ?? []) {
        countries.set(c.clientCountryName, (countries.get(c.clientCountryName) ?? 0) + c.requests);
    }
    for (const r of s.responseStatusMap ?? []) {
        statuses.set(r.edgeResponseStatus, (statuses.get(r.edgeResponseStatus) ?? 0) + r.requests);
    }
    console.log(
        `${g.dimensions.date}  ${String(s.requests).padStart(8)}  ${String(s.pageViews).padStart(9)}` +
        `  ${String(g.uniq.uniques).padStart(7)}  ${String(s.cachedRequests).padStart(7)}  ${mb(s.bytes).padStart(9)}`,
    );
}
console.log('—'.repeat(58));
console.log(
    `totals      ${String(requests).padStart(8)}  ${String(pageViews).padStart(9)}` +
    `  ${String(uniques).padStart(7)}  ${String(cached).padStart(7)}  ${mb(bytes).padStart(9)}`,
);
console.log('\n(uniques are per-day figures summed — cross-day repeat visitors count once per day)');

const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log('\nTop countries:');
for (const [name, n] of top(countries, 8)) console.log(`  ${String(n).padStart(8)}  ${name}`);
console.log('\nStatus classes:');
for (const [code, n] of top(statuses, 8)) console.log(`  ${String(n).padStart(8)}  ${code}`);
console.log();
