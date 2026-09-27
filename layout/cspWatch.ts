/**
 * Every Content-Security-Policy refusal the probe page meets
 * (`the-probe-page-meets-no-csp-refusal`, step 6).
 *
 * The probe is previewed under the production policy (`vite.config.ts`'s
 * `preview.headers`), so a refusal here is a refusal a visitor would meet:
 * a stylesheet, a picture or a face the policy blocks paints nothing, and a
 * layout measured without it certified a page no visitor sees. Until this
 * listener, such a refusal was a console line nobody read. The runner fails
 * a pass whose verdict carries one, and asks `window.__cspRefusals()` again
 * after its contrast and worn-sheet jobs, which run after the verdict.
 *
 * Imported FIRST by `probe.ts`, so it listens from the first statement of
 * the page's own modules. What it cannot hear, stated: a refusal before any
 * module ran — the entry's own `<link>` and `<script>` tags, which the page
 * could not load at all if the policy refused them.
 */

import { ICON_HOST } from '../src/domain/icons';

export type CspRefusal = { readonly directive: string; readonly blocked: string; readonly source: string };

const refusals: CspRefusal[] = [];

/**
 * The one refusal a probe page meets by design: the WORKSHOP's preview
 * policy is production's minus the icon host in `img-src`
 * (`vite.workshop.config.ts`), so the showroom and the kit's probe ask the
 * owner's Worker nothing and paint letters. That policy is narrower than a
 * visitor's on purpose; an icon it refuses is the kit's design, not a page a
 * visitor sees broken. Only there, and only that host under `img-src`: the
 * ordinary probe runs under production's own policy, where the icon host is
 * allowed (and unreachable: its Chrome resolves nothing but localhost).
 */
function refusedByDesign(event: SecurityPolicyViolationEvent): boolean {
    const directive = event.effectiveDirective || event.violatedDirective;
    if (!directive.startsWith('img-src')) return false;
    let origin: string;
    try {
        origin = new URL(event.blockedURI).origin;
    } catch {
        return false;
    }
    return origin === ICON_HOST && location.pathname.endsWith('/probe-workshop.html');
}

document.addEventListener('securitypolicyviolation', (event) => {
    if (refusedByDesign(event)) return;
    refusals.push({
        directive: event.effectiveDirective || event.violatedDirective,
        blocked: event.blockedURI,
        source: event.sourceFile === '' ? '' : `${event.sourceFile}:${event.lineNumber}`,
    });
});

/** Every refusal so far, oldest first. */
export function cspRefusals(): readonly CspRefusal[] {
    return [...refusals];
}
