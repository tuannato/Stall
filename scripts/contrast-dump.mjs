#!/usr/bin/env node
/**
 * The contrast passes' per-box record, and the comparison that stands on it.
 *
 * `pnpm test:layout` prints one tally for pass 4 ("N figure boxes sampled")
 * and one for pass 5, and a tally cannot say whether a change to the runner
 * moved anything: two runs that sample the same number of boxes can read
 * different grounds under every one of them. So every contrast run writes
 * every box it sampled — its key, the box, the ink and the worst contrast it
 * found — to `.layout-dump/` (gitignored), and this compares two of them box
 * by box (the step-3 critic's items 2 and 4):
 *
 *     node scripts/contrast-dump.mjs <before.json> <after.json>
 *
 * A change to how the pass runs (a faster capture, a different order, a
 * cleaner page) is **lossless** only when every box's worst value is
 * bitwise identical and the box set is the same; anything else is a move,
 * listed box by box, and a move that crosses the 3:1 floor is named as such.
 * Exit 0 when identical, 1 when anything moved, appeared or vanished.
 *
 * A box's key is its pass, viewport, screen, look id, decoration flags, its
 * index among the nodes the prepare collected (`i`, stable DOM order, so a
 * box the page drops does not renumber the rest) and its node's description
 * — plus, on the transparent wire, the ground it was flattened onto.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where every run's dump goes; gitignored. */
export const DUMP_DIR = '.layout-dump';

/** The 3:1 floor both passes hold (`PIXEL_CONTRAST_FLOOR` in the runner). */
export const FLOOR = 3;

/** One job's key: the combination the pass painted. */
export function jobKey({ pass, viewport, screen, look, flags }) {
    return `${pass}|${viewport}|${screen}|${look}|${flags}`;
}

/** One box's key, inside its job. */
export function boxKey(job, { i, sel, ground }) {
    return `${jobKey(job)}|${i}|${sel}${ground === undefined ? '' : `|${ground}`}`;
}

/** A worst value as JSON can carry it: a finite number as itself, anything else as its name. */
export function dumpValue(value) {
    if (value === undefined) return null;
    return Number.isFinite(value) ? value : String(value);
}

function asNumber(value) {
    return typeof value === 'number' ? value : Number(value);
}

/** Below the floor, for a dumped value (`'Infinity'` is not). */
function below(value) {
    return value !== null && asNumber(value) < FLOOR;
}

/**
 * Two dumps, box by box. A box is identical when its worst value is the same
 * double (`Object.is`, so `-0` and `NaN` are not waved through) and it was
 * sampled on both sides, or dropped on both.
 */
export function compareDumps(before, after) {
    const index = (dump) => new Map(dump.boxes.map((box) => [box.key, box]));
    const a = index(before);
    const b = index(after);
    const identical = [];
    const moved = [];
    const removed = [];
    const added = [];
    for (const [key, boxA] of a) {
        const boxB = b.get(key);
        if (boxB === undefined) {
            removed.push(boxA);
            continue;
        }
        if (Object.is(boxA.worst, boxB.worst)) {
            identical.push(key);
        } else {
            moved.push({
                key,
                before: boxA.worst,
                after: boxB.worst,
                crosses: below(boxA.worst) !== below(boxB.worst),
                boxBefore: [boxA.x, boxA.y, boxA.w, boxA.h],
                boxAfter: [boxB.x, boxB.y, boxB.w, boxB.h],
            });
        }
    }
    for (const [key, boxB] of b) {
        if (!a.has(key)) added.push(boxB);
    }
    return { identical, moved, removed, added };
}

const fmt = (value) => (value === null ? 'dropped' : typeof value === 'number' ? value.toFixed(6) : value);

/** The comparison as lines for a terminal or a commit body. */
export function comparisonLines(result, { list = 40 } = {}) {
    const { identical, moved, removed, added } = result;
    const lines = [
        `boxes: ${identical.length} identical, ${moved.length} moved, ${added.length} added, ${removed.length} removed`,
    ];
    const crossing = moved.filter((m) => m.crosses);
    if (crossing.length > 0) {
        lines.push(`CROSSES ${FLOOR}:1 — ${crossing.length} box(es):`);
        for (const m of crossing) lines.push(`  ! ${m.key}: ${fmt(m.before)} -> ${fmt(m.after)}`);
    }
    const show = (title, entries, line) => {
        if (entries.length === 0) return;
        lines.push(`${title}:`);
        for (const entry of entries.slice(0, list)) lines.push(`  ${line(entry)}`);
        if (entries.length > list) lines.push(`  … and ${entries.length - list} more`);
    };
    show('moved', moved, (m) => `${m.key}: ${fmt(m.before)} -> ${fmt(m.after)} box ${m.boxBefore.join(',')} -> ${m.boxAfter.join(',')}`);
    show('added', added, (box) => `${box.key}: ${fmt(box.worst)}`);
    show('removed', removed, (box) => `${box.key}: ${fmt(box.worst)}`);
    return lines;
}

/** How many timestamped dumps of one kind of run are kept; a dump is ~1.5 MB. */
export const DUMPS_KEPT = 20;

/**
 * Write a run's dump, timestamped, and as the latest for its looks, and keep
 * only the newest `DUMPS_KEPT` timestamped ones for those looks — a guard run
 * several times a day must not fill a disk. Returns the timestamped path.
 */
export function writeDump(dump, { looks, stamp, rev, dir = DUMP_DIR }) {
    mkdirSync(dir, { recursive: true });
    const text = `${JSON.stringify(dump, null, 1)}\n`;
    const path = join(dir, `${looks}-${stamp}${rev === undefined ? '' : `-${rev}`}.json`);
    writeFileSync(path, text);
    writeFileSync(join(dir, `${looks}-latest.json`), text);
    // The stamp is an ISO time, so the names sort in the order they were written.
    const mine = readdirSync(dir)
        .filter((name) => name.startsWith(`${looks}-`) && name !== `${looks}-latest.json` && name.endsWith('.json'))
        .sort();
    for (const name of mine.slice(0, Math.max(0, mine.length - DUMPS_KEPT))) {
        rmSync(join(dir, name), { force: true });
    }
    return path;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [beforePath, afterPath, ...rest] = process.argv.slice(2);
    if (beforePath === undefined || afterPath === undefined || rest.length > 0) {
        console.error('usage: node scripts/contrast-dump.mjs <before.json> <after.json>');
        process.exit(2);
    }
    const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
    const result = compareDumps(read(beforePath), read(afterPath));
    for (const line of comparisonLines(result, { list: Number(process.env.DUMP_LIST ?? 40) })) console.log(line);
    const same = result.moved.length === 0 && result.added.length === 0 && result.removed.length === 0;
    process.exit(same ? 0 : 1);
}
