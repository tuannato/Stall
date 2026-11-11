/**
 * **The public screens whose tree depends on what the build carries**, each
 * with its reason. The look run (`pnpm test:layout:look`, `--looks carried`
 * in `scripts/layout-check.mjs`) measures the private looks a build carries,
 * and of the public looks (the shipped three and the skeleton) only these
 * screens — everything else a public look paints is the same tree whichever
 * private looks the build carries, and is the public run's to measure.
 *
 * Found, not listed by hand: `a-public-screen-is-the-same-whatever-the-build-carries`
 * (`layout/carriedScreensCheck.ts`) paints every probe screen on every public
 * look, bare and worn, in a build that carries the tracked fixture and in one
 * that carries none, and holds this list to the screens whose trees differ,
 * both ways.
 */
export const CARRIED_SCREENS: Readonly<Record<string, string>> = Object.freeze({
    'publish-name':
        "the name sheet's look picker offers one button per look the build carries (the look table's merged rows, in `render.ts`), each private look's label read from its own look.json, " +
        'and a carrying build adds the picker\'s `look-status` line (`CARRIES_WORN_ONLY_LOOKS`)',
});

/** The listed screens, as a set. */
export const CARRIED_SCREEN_SET: ReadonlySet<string> = new Set(Object.keys(CARRIED_SCREENS));
