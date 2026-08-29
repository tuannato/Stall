/**
 * The per-stall unfurl: /s/<seller> answers with the same document, the same
 * status and the same headers as before — measured under `wrangler pages
 * dev`, the loop that has matched live Pages on every behaviour recorded in
 * CLAUDE.md §9: `_headers` (the CSP among them) survives `context.next()`
 * and an HTMLRewriter transform of it — but the social card now belongs to
 * the stall it points at. Verify on the live origin after the next deploy;
 * `deploy/README.md` carries the check.
 *
 * **Failure is a passthrough, never an error page.** The static pipeline is
 * the product; this function is garnish on it, and any throw returns the
 * untouched upstream. Rewrites go through `setAttribute`/`setInnerContent`
 * only, which HTMLRewriter escapes — no string HTML anywhere.
 */
import { chronikFetcher, resolveManifestTextByHash, stallHashOf } from '../lib/resolve';
import { ogImageFor, sellerIdentity, unfurlText } from '../lib/unfurl';

/**
 * The Workers runtime global, declared minimally rather than pulling
 * `@cloudflare/workers-types` in as a dependency for one class: the shape
 * used here is three members, and a types package would be the first new
 * dependency this repo takes for tooling alone.
 */
declare class HTMLRewriter {
    on(selector: string, handlers: unknown): this;
    transform(response: Response): Response;
}

type PagesContext = {
    request: Request;
    next: () => Promise<Response>;
    params: { seller?: string | string[] };
    waitUntil: (promise: Promise<unknown>) => void;
};

type ResolvedText = { name: string; tagline?: string; themeId: number };

/**
 * The manifest name and tagline, through the protobuf-lite walk in
 * `../lib/resolve` — the same trust rules as the app's reader (authorship by
 * the stall's own key, the finalized-first winner), drift-guarded in
 * `src/unfurl.test.ts` — behind a per-seller edge cache so the three
 * community chronik nodes never gain an unbounded second consumer: one walk
 * per stall per five minutes however many links unfurl, two minutes for a
 * miss so a fresh publish is not invisible for long.
 */
async function resolveStallText(
    seller: string,
    waitUntil: (p: Promise<unknown>) => void,
): Promise<ResolvedText | undefined> {
    let param: string;
    try {
        param = decodeURIComponent(seller);
    } catch {
        return undefined;
    }
    const hash = stallHashOf(param);
    if (hash === undefined) {
        return undefined;
    }
    const cache = (caches as unknown as { default: Cache }).default;
    const key = new Request(`https://stall.cash/__unfurl/v1/${hash}`);
    const hit = await cache.match(key);
    if (hit !== undefined) {
        const cached = (await hit.json()) as ResolvedText | null;
        return cached ?? undefined;
    }
    const text = await resolveManifestTextByHash(hash, chronikFetcher(fetch));
    waitUntil(
        cache.put(
            key,
            new Response(JSON.stringify(text ?? null), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': `max-age=${text === undefined ? 120 : 300}`,
                },
            }),
        ),
    );
    return text;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
    const upstream = await context.next();
    try {
        const raw = context.params.seller;
        const seller = typeof raw === 'string' ? raw : undefined;
        if (seller === undefined) {
            return upstream;
        }
        const identity = sellerIdentity(seller);
        const resolved = await resolveStallText(seller, context.waitUntil);
        const text = unfurlText(identity, resolved?.name, resolved?.tagline);
        if (text === undefined) {
            return upstream;
        }
        const canonical = new URL(context.request.url);
        const url = `https://stall.cash${canonical.pathname}`;
        let rewriter = new HTMLRewriter()
            .on('title', {
                element(el: { setInnerContent: (s: string) => void }) {
                    el.setInnerContent(text.title);
                },
            })
            .on('meta[property="og:title"]', metaContent(text.title))
            .on('meta[name="twitter:title"]', metaContent(text.title))
            .on('meta[property="og:url"]', metaContent(url))
            .on('meta[property="og:description"]', metaContent(text.description))
            .on('meta[name="twitter:description"]', metaContent(text.description))
            .on('meta[name="description"]', metaContent(text.description));
        // The picture follows the look, but only when a manifest proved one:
        // an identity-only card keeps the shipped platform image — a themed
        // still would claim a choice the seller never made.
        if (resolved !== undefined) {
            const image = `https://stall.cash${ogImageFor(resolved.themeId)}`;
            rewriter = rewriter
                .on('meta[property="og:image"]', metaContent(image))
                .on('meta[name="twitter:image"]', metaContent(image))
                .on('meta[property="og:image:alt"]', metaContent(text.title));
        }
        return rewriter.transform(upstream);
    } catch {
        return upstream;
    }
}

function metaContent(value: string): {
    element: (el: { setAttribute: (n: string, v: string) => void }) => void;
} {
    return {
        element(el) {
            el.setAttribute('content', value);
        },
    };
}
