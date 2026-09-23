/**
 * What `pnpm workshop:start <look>` writes as `workshop/look.json`, and what
 * the committed kit holds before anyone starts.
 *
 * The committed kit is the **skeleton** — Modern's row with nothing restated,
 * no moods, no decorations, and a stylesheet with no rules. That is likely
 * red under the probe, because a look's tier-1/2 figure sizes and its
 * sparse-shop motif are styled only in the look's own sheet (the step-1
 * critic's P2-2), so a creator starts from a **green starter** instead: a
 * shipped look's row written out here, beside its sheet re-scoped under
 * `.t-workshop` by `scripts/workshop-css.mjs`. Test:
 * `the-starter-is-each-shipped-look-rescoped`.
 *
 * `scripts/workshop.mjs` loads this module through Vite's `runnerImport`,
 * because Node cannot import the extensionless `src/` modules it rests on.
 */
import { attachmentsForTheme, type ShippedAttachment } from '../src/domain/attachments';
import { decodeTheme, type Rgb } from '../src/domain/theme';
import { KIT_BASES, PALETTE_KEYS, type KitBase } from './workshopLook';

/** The committed `workshop/look.json`, as a value. */
export const KIT_SKELETON = {
    label: 'Untitled workshop look',
    base: 'modern',
    palette: {},
    shape: {},
    tierCeilings: [7, 9, 12],
    overlayTierCeilings: [5, 7, 9],
    moods: [],
    decorations: [],
} as const;

type RowJson = {
    bit: number;
    slot: string;
    label: string;
    place: string;
    motion: boolean;
    cls?: string;
    paint?: 'root' | 'node';
    palette?: Record<string, [number, number, number]>;
};

function triple(c: Rgb): [number, number, number] {
    return [c.r, c.g, c.b];
}

function rowJson(row: ShippedAttachment): RowJson {
    const out: RowJson = {
        bit: row.bit,
        slot: row.slot,
        label: row.label,
        place: row.place,
        motion: row.motion,
    };
    if (row.cls !== undefined) {
        out.cls = row.cls;
    }
    if (row.paint !== undefined) {
        out.paint = row.paint;
    }
    if (row.palette !== undefined) {
        out.palette = Object.fromEntries(
            PALETTE_KEYS.filter((key) => row.palette![key] !== undefined).map((key) => [
                key,
                triple(row.palette![key]!),
            ]),
        );
    }
    return out;
}

/** A shipped look's row as a kit look: every colour, the font, the radius, both ladders and its rows. */
export function starterLook(base: KitBase): Record<string, unknown> {
    const row = decodeTheme(KIT_BASES[base]);
    const rows = attachmentsForTheme(row.id);
    return {
        label: `${row.label} (workshop copy)`,
        base,
        palette: Object.fromEntries(
            PALETTE_KEYS.filter((key) => row[key] !== undefined).map((key) => [key, triple(row[key]!)]),
        ),
        fontIndex: row.fontIndex,
        softness: row.softness,
        shape: {},
        tierCeilings: [...row.tierCeilings],
        overlayTierCeilings: [...row.overlayTierCeilings],
        moods: rows.filter((r) => r.slot === 'mood').map(rowJson),
        decorations: rows.filter((r) => r.slot !== 'mood').map(rowJson),
    };
}

/**
 * The file text for a kit look: two-space JSON with every list of numbers on
 * one line, so a palette reads as `[242, 242, 239]` and not as five lines.
 */
export function lookFileText(look: unknown): string {
    return (
        JSON.stringify(look, null, 2).replace(
            /\[\s*(-?\d+(?:\.\d+)?(?:,\s*-?\d+(?:\.\d+)?)*)\s*\]/g,
            (_all, nums: string) => `[${nums.split(/,\s*/).join(', ')}]`,
        ) + '\n'
    );
}

/** True when `look` is the committed skeleton — nothing a creator wrote would be lost by replacing it. */
export function isSkeleton(look: unknown): boolean {
    return JSON.stringify(look) === JSON.stringify(KIT_SKELETON);
}
