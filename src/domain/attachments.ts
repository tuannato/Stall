/**
 * Attachments: decoration a seller wears, switched on by a token their stall
 * address holds and opted into in their own settings record.
 *
 * Two halves that must not be confused, and the whole design rests on keeping
 * them apart. The **flag** is a choice, published in `STL1` — anyone can send a
 * token to any address, so holding cannot be consent. The **token** is the
 * entitlement, a genesis txid nobody can forge. A flag set over a token the
 * stall does not hold paints nothing, and so does a flag with no row here.
 *
 * Like a theme, the chain names a row and never carries a byte of the look
 * itself: there are no colour strings, no font names and no layout templates on
 * this path, so nothing an attacker chooses reaches the paint.
 */
import type { DecodedTheme, Rgb } from './theme';
import { DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID } from './theme';

export type AttachmentSlot = 'crest' | 'fringe' | 'yard' | 'mood';

/** The palette roles a `mood` may move. Deliberately not the shape or the font. */
export type PaletteDelta = Partial<
    Pick<DecodedTheme, 'bg' | 'surface' | 'text' | 'muted' | 'accent' | 'accentTwo'>
>;

export type ShippedAttachment = {
    /**
     * The genesis txid of the token that entitles this row — **absent until the
     * token is minted**. An unminted row is previewable and never worn: it can
     * be looked at in the settings sheet, and it fails the entitlement check
     * that every worn row has to pass, because there is nothing to hold.
     */
    tokenId?: string;
    themeId: number;
    /** 0..15. Permanent once any record on chain has set it — see the note below. */
    bit: number;
    slot: AttachmentSlot;
    label: string;
    /**
     * The class this row paints under. **Must start with `att-`**:
     * `decorations()` in `layout/probe.ts` finds decorations by that prefix, so
     * a row named anything else ships with no guard at all. Absent for `mood`,
     * which moves the palette and paints nothing.
     */
    cls?: string;
    /**
     * Where the class lands, so the renderer never needs to know one row from
     * another. `root` puts it on the stall and the look comes from descendant
     * rules — the only shape allowed to exist without a node, and only for
     * paint that cannot leave the element it is on (a rule on the sign, a glow
     * on the name). `node` builds an element the guard can measure, which is
     * what anything that moves or sits over the page must be.
     */
    paint?: 'root' | 'node';
    /** `mood` only. Merged before `themeVars`, so `legibleOn` still runs. */
    palette?: PaletteDelta;
    motion: boolean;
};

/** The tag byte the flags field claims inside `STL1`'s tagged extras. */
export const ATTACHMENT_FLAGS_TAG = 0x01;

/** Two bytes, sixteen rows per theme. The whole catalogue is bounded by this. */
export const ATTACHMENT_FLAG_BYTES = 2;
export const ATTACHMENT_BITS = 16;

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

/**
 * **The table grows by rows and never by re-pointing one.** A record is
 * permanent, so moving what bit N of a theme means changes what somebody
 * already signed. Renaming a row is free; re-aiming a bit is not. A bit is only
 * free to move while no record on chain has ever set it.
 *
 * `bit` is per theme, which is safe precisely because the flag is not the
 * entitlement: the same bit under two themes points at two different tokens,
 * and a stall that holds neither wears neither.
 */
export const SHIPPED_ATTACHMENTS: readonly ShippedAttachment[] = [
    {   
        tokenId: '14e1f68b541840cd443a40029b9aef28b4fee9db6066d18607812b856169e9c4',
        themeId: DEFAULT_THEME_ID,
        bit: 0,
        slot: 'mood',
        label: 'After hours',
        motion: false,
        // Open late. Modern's voice is restraint, so its decoration is a
        // disposition rather than an object. Ported from the specimen's dark
        // variant as table data — the specimen set six roles and never
        // `accentTwo`, which is why that one is stated here rather than
        // inherited into a colour nobody chose.
        palette: {
            bg: rgb(18, 21, 26),
            surface: rgb(27, 32, 41),
            text: rgb(232, 237, 243),
            muted: rgb(140, 153, 168),
            accent: rgb(91, 147, 255),
            accentTwo: rgb(91, 147, 255),
        },
    },
    {   
        tokenId: '9a0d0745a9ca0e82eea47f2690d2611ca791635f3eba26af6a9bf49dfd528e59',
        themeId: DEFAULT_THEME_ID,
        bit: 1,
        slot: 'fringe',
        label: 'Pinstripe',
        paint: 'root',
        cls: 'att-pinstripe',
        motion: false,
    },
    {   
        tokenId: 'c136cdac5c17def45a7cf1f308fc14f21a54b21ce2b4a70ee513d6b9a8055876',
        themeId: NEO_CITY_THEME_ID,
        bit: 0,
        slot: 'crest',
        label: 'The sign hums',
        paint: 'root',
        cls: 'att-hum',
        motion: false,
    },
    {   
        tokenId: '15e67ab0299782529a5971eaf5920a559d1be920ffe596dfcacb16eabda3ebd7',
        themeId: NEO_CITY_THEME_ID,
        bit: 1,
        slot: 'fringe',
        label: 'Neon rain',
        paint: 'node',
        cls: 'att-rain',
        motion: true,
    },
    {   
        tokenId: '314c3acedc40ffd92cf6ee50e5cbac9e5504b83b7c6a956a4039f6291a46c6e6',
        themeId: RURAL_THEME_ID,
        bit: 0,
        slot: 'yard',
        label: 'Yard beetle',
        paint: 'node',
        cls: 'att-beetle',
        motion: true,
    },
    {   
        tokenId: 'aecd2dbc2cef26aaf46ef94ceab289fc0deec2c57d6ff0d2a7ec20c3f4460fb6',
        themeId: RURAL_THEME_ID,
        bit: 1,
        slot: 'mood',
        label: 'Sun-faded',
        motion: false,
        // Bleached and warmed, like a stall that has stood a season. Age is the
        // one credential a decoration can honestly wear, because it claims
        // nothing anybody could check.
        palette: {
            bg: rgb(247, 240, 226),
            surface: rgb(238, 226, 203),
            text: rgb(74, 60, 44),
            muted: rgb(150, 132, 108),
            accent: rgb(178, 106, 74),
            accentTwo: rgb(150, 132, 108),
        },
    },
];

