/**
 * What a build costs, and who pays it (step 6, 6.1 of the step-6 plan v2).
 *
 * One ceiling over the whole build (`served-weight-has-a-ceiling`, retired
 * 2026-10-06) could not
 * say the thing that matters once a look's sheet stops riding the entry CSS:
 * which bytes EVERY visitor downloads, which only a visitor to a stall that
 * wears one look, and which only when a screen asks for them. So every
 * emitted file lands in exactly one bucket:
 *
 * - **every-visitor** — the entry HTML, its entry chunk and every chunk that
 *   chunk imports statically, and the CSS those chunks import: what a first
 *   visit to any page of the app costs before anything is painted.
 * - **worn-only look L** — L's own sheet (a CSS asset built from the source
 *   the role table names for it, `scripts/sheet-roles.mjs`) and every file
 *   that sheet's `url()`s name: what a visitor to a stall wearing L pays on
 *   top, and no one else.
 * - **on demand** — everything else: faces and decoration art the entry CSS
 *   names, pictures a script imports, chunks nothing imports statically.
 *   Fetched when a screen asks.
 *
 * **Never classified by `viteMetadata.importedAssets`** (the step-6 critic):
 * a chunk that imports a sheet as `?url` lists that sheet AND its art among
 * its imported assets, so reading that set would file a worn-only look's
 * art as the importing chunk's. The buckets come from Rollup's own chunk
 * graph (`isEntry`, `facadeModuleId`, `imports`), `viteMetadata.importedCss`
 * for the CSS a chunk links, and each worn sheet's own `url()`s.
 *
 * **Collisions are refusals, not tie-breaks.** A worn look's file that is
 * also every-visitor, also another worn look's, or named by any other
 * emitted text (another sheet's `url()`, a script's string) is two buckets'
 * — the budget would count it where it is not the only cost, and the
 * bucket ceilings would drop it where a visitor still pays for it — so it is
 * a problem (`every-emitted-file-is-in-one-weight-bucket`), as is a worn
 * sheet the build did not emit as a file of its own.
 *
 * Bytes are UTF-8 bytes of a chunk's code or an asset's source, never
 * `string.length`. Pure: parts in, buckets out; the tests build.
 *
 * **A look's art budget** (`lookArtBudget`, `each-look-keeps-its-art-budget`)
 * counts what one visitor to a stall in that look can download: gzip -9
 * (Node zlib, deterministic — a host's brotli is not ours to pin) of the
 * sheet and the art its bare rules name, plus, per decoration slot, the
 * largest row's art — one row per slot is what a record can wear (§7). Not
 * the catalogue's sum: a visitor never downloads every row of one slot. It
 * is read against a soft target and a hard cap (`lookBudgetVerdict`, below).
 *
 * **Each bucket has its own ceiling, and none is a sum of two**
 * (D-2026-10-06-07): every-visitor and on demand in `src/bundle.test.ts`,
 * each worn-only look its budget here. The served-weight ceiling over
 * every-visitor + on demand is retired: it counted the every-visitor bucket
 * a second time, so it fired while every visitor's download still had room.
 */
import { gzipSync } from 'node:zlib';
import { sanitizeSvg } from './svg-allow.mjs';
import { budgetReasonProblem } from './private-looks.mjs';
import { parseSheet, splitTopLevel } from './workshop-css.mjs';

