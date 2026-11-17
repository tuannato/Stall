/**
 * **A file below the goods is painted once, on a still box, where rows share
 * it** (`a-file-below-the-goods-is-painted-once-on-a-still-box`; step 8i, A,
 * narrowed by the still-painter step, D-2026-11-17-02). The pure half: the
 * probe (`stillPainterFaults` in `probe.ts`) reads, on every paint, the
 * below-the-goods decoration nodes the paint wears and their `::before` and
 * `::after`, every file each box names and whether it moves, and this judges
 * them at the end of the page run, per look.
 *
 * What the rule protects (D-2026-11-15-05, Q2): rows that stand below the
 * goods may share one piece of art — a ground every one of them stands on,
 * carried by the first of them worn so it is painted once however many are
 * worn — and a shared piece that rode a moving box would move under every row
 * beside it. A row's own art is not that: it may move, and its motion is read
 * by 1a, 1b, 1c and the keyframe reads like any other. So:
 *
 * - **Shared art** is a file that, among one look's paints on one page run,
 *   boxes on the nodes of more than one row name (the probe paints each row
 *   alone on every screen that is not a state screen, `wornVariants`, and
 *   every row worn together, so which rows paint a file is what it saw them
 *   paint). A file only ever named by one row's own node or its
 *   pseudo-elements is that row's own art.
 * - **A box that paints shared art runs no animation, nor does the node it
 *   hangs on** (an animation on the node carries its pseudo-elements). A box
 *   that moves and names only its row's own art passes, and is counted.
 * - **Fail closed** where the page run does not let it decide: a moving box
 *   naming a file, on a run where some other below-the-goods row of the look
 *   was never painted alone (with a node mounted), cannot be told own art,
 *   since that row alone might carry the same file. It fails, naming the rows
 *   never painted alone.
 *
 * Not read, stated: rows worn in combinations other than alone and all
 * together; a file shared on one page run and moving on another where its
 * other row is hidden (each run is judged on its own paints); a transition;
 * an animation on a box above the node.
 */

/** One box below the goods that names a file, as one paint read it. */
export type StillBox = {
    /** The row whose node the box is (or hangs on), by its class. */
    row: string;
    /** The box in a sentence: `.cls`, `.cls::before`. */
    who: string;
    /** Every file it names, by resolved URL. */
    files: readonly string[];
    /** How it moves: its own animation, its node's, or not at all. */
    moves: 'own' | 'node' | undefined;
    /** Where it was read. */
    screen: string;
    label: string;
    at: string;
};

/** What one look's paints on one page run showed. */
export type StillSeen = {
    /** Every below-the-goods node row of the look's catalogue, by class. */
    rows: ReadonlySet<string>;
    /** The rows a paint wore alone, with a node of theirs mounted. */
    alone: ReadonlySet<string>;
    /** Every box naming a file each paint read. */
    boxes: readonly StillBox[];
};

/** A failure, as the probe writes one. */
export type StillFault = { screen: string; label: string; detail: string };

/** One look's verdict: the shared files, the box reads that painted them, the moving box reads that painted own art, and the failures. */
export type StillVerdict = { shared: string[]; sharedBoxes: number; movingOwn: number; faults: StillFault[] };

const named = (file: string): string => file.slice(file.lastIndexOf('/') + 1);
const list = (items: readonly string[]): string => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export function judgeStillPainters(seen: StillSeen): StillVerdict {
    // Which rows' boxes named each file.
    const painters = new Map<string, Set<string>>();
    for (const box of seen.boxes) {
        for (const file of box.files) {
            let rows = painters.get(file);
            if (rows === undefined) painters.set(file, (rows = new Set()));
            rows.add(box.row);
        }
    }
    const shared = [...painters].filter(([, rows]) => rows.size > 1).map(([file]) => file).sort();
    const sharedSet = new Set(shared);
    let sharedBoxes = 0;
    let movingOwn = 0;
    const faults: StillFault[] = [];
    for (const box of seen.boxes) {
        const sharedHere = box.files.filter((file) => sharedSet.has(file));
        if (sharedHere.length > 0) sharedBoxes += 1;
        if (box.moves === undefined) continue;
        const how = box.moves === 'own' ? 'runs an animation' : 'hangs on a node that runs an animation';
        if (sharedHere.length > 0) {
            const by = list([...new Set(sharedHere.flatMap((file) => [...painters.get(file)!]))].sort().map((row) => `.${row}`));
            faults.push({
                screen: box.screen,
                label: box.label,
                detail: `${box.who} names ${list(sharedHere.map(named))}, art ${by} share below the goods, and ${how} at ${box.at}`,
            });
            continue;
        }
        const unread = [...seen.rows].filter((row) => row !== box.row && !seen.alone.has(row)).sort();
        if (unread.length > 0) {
            faults.push({
                screen: box.screen,
                label: box.label,
                detail:
                    `${box.who} names ${list(box.files.map(named))} and ${how} at ${box.at}, and whether that art is its row's own cannot be told on this pass: ` +
                    `${list(unread.map((row) => `.${row}`))} ${unread.length === 1 ? 'was' : 'were'} never painted alone here, and alone ${unread.length === 1 ? 'it' : 'they'} might name the same file`,
            });
            continue;
        }
        movingOwn += 1;
    }
    return { shared, sharedBoxes, movingOwn, faults };
}