/**
 * Sixteen flags from the tagged push's payload.
 *
 * Bit 0 is the low bit of the **first** byte and bit 8 the low bit of the
 * second. A payload that is not exactly two bytes is **ignored entirely** —
 * never a reason to refuse the record, for the same reason `STL1` skips a tag
 * it does not know: a reader from the future must be able to write a field this
 * one cannot read without taking the seller's stall down.
 */
export function decodeAttachmentFlags(payload: Uint8Array | undefined): number {
    if (payload === undefined || payload.length !== ATTACHMENT_FLAG_BYTES) {
        return 0;
    }
    return payload[0]! | (payload[1]! << 8);
}

/** The inverse, for the publisher. */
export function encodeAttachmentFlags(flags: number): Uint8Array {
    const safe = Number.isInteger(flags) ? flags & 0xffff : 0;
    return Uint8Array.from([ATTACHMENT_FLAGS_TAG, safe & 0xff, (safe >> 8) & 0xff]);
}

export function attachmentAt(themeId: number, bit: number): ShippedAttachment | undefined {
    return SHIPPED_ATTACHMENTS.find((a) => a.themeId === themeId && a.bit === bit);
}

export function attachmentsForTheme(themeId: number): readonly ShippedAttachment[] {
    return SHIPPED_ATTACHMENTS.filter((a) => a.themeId === themeId);
}

/**
 * What is actually worn: at most one per slot, **lowest bit first**.
 *
 * Not the manifest's repeated-tag rule wearing a new hat. That one resolves the
 * same key written twice, in the order the publisher wrote it; this resolves two
 * different keys claiming one place, in an order the catalogue imposed. It is a
 * fallback for a hand-written record — the picker makes two bits in one slot
 * unrepresentable, which is a better answer than resolving them quietly.
 *
 * `held` is the entitlement and it **fails closed**: a row whose token this
 * stall does not hold paints nothing, and so does a row with no token minted
 * yet. Pass `undefined` to skip the check, which is what a preview does — a
 * seller looking at a decoration has not claimed to own it.
 */
export function wornAttachments(
    themeId: number,
    flags: number,
    held?: ReadonlySet<string>,
): readonly ShippedAttachment[] {
    const bySlot = new Map<AttachmentSlot, ShippedAttachment>();
    for (let bit = 0; bit < ATTACHMENT_BITS; bit += 1) {
        if ((flags & (1 << bit)) === 0) {
            continue;
        }
        const row = attachmentAt(themeId, bit);
        // A bit with no row in this theme's table paints nothing and says
        // nothing. Unlike an unknown theme id, which falls back and tells the
        // visitor: a missing decoration is not a lie about money.
        if (row === undefined || bySlot.has(row.slot)) {
            continue;
        }
        if (held !== undefined && (row.tokenId === undefined || !held.has(row.tokenId))) {
            continue;
        }
        bySlot.set(row.slot, row);
    }
    return [...bySlot.values()];
}

/**
 * The palette a `mood` asks for, merged into the shipped theme **before**
 * `themeVars` runs — so `legibleOn` still corrects anything that would leave
 * the asked amount unreadable. A stylesheet block cannot do this job:
 * `applyTheme` writes every `--s-*` inline on `.stall`, and an inline custom
 * property beats any rule.
 */
export function withMood(
    theme: DecodedTheme,
    worn: readonly ShippedAttachment[],
): DecodedTheme {
    const mood = worn.find((a) => a.slot === 'mood');
    return mood?.palette === undefined ? theme : { ...theme, ...mood.palette };
}

/** The classes a worn set puts on the stall root — the `root` rows only. */
export function attachmentClasses(worn: readonly ShippedAttachment[]): string[] {
    return worn
        .filter((a) => a.paint === 'root')
        .map((a) => a.cls)
        .filter((c): c is string => c !== undefined);
}

/** The rows that build an element, in the order a renderer should place them. */
export function attachmentNodesWanted(
    worn: readonly ShippedAttachment[],
): readonly ShippedAttachment[] {
    return worn.filter((a) => a.paint === 'node' && a.cls !== undefined);
}

/**
 * The look a decoration is for, by the only identifier that cannot be written
 * by somebody else: the genesis txid. A ticker is seller-supplied text, it is
 * not unique on either protocol, and a rule keyed on one would file an
 * unrelated token with a colliding ticker under this shop's catalogue — on
 * *their* stall, about *their* stock.
 */
export function attachmentByTokenId(tokenId: string): ShippedAttachment | undefined {
    return SHIPPED_ATTACHMENTS.find((a) => a.tokenId === tokenId);
}