/**
 * A look's art budget is a soft target and a hard cap (D-2026-10-06-08,
 * the owner, 2026-10-06), both in gzip -9 bytes of what one visitor to a
 * stall in that look can download for it — its sheet, its bare art and the
 * largest row of each slot, faces included (`lookArtBudget`).
 *
 * **The target, 256,000** — the number that was the whole budget from step 6
 * to 2026-10-06. Set from Ink wash as drawn (pass 6, `private/design/
 * surfaces-2026-09-22/team/shuimo/`, measured 2026-09-27 with Node zlib at
 * level 9): the sheet ~7,300 minified, the 28 bare masks 84,126, the largest
 * row of each of its seven slots 73,449 — 164,872 in all, the four big masks
 * (reeds, range, water, plum) 67,390 of it as SVG files, the form the owner
 * kept (2026-09-27: "Ảnh raster bị mờ thì không thể chấp nhận được"). Its
 * face, Noto Serif subset to Latin with small caps, was not measured; the
 * shipped Stall Serif's Latin subset is 37,740 as woff2, which gzip barely
 * moves. Against like for like: the every-visitor bucket — index.html, the
 * entry chunk and the entry CSS — is 235,100 gzip -9 bytes (860,043 raw,
 * measured 2026-09-27, and by the step-6 critic), so the target lets one
 * worn-only look cost a visitor to its stall about 1.09× the whole app
 * compressed. 164,872 measured for Ink wash, plus its unmeasured face
 * (~40 KB by Stall Serif's measure), plus ~50 KB of headroom — a judgement,
 * not a measurement. Every run prints each look's figure against it.
 *
 * **The cap, 512,000** — twice the target, the owner's number. Above it a
 * look is refused whatever its index says: a paint waits for a worn-only
 * sheet at most `LOOK_SHEET_WAIT_MS` (3 s, `src/ui/lookSheets.ts`) and then
 * paints the default look, and a mask not yet loaded paints nothing where
 * it falls, so a look a phone cannot fetch in that time is a look its
 * visitors do not see.
 *
 * **Between the two, a stated reason admits a look** (`lookBudgetVerdict`):
 * a private look whose index entry carries `budgetReason`
 * (`scripts/private-looks.mjs`, validated fail closed there — one plain,
 * non-blank sentence). The index is the owner's private repository, which
 * holds nothing he did not commit, so the reason being there IS his OK;
 * the reason is printed beside the figure on every run, so a heavy look is
 * never admitted in silence. A look with no index to state one in — the
 * workshop kit, the harness's fixture look, a worn-only look the role table
 * ships — is held to the target.
 */
export const LOOK_ART_TARGET_GZIP = 256_000;
export const LOOK_ART_CAP_GZIP = 512_000;

/** UTF-8 bytes of an emitted part. */
export function bytesOf(part) {
    if (part.type === 'chunk') return Buffer.byteLength(part.code ?? '', 'utf8');
    if (typeof part.source === 'string') return Buffer.byteLength(part.source, 'utf8');
    return part.source?.byteLength ?? 0;
}

/** An emitted part's text, for reading the names it holds. */
function textOf(part) {
    if (part.type === 'chunk') return part.code ?? '';
    if (typeof part.source === 'string') return part.source;
    return '';
}

/** Every `url()` target in a built sheet, quotes stripped. */
export function builtUrls(css) {
    const out = [];
    for (const m of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)) {
        out.push(m[1] ?? m[2] ?? m[3] ?? '');
    }
    return out;
}

