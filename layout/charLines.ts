/**
 * **Which line a character of a text node set over several lines stands
 * on** (round 6, the critic's P1-3 on round 5). The probe's `fragmentsOf`
 * cuts a text node into one fragment per line (`Range.getClientRects()`)
 * and gives each character to its line; round 5 gave it to the first line
 * whose rect held the character's middle, and a line's rect is its
 * content area — a whole line tall whatever `line-height` says — so two
 * lines piled within half a line (`line-height: 0.3`) put every character
 * of the second line in the first, the node read as one line, and "lines
 * apart" never ran: Pay several's total and the address printed over
 * themselves with every rule green.
 *
 * Chrome sets a character's range rect at its line fragment's own top
 * (measured, Chrome 155: at `line-height` 0, 0.3, 0.35 and 1.2 every
 * character's top equals its line's to the pixel), so a character goes to
 * the line **whose top is nearest its own**, among the lines whose rect
 * holds it across. Where two lines share a top — `line-height: 0` sets
 * every line of a node on one — the text's own order decides: a character
 * stays on the line the one before it stood on, and one that steps back
 * left of the one before it starts the next line.
 */
import type { Box } from '../src/ui/signInk';

/**
 * The index in `lines` of the line `ch` stands on: the nearest top among
 * the lines that hold it across (every line when none does), ties within
 * half a pixel broken in the text's order — `current` is the line the
 * character before it went to, `previous` that character's rect.
 */
export function lineOfCharacter(ch: Box, lines: readonly Box[], current: number, previous: Box | undefined): number {
    const all = lines.map((_, i) => i);
    const across = all.filter((i) => ch.left >= lines[i]!.left - 1 && ch.right <= lines[i]!.right + 1);
    const pool = across.length > 0 ? across : all;
    const dist = (i: number): number => Math.abs(ch.top - lines[i]!.top);
    const best = Math.min(...pool.map(dist));
    const tied = pool.filter((i) => dist(i) <= best + 0.5);
    if (tied.length === 1) return tied[0]!;
    const wrapped = previous !== undefined && ch.left < previous.left - 0.5;
    return tied.find((i) => (wrapped ? i > current : i >= current)) ?? tied.find((i) => i >= current) ?? tied[0]!;
}
