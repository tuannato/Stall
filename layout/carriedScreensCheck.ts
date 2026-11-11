/**
 * **`a-public-screen-is-the-same-whatever-the-build-carries`** (the
 * probe-prune critic's item 3; D-2026-11-11-04), shared by its four test
 * files (`layout/carriedScreens.{1,2,3,4}.test.ts`, one quarter of the
 * screens each, so the paints run on four workers).
 *
 * The look run (`pnpm test:layout:look`, `--looks carried`) measures the
 * private looks a build carries and, of the public looks, only the screens
 * whose tree depends on what the build carries — the rest is the public
 * run's, whose build carries the same. Which screens those are is found
 * here, not by reading `render.ts` for a symbol: every probe screen, on
 * every public look that can wear it (the shipped three and the skeleton,
 * `canWear`), bare, each row worn alone and every all-worn state
 * (`everyVariant`, a superset of what any pass paints there), is painted
 * twice in happy-dom — once in a build that carries no private look, once
 * with the private-looks module mocked to the tracked fixture
 * (`layout/fixturePrivateLooks.ts`, as `src/ui/render.private.test.ts`
 * mocks it) — and the two must be identical (the document head and the
 * painted root, as a digest), except on `CARRIED_SCREENS`. The list is held
 * both ways: a listed screen whose trees never differ is stale.
 *
 * Every module is loaded fresh for each half (`vi.resetModules`), so the
 * renderer's module state, the look table and the fixtures are each half's
 * own; the clock is fixed, so a figure stamped at load (the pay fixtures'
 * rate) reads the same in both.
 *
 * **What it does not see, stated**: a difference only layout shows (a
 * carried sheet's rule reaching a public element — the look lint's scoping
 * holds that at build time, `lintLookSheet`, and `wornSheetProblems`); a
 * difference a press makes after the paint, beyond `stageScreen` (the
 * probe's try-on presses the carried look's button on the name sheet, which
 * is listed); a carried look other than the tracked fixture whose rows or
 * tokens a public screen would list some other way (a public stall's book
 * naming a private decoration's token, `category.ts`, paints on no fixture).
 */
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CARRIED_SCREENS } from './carriedScreens';
import { privateLookReads } from '../scripts/served-sheets.mjs';
import { selectionFromEnv } from '../scripts/looks-selection.mjs';
import type { PrivateLookSource } from '../src/domain/lookData';

/** Each paint's tree, as a digest of the document head and the painted root. */
type Trees = Map<string, string>;

/**
 * The time a part's paints may take (`beforeAll`): measured 27–29s a file
 * with the fixture alone and four files at once on this Mac (6 cores), and
 * about twice that with a selection named; four times the slower, for a
 * machine with half the cores.
 */
const BEFORE_ALL_MS = 240_000;

/** The parts the screens are split into, one test file each. */
export const PARTS = 4;

/** What `virtual:stall-private-looks` answers a build carrying `looks`. */
type CarryingModule = { carriesPrivateLooks: boolean; privateLooks: PrivateLookSource[] };

/** The selected private looks as the build hands them to the app (`privateLookReads`, the build's own entries for the target). */
async function selectedModule(): Promise<CarryingModule> {
    const reads = await privateLookReads();
    if (reads.length === 0) throw new Error('a selection is named and carries no private look');
    return {
        carriesPrivateLooks: true,
        privateLooks: reads.map((read) => ({ id: read.entry.id, sheetClass: read.entry.cls as `t-${string}`, sheetUrl: `/assets/sheet-${read.entry.slug}.css`, look: read.look })),
    };
}

/** The builds the comparison is made over: the tracked fixture, and the selection when one is named. */
const BUILDS: readonly string[] = selectionFromEnv(process.env) === undefined ? ['the tracked fixture'] : ['the tracked fixture', 'the selected private looks'];