/** The emitted file a built `url()` names, from a sheet at `from`: root-absolute or relative to the sheet. */
function fileNamed(target, from) {
    const value = target.split(/[?#]/)[0];
    if (value === '' || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return undefined;
    if (value.startsWith('/')) return value.slice(1);
    const parts = from.split('/').slice(0, -1);
    for (const seg of value.split('/')) {
        if (seg === '..') parts.pop();
        else if (seg !== '.' && seg !== '') parts.push(seg);
    }
    return parts.join('/');
}

/** True when `names` (an asset's original file names) holds `source`, a path from the repository root. */
function builtFrom(names, source) {
    return (names ?? []).some((name) => {
        const n = name.replaceAll('\\', '/');
        return n === source || n.endsWith(`/${source}`);
    });
}

/**
 * Every emitted file in one bucket.
 *
 * `parts` is a build's output (chunks and assets, Rollup's shape);
 * `entryHtml` the HTML entry whose visitor pays the every-visitor bucket;
 * `worn` the worn-only look sheets this build may hold, each
 * `{ lookClass, source }` — `source` the sheet's path from the repository
 * root, as the role table names it. A worn sheet the build never reached is
 * simply absent (a production build does not carry the harness's fixture);
 * one it reached but did not emit as its own file is a problem.
 */
export function weightBuckets(parts, { entryHtml = 'index.html', worn = [] } = {}) {
    const problems = [];
    const byName = new Map(parts.map((part) => [part.fileName, part]));

    const everyVisitor = new Set();
    const html = byName.get(entryHtml);
    if (html === undefined) {
        problems.push(`the build emitted no ${entryHtml}`);
    } else {
        everyVisitor.add(entryHtml);
    }
    const entries = parts.filter(
        (part) =>
            part.type === 'chunk' &&
            part.isEntry === true &&
            (part.facadeModuleId ?? '').replaceAll('\\', '/').endsWith(`/${entryHtml}`),
    );
    if (entries.length !== 1) {
        problems.push(`${entries.length} entry chunks answer for ${entryHtml}, where one does`);
    }
    const queue = entries.map((chunk) => chunk.fileName);
    while (queue.length > 0) {
        const name = queue.shift();
        if (everyVisitor.has(name)) continue;
        const chunk = byName.get(name);
        if (chunk === undefined) {
            problems.push(`${name} is imported and was not emitted`);
            continue;
        }
        everyVisitor.add(name);
        for (const next of chunk.imports ?? []) queue.push(next);
        for (const css of chunk.viteMetadata?.importedCss ?? []) queue.push(css);
    }

    const wornBuckets = new Map();
    const claimedBy = new Map();
    const claim = (file, owner) => {
        if (!claimedBy.has(file)) claimedBy.set(file, new Set());
        claimedBy.get(file).add(owner);
    };
    for (const name of everyVisitor) claim(name, 'every-visitor');
    for (const look of worn) {
        const sheets = parts.filter(
            (part) => part.type === 'asset' && part.fileName.endsWith('.css') && builtFrom(part.originalFileNames, look.source),
        );
        const mentioned = parts.some((part) => builtFrom(part.originalFileNames ?? part.moduleIds, look.source));
        if (sheets.length === 0) {
            if (mentioned) problems.push(`${look.lookClass}: ${look.source} was built into another file rather than its own sheet`);
            continue;
        }
        if (sheets.length > 1) {
            problems.push(`${look.lookClass}: ${look.source} was emitted as ${sheets.length} files`);
        }
        const sheet = sheets[0];
        const art = new Set();
        for (const target of builtUrls(textOf(sheet))) {
            const file = fileNamed(target, sheet.fileName);
            if (file === undefined) {
                problems.push(`${look.lookClass}: its sheet names ${target}, which is no file of this build`);
            } else if (!byName.has(file)) {
                problems.push(`${look.lookClass}: its sheet names ${file}, which the build did not emit`);
            } else {
                art.add(file);
            }
        }
        const files = [sheet.fileName, ...art];
        wornBuckets.set(look.lookClass, { sheet: sheet.fileName, art: [...art].sort(), files });
        for (const file of files) claim(file, `worn-only ${look.lookClass}`);
        // Named anywhere else — another sheet's url(), a script's string — the
        // file is two buckets'. The sheet's own name in a script is the one
        // exception: that is how a page reaches it.
        for (const file of art) {
            for (const other of parts) {
                if (other.fileName === sheet.fileName || other.fileName === file) continue;
                if (textOf(other).includes(`/${file}`) || (other.type === 'asset' && other.fileName.endsWith('.css') && builtUrls(textOf(other)).some((t) => fileNamed(t, other.fileName) === file))) {
                    claim(file, `named by ${other.fileName}`);
                }
            }
        }
        for (const other of parts) {
            if (other.type !== 'asset' || !other.fileName.endsWith('.css') || other.fileName === sheet.fileName) continue;
            if (builtUrls(textOf(other)).some((t) => fileNamed(t, other.fileName) === sheet.fileName)) {
                claim(sheet.fileName, `named by ${other.fileName}`);
            }
        }
    }
    for (const [file, owners] of claimedBy) {
        if (owners.size > 1) {
            problems.push(`${file} is in more than one weight bucket: ${[...owners].sort().join(', ')}`);
        }
    }

    const onDemand = parts.map((part) => part.fileName).filter((name) => !claimedBy.has(name));
    const sum = (names) => names.reduce((total, name) => total + (byName.has(name) ? bytesOf(byName.get(name)) : 0), 0);
    const worn_ = {};
    for (const [cls, bucket] of wornBuckets) {
        worn_[cls] = { ...bucket, bytes: sum(bucket.files) };
    }
    const ev = [...everyVisitor].sort();
    return {
        everyVisitor: { files: ev, bytes: sum(ev) },
        worn: worn_,
        onDemand: { files: onDemand.sort(), bytes: sum(onDemand) },
        problems,
    };
}

/** gzip -9 of `bytes`, Node's zlib: deterministic, and the number the budget is written in. */
export function gzipBytes(bytes) {
    return gzipSync(typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes, { level: 9 }).length;
}

/**
 * A selector with every functional pseudo-class's argument blanked —
 * `:not(…)`, `:is(…)`, `:where(…)`, `:has(…)` and the rest. A row's class
 * that appears only inside one does not scope the rule to that row
 * (`.t-x:not(.att-a) .b` paints on every stall BUT that row's), so its
 * `url()`s count as bare: conservative, never under (the step-6 critic).
 */
function outsideFunctions(selector) {
    let out = '';
    let depth = 0;
    for (let i = 0; i < selector.length; i += 1) {
        const c = selector[i];
        if (c === '(') {
            depth += 1;
        } else if (c === ')') {
            depth = Math.max(0, depth - 1);
        } else if (depth === 0) {
            out += c;
        }
    }
    return out;
}

/**
 * One worn-only look's budget reading: `sheet` its built CSS text, `files`
 * a map from each file its `url()`s name (as that sheet names them, after
 * `fileNamed`) to that file's bytes, `rows` the look's decoration rows
 * (`{ cls, slot }`, the catalogue's). A `url()` counts under the rows whose
 * class its rule's selectors name — every selector of the rule naming one, outside any
 * `:not()`, `:is()` or `:where()` (`outsideFunctions`) —
 * and under the bare look otherwise: a url in a bare rule, in a keyframe or
 * in a face is fetched whatever the stall wears. Where a url is written is
 * where it counts, so art a bare custom property carries into a row's rule
 * counts as bare: conservative, never under.
 */
export function lookArtBudget({ sheet, sheetFile = 'sheet.css', files, rows = [] }) {
    const rowClasses = new Map(rows.filter((row) => row.cls !== undefined).map((row) => [row.cls, row]));
    const bareFiles = new Set();
    const rowFiles = new Map();
    const place = (target, owners) => {
        const file = fileNamed(target, sheetFile);
        if (file === undefined) return;
        if (owners.length === 0) {
            bareFiles.add(file);
            return;
        }
        for (const cls of owners) {
            if (!rowFiles.has(cls)) rowFiles.set(cls, new Set());
            rowFiles.get(cls).add(file);
        }
    };
    const visit = (list) => {
        for (const node of list) {
            if (node.kind === 'rule') {
                const selectors = splitTopLevel(node.prelude, ',');
                const named = selectors.map((sel) =>
                    [...outsideFunctions(sel).matchAll(/\.([a-z0-9-]+)/gi)].map((m) => m[1]).filter((c) => rowClasses.has(c)),
                );
                const owners = named.some((list_) => list_.length === 0) ? [] : [...new Set(named.flat())];
                for (const target of builtUrls(node.body)) place(target, owners);
            } else if (node.children !== undefined) {
                visit(node.children);
            } else {
                for (const target of builtUrls(node.body ?? node.prelude ?? '')) place(target, []);
            }
        }
    };
    visit(parseSheet(sheet).nodes);
    const gz = (file) => {
        const bytes = files.get(file);
        if (bytes === undefined) throw new Error(`the budget has no bytes for ${file}`);
        return gzipBytes(bytes);
    };
    const bareArt = [...bareFiles].filter((file) => !(file === sheetFile));
    const bare = gzipBytes(sheet) + bareArt.reduce((total, file) => total + gz(file), 0);
    const slots = {};
    for (const [cls, fileSet] of rowFiles) {
        const slot = rowClasses.get(cls).slot;
        const cost = [...fileSet].filter((file) => !bareFiles.has(file)).reduce((total, file) => total + gz(file), 0);
        if (slots[slot] === undefined || cost > slots[slot].gzip) slots[slot] = { cls, gzip: cost };
    }
    const total = bare + Object.values(slots).reduce((sum, row) => sum + row.gzip, 0);
    return { bare, slots, total };
}

/**
 * A private look's budget reading from its source (step 8e1), for every
 * private look a run reads (`scripts/served-sheets.mjs`: the tracked fixture
 * in public CI, the selected look in a deploy job's `pnpm test`): its sheet
 * as written — the build only minifies it, so a source sheet counts more,
 * never less — over its `art/` as a build writes it (an SVG re-serialised by
 * the allow-list, `sanitizeSvg`, which is what is emitted; one it refuses
 * counted as given, the build failing on it anyway; a face as it is), and
 * its rows from its `look.json` (its moods and decorations, `{ cls, slot }`).
 * `look`: a `PrivateLookRead`. The built bucket of a deploy build is read
 * beside it in `src/bundle.test.ts` (8e2).
 */
export function privateLookArtBudget(look) {
    const rows = privateLookRows(look);
    const files = new Map(
        look.art
            .filter((file) => !file.name.endsWith('.txt'))
            .map((file) => {
                if (!file.name.endsWith('.svg')) return [`art/${file.name}`, file.bytes];
                const { svg } = sanitizeSvg(file.bytes.toString('utf8'));
                return [`art/${file.name}`, svg === undefined ? file.bytes : Buffer.from(svg, 'utf8')];
            }),
    );
    return lookArtBudget({ sheet: look.css, sheetFile: 'sheet.css', files, rows });
}

/**
 * A private look's rows from its `look.json`, `{ cls, slot }` — its moods and
 * its decorations, as the budget counts one per slot. `look`: a
 * `PrivateLookRead`. The budget over a deploy build's own worn bucket
 * (8e2, `each-look-keeps-its-art-budget`) reads them here too.
 */
export function privateLookRows(look) {
    const json = look.look !== null && typeof look.look === 'object' ? look.look : {};
    return [...(Array.isArray(json.moods) ? json.moods : []), ...(Array.isArray(json.decorations) ? json.decorations : [])]
        .filter((row) => row !== null && typeof row === 'object' && typeof row.slot === 'string')
        .map((row) => ({ cls: typeof row.cls === 'string' ? row.cls : undefined, slot: row.slot }));
}

const n = (value) => value.toLocaleString('en-US');

/**
 * One look's budget verdict, and the line every run prints for it:
 * `look` the name to print (its class), `total` its `lookArtBudget` total,
 * `reason` its index's `budgetReason`, or undefined for a look with none.
 *
 * - under `LOOK_ART_TARGET_GZIP`: admitted (`within`), and a reason its
 *   index states anyway is printed as not needed;
 * - from the target up to, not including, `LOOK_ART_CAP_GZIP`: admitted with
 *   a stated reason (`reasoned`, the reason in the line) and refused without
 *   one (`needs-reason`);
 * - at or over the cap: refused whatever the reason (`over-cap`).
 *
 * A reason `budgetReasonProblem` refuses is no reason (fail closed: the
 * index reader refuses it first, and a caller that passes one anyway gets
 * the refusal, never an admission). A total that is not a finite,
 * non-negative number is refused: a reading that failed is not a light look.
 */
export function lookBudgetVerdict({ look, total, reason }) {
    const head = `${look}: ${Number.isFinite(total) ? n(total) : String(total)} gzip -9 bytes`;
    if (!Number.isFinite(total) || total < 0) {
        return { admitted: false, state: 'unread', line: `${head} — not a reading; refused` };
    }
    if (total >= LOOK_ART_CAP_GZIP) {
        return {
            admitted: false,
            state: 'over-cap',
            line: `${head}, at or over the ${n(LOOK_ART_CAP_GZIP)} cap — refused whatever its index says`,
        };
    }
    const stated = reason !== undefined && budgetReasonProblem(reason) === undefined;
    if (total < LOOK_ART_TARGET_GZIP) {
        // A reason the look no longer needs is still printed: it is the
        // owner's to take out of the index, and silence would hide it.
        const spare = stated ? ` — its index's budgetReason is not needed under the target: ${JSON.stringify(reason)}` : '';
        return {
            admitted: true,
            state: 'within',
            line: `${head}, within the ${n(LOOK_ART_TARGET_GZIP)} target (cap ${n(LOOK_ART_CAP_GZIP)})${spare}`,
        };
    }
    const over = `${n(total - LOOK_ART_TARGET_GZIP)} over the ${n(LOOK_ART_TARGET_GZIP)} target, under the ${n(LOOK_ART_CAP_GZIP)} cap`;
    if (!stated) {
        return {
            admitted: false,
            state: 'needs-reason',
            line: `${head}, ${over}, and no budgetReason stated in a private look index — refused`,
        };
    }
    return {
        admitted: true,
        state: 'reasoned',
        line: `${head}, ${over} — admitted on its index's budgetReason: ${JSON.stringify(reason)}`,
    };
}