/** Every public look's paint of this part's screens, by `screen|class|variant`, in a build carrying `carrying` or none. */
async function paintAll(carrying: CarryingModule | undefined, part: number): Promise<{ trees: Trees; screens: string[] }> {
    vi.resetModules();
    if (carrying !== undefined) {
        vi.doMock('virtual:stall-private-looks', () => carrying);
    } else {
        vi.doUnmock('virtual:stall-private-looks');
    }
    const { renderStall } = await import('../src/ui/render');
    const { SCREENS, handlers, stageScreen } = await import('./fixtures');
    const { canWear, paintView, publicLooks } = await import('./looks');
    const { everyVariant } = await import('./variants');
    const screens = Object.keys(SCREENS).filter((_, i) => i % PARTS === part);
    const trees: Trees = new Map();
    for (const screen of screens) {
        for (const look of publicLooks().filter((candidate) => canWear(candidate, screen))) {
            for (const [label, worn] of everyVariant(look)) {
                const root = document.createElement('div');
                root.id = 'app';
                document.body.append(root);
                renderStall(root, paintView(SCREENS[screen]!, look, worn), handlers);
                stageScreen(screen, root);
                // A digest, not the tree: some 3,200 paints of up to ~0.2 MB
                // each, twice, would not fit a worker's heap.
                trees.set(
                    `${screen}|${look.theme.sheetClass}|${label}`,
                    createHash('sha256').update(document.head.innerHTML).update('\n').update(root.outerHTML).digest('hex'),
                );
                root.remove();
            }
        }
        // What a paint left pending (a marquee's timer, a wait on the
        // faces) holds the tree it was armed on; happy-dom lets go of it
        // here, or the paints outgrow a worker's heap.
        await (window as unknown as { happyDOM: { abort(): Promise<void> } }).happyDOM.abort();
    }
    return { trees, screens };
}

/** The test, over one part of the screens. */
export function describeCarriedScreens(part: number): void {
    describe(`a-public-screen-is-the-same-whatever-the-build-carries (part ${part + 1} of ${PARTS})`, () => {
        let bare: Trees;
        const carrying = new Map<string, Trees>();
        let screens: string[];
        beforeAll(async () => {
            vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-01T12:00:00Z') });
            const startedAt = performance.now();
            ({ trees: bare, screens } = await paintAll(undefined, part));
            const { fixturePrivateLooksModule } = await import('./fixturePrivateLooks');
            for (const build of BUILDS) {
                const module = build === 'the tracked fixture' ? fixturePrivateLooksModule() : await selectedModule();
                carrying.set(build, (await paintAll(module, part)).trees);
            }
            // Measured 2026-11-11 on this Mac: 27–29s a file with the fixture alone, four files at once.
            console.log(`a-public-screen-is-the-same-whatever-the-build-carries part ${part + 1}: ${BUILDS.length + 1} paint sets in ${((performance.now() - startedAt) / 1000).toFixed(1)}s`);
        }, BEFORE_ALL_MS);
        afterAll(() => {
            vi.useRealTimers();
            vi.doUnmock('virtual:stall-private-looks');
            vi.resetModules();
        });

        for (const build of BUILDS) {
            it(`paints the same paints in a build carrying ${build}`, () => {
                expect([...carrying.get(build)!.keys()]).toEqual([...bare.keys()]);
                expect(bare.size, 'every screen of the part on every public look, bare and worn').toBeGreaterThan(400);
            });
        }

        it('paints every public screen identically, except the listed ones', () => {
            const differs = new Map<string, Set<string>>();
            const unlisted: string[] = [];
            for (const [build, trees] of carrying) {
                differs.set(build, new Set());
                for (const [key, tree] of bare) {
                    if (trees.get(key) === tree) continue;
                    const screen = key.split('|')[0]!;
                    differs.get(build)!.add(screen);
                    if (!Object.hasOwn(CARRIED_SCREENS, screen)) unlisted.push(`${key} (carrying ${build})`);
                }
            }
            expect(unlisted, 'a public paint that depends on what the build carries, on a screen CARRIED_SCREENS does not list').toEqual([]);
            // Both ways, and for each build: a listed screen whose trees do not
            // differ is a stale entry the look run pays for — and a build whose
            // carried looks moved no listed screen was never the build it was
            // said to be (a mock that did not take).
            for (const build of carrying.keys()) {
                const stale = Object.keys(CARRIED_SCREENS).filter((screen) => screens.includes(screen) && !differs.get(build)!.has(screen));
                expect(stale, `a listed screen whose trees do not differ in a build carrying ${build}`).toEqual([]);
            }
        });
    });
}
