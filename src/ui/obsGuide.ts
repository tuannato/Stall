/**
 * The studio's stream overlay guide: the broadcast view's own generated link,
 * the OBS Browser Source recipe, and the truths a streamer would otherwise
 * only learn by watching a stream go wrong. CLAUDE.md §4's "The broadcast
 * view" documents the overlay this module only ever *links to* — nothing
 * here reads or renders offers.
 *
 * Own module, own copy: `copy.ts` is the other writer's file, so every
 * string a streamer reads is an exported constant in this one.
 *
 * Selection (which preset, which mode) is UI state that lives here alone —
 * no `history.state`, no `localStorage`, no handler back into `app.ts`. A
 * full app repaint (a live price tick, a fiat change, a panel switch) calls
 * `paintObsGuide` again from scratch, so the choice is kept in file-scoped
 * `let`s rather than a closure captured per call — the same reason
 * `iconCache` in `render.ts` is a module map and not a local one.
 */
import type { StallView } from '../domain/state';
import { stallPath } from '../domain/route';
import type { StallHandlers } from './render';
import { identityOf } from './render';
import {
    OBS_RAIL_STICKER_HEIGHT,
    OBS_STICKER_HEIGHT,
    OBS_STICKER_WIDTH,
} from './obsSizes';
import './obsGuide.css';

export type ObsPreset = 'corner' | 'rail';
export type ObsMode = 'fixed' | 'rail';

export const OBS_GUIDE_TITLE = 'Stream overlay';
export const OBS_GUIDE_LEDE =
    'Two ways to add this shop as a Browser Source: a drop-in 1920×1080 canvas, or a sticker you drag onto the stream.';

/**
 * The three step headings and the truths' title. `OBS_STEP_COPY` reads the
 * same as `OBS_COPY_LINK` today and is deliberately its own constant: one
 * is a heading over a field, the other is a button's label, and a rename of
 * either must not silently rename the other.
 */
export const OBS_STEP_CHOOSE = 'Where it sits, how the price shows';
export const OBS_STEP_COPY = 'Copy link';
export const OBS_STEP_SOURCE = 'Browser Source';
export const OBS_TRUTHS_TITLE = 'Before you go live';
/** The static guide at /stream — pictures, the same figures, nothing more. */
export const OBS_GUIDE_MORE = 'The full guide, with pictures:';
export const OBS_GUIDE_MORE_LINK = 'stall.cash/stream';

export const OBS_PRESET_LABEL = 'Where it sits';
export const OBS_PRESET_CORNER = 'Corner card';
export const OBS_PRESET_RAIL = 'Side rail';

export const OBS_MODE_LABEL = 'Price display';
export const OBS_MODE_FIXED = 'Always show a price';
export const OBS_MODE_RAIL = 'Rest, then show a price';

export const OBS_LINK_LEDE = 'Paste this into the Browser Source’s URL field.';
export const OBS_COPY_LINK = 'Copy link';
export const OBS_LINK_COPIED = 'Link copied';
export const OBS_COPY_LINK_FALLBACK = 'Select and copy this link.';

export const OBS_RECIPE_SOURCE = 'OBS → Sources → + → Browser.';
export const OBS_RECIPE_URL = 'URL: the link above.';
export const OBS_RECIPE_SIZE = 'Drop-in: Width 1920, Height 1080, FPS 30.';
export const OBS_RECIPE_STICKER = `Sticker: Width ${OBS_STICKER_WIDTH}, Height ${OBS_STICKER_HEIGHT} (corner) / ${OBS_RAIL_STICKER_HEIGHT} (rail).`;
export const OBS_RECIPE_CSS = 'Leave Custom CSS empty.';
export const OBS_RECIPE_TOGGLES =
    'Turn off “Shutdown source when not visible” and “Refresh browser when scene becomes active” — both close the source. The book updates over a live socket; if the index was down when the source started, the overlay retries on its own every 30 s. A shut-down source has neither.';
export const OBS_RECIPE_POSITION =
    'The corner sits bottom-right; the rail sits mid-right, with space above and below. Drag and scale freely — the QR scales with it. A vertical stream uses the sticker, dragged wherever the app’s own UI leaves room.';

/**
 * A 1080p frame read on a phone is a fifth of its size — this is the one
 * truth PROPOSAL.md C16 pins with its own test, so its wording is quoted,
 * not paraphrased, wherever this constant is used.
 */
export const OBS_TRUTH_PHONE_VIEWERS =
    'Phone viewers can’t read this overlay — a 1080p frame is a fifth of its size on a phone screen. Put the same stall link in the stream description or pinned chat.';
export const OBS_TRUTH_QR_SCAN =
    'The QR is 204 px at 1× — scale the source to grow it. Whether it scans for viewers watching at 720p is not measured.';
export const OBS_TRUTH_RAIL_RESTS =
    `“${OBS_MODE_RAIL}” rests without a price for 3 seconds of every 8 — pick “${OBS_MODE_FIXED}” for a shop that should never go quiet.`;
export const OBS_TRUTH_SIDE_RAIL_HAS_NO_PRICE =
    'Side rail never shows a price — it is the name and the QR only.';
export const OBS_TRUTH_STALE_OVERLAY =
    'If the overlay stops updating, OBS shut the source down — toggle the source’s visibility to bring it back.';

const DEFAULT_PRESET: ObsPreset = 'corner';
const DEFAULT_MODE: ObsMode = 'rail';

let selectedPreset: ObsPreset = DEFAULT_PRESET;
let selectedMode: ObsMode = DEFAULT_MODE;

/**
 * The selection above is file-scoped on purpose (see the module doc), which
 * means it also survives between test cases in the same file unless reset —
 * the same reason `resetIconsForTests` exists in `render.ts`.
 */
export function resetObsGuideForTests(): void {
    selectedPreset = DEFAULT_PRESET;
    selectedMode = DEFAULT_MODE;
}

function urlFor(raw: string, preset: ObsPreset, mode: ObsMode): string {
    const path = stallPath(raw);
    const modePart = preset === 'rail' ? '' : `&mode=${mode}`;
    return `${location.origin}${path}?view=broadcast&preset=${preset}${modePart}&bg=transparent`;
}

/**
 * The exact link the studio hands a streamer: `stallPath(identityOf(view))`
 * plus the broadcast params, `bg=transparent` always present, `mode`
 * omitted when `preset=rail` (the parser ignores it), and never
 * `location.search` — a `?m=` settings hint pinned into an OBS URL
 * would ride along on every future load of that Browser Source.
 * `undefined` only when this view carries no identity to link to.
 */
export function broadcastGuideUrl(
    view: StallView,
    preset: ObsPreset,
    mode: ObsMode,
): string | undefined {
    const raw = identityOf(view);
    return raw === undefined ? undefined : urlFor(raw, preset, mode);
}

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className !== undefined && className !== '') {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * One SVG node. `createElementNS`, never `innerHTML`: the CSP is `'self'`
 * and the diagram is built, not parsed. Class goes through `setAttribute`
 * because `className` on an SVG element is a read-only `SVGAnimatedString`.
 */
function svgEl(
    tag: string,
    className: string,
    attrs: Record<string, number | string> = {},
): SVGElement {
    const node = document.createElementNS(SVG_NS, tag) as SVGElement;
    node.setAttribute('class', className);
    for (const [name, value] of Object.entries(attrs)) {
        node.setAttribute(name, String(value));
    }
    return node;
}

/** The head plate's height with a price row on it, and without. */
const HEAD_TALL = 20;
const HEAD_SHORT = 14;

/**
 * The schematic beside the pickers: a frame standing for the stream, and
 * the overlay's two plates where the chosen preset puts them. It carries no
 * text and nothing tagged `data-role="price"` — it is a picture of a card,
 * never a price this app is claiming.
 *
 * A resting card and the side rail mount **no** price node at all, rather
 * than a dimmed one: the overlay itself does not mount `.bc-ext` in either
 * state, and a hidden price is exactly what the covered-amount rule exists
 * to refuse. The card is shorter by that row, which is why the CSS carries
 * two corner offsets — and why `data-mode` is set only when the mode picker
 * is on screen, the same rule the generated URL follows.
 *
 * Geometry is in viewBox user units throughout; the placement transform
 * lives in `obsGuide.css`, where a user-unit translate scales with the box.
 */
function diagram(preset: ObsPreset, mode: ObsMode): SVGElement {
    const showsPrice = preset === 'corner' && mode === 'fixed';
    const root = svgEl('svg', 'obs-dia', {
        viewBox: '0 0 160 90',
        'aria-hidden': 'true',
        'data-role': 'obs-diagram',
        'data-preset': preset,
    });
    if (preset !== 'rail') {
        root.setAttribute('data-mode', mode);
    }
    // The stream's own picture, top-left: a window and a caption bar, so the
    // card reads as sitting over somebody else's video and not on a page.
    root.append(svgEl('rect', 'd-frame', { x: 9, y: 9, width: 46, height: 27, rx: 2 }));
    root.append(svgEl('rect', 'd-frame', { x: 9, y: 40, width: 15, height: 4, rx: 1 }));

    const headHeight = showsPrice ? HEAD_TALL : HEAD_SHORT;
    const card = svgEl('g', 'd-plate');
    card.append(svgEl('rect', 'd-card', { x: 0, y: 0, width: 30, height: headHeight, rx: 2 }));
    card.append(svgEl('rect', 'd-brand', { x: 4, y: 4, width: 10, height: 2, rx: 1 }));
    card.append(svgEl('rect', 'd-name', { x: 4, y: 8, width: 20, height: 3, rx: 1 }));
    if (showsPrice) {
        card.append(svgEl('rect', 'd-price', { x: 4, y: 14, width: 14, height: 3, rx: 1 }));
    }

    const qrTop = headHeight + 2;
    card.append(svgEl('rect', 'd-card', { x: 0, y: qrTop, width: 30, height: 26, rx: 2 }));
    // Three finders and a scatter: enough to read as a code at 30 units
    // wide, never enough to scan. The real one is drawn by `qrSvg`.
    for (const [fx, fy] of [
        [6, 4],
        [18, 4],
        [6, 16],
    ] as const) {
        card.append(svgEl('rect', 'd-qr-ink', { x: fx, y: qrTop + fy, width: 6, height: 6 }));
        card.append(
            svgEl('rect', 'd-qr-hole', { x: fx + 1, y: qrTop + fy + 1, width: 4, height: 4 }),
        );
        card.append(
            svgEl('rect', 'd-qr-ink', { x: fx + 2, y: qrTop + fy + 2, width: 2, height: 2 }),
        );
    }
    for (const [dx, dy] of [
        [15, 13],
        [19, 16],
        [22, 19],
        [17, 19],
        [15, 22],
    ] as const) {
        card.append(svgEl('rect', 'd-qr-ink', { x: dx, y: qrTop + dy, width: 2, height: 2 }));
    }
    root.append(card);
    return root;
}

function presetPicker(onChange: () => void): HTMLElement {
    const label = el('label', 'paste-label obs-field', OBS_PRESET_LABEL);
    const select = el('select', 'paste-in');
    select.setAttribute('data-role', 'obs-preset-picker');
    select.setAttribute('data-focus-key', 'obs-preset-picker');
    const options: Array<[ObsPreset, string]> = [
        ['corner', OBS_PRESET_CORNER],
        ['rail', OBS_PRESET_RAIL],
    ];
    for (const [value, text] of options) {
        const opt = el('option', undefined, text);
        opt.value = value;
        opt.selected = value === selectedPreset;
        select.append(opt);
    }
    select.addEventListener('change', () => {
        selectedPreset = select.value as ObsPreset;
        onChange();
    });
    label.append(select);
    return label;
}

/** Hidden, not disabled, when `preset === 'rail'`: the app ignores `mode`
 * for that preset (PROPOSAL.md C1), so a control that visibly does nothing
 * is worse than one that is simply not there. */
function modePicker(onChange: () => void): HTMLElement {
    const label = el('label', 'paste-label obs-field', OBS_MODE_LABEL);
    const select = el('select', 'paste-in');
    select.setAttribute('data-role', 'obs-mode-picker');
    select.setAttribute('data-focus-key', 'obs-mode-picker');
    const options: Array<[ObsMode, string]> = [
        ['fixed', OBS_MODE_FIXED],
        ['rail', OBS_MODE_RAIL],
    ];
    for (const [value, text] of options) {
        const opt = el('option', undefined, text);
        opt.value = value;
        opt.selected = value === selectedMode;
        select.append(opt);
    }
    select.addEventListener('change', () => {
        selectedMode = select.value as ObsMode;
        onChange();
    });
    label.append(select);
    return label;
}

/**
 * Mirrors `shareControl` in `render.ts`: a readonly field holding the link,
 * a copy button that falls back to select-and-copy when the Clipboard API
 * is unavailable or refuses. Reuses the same `.share`/`.share-row`/
 * `.share-url`/`.mini` classes `stall.css` already styles, under this
 * module's own `data-role` rather than the share section's.
 */
function copyControl(url: string): HTMLElement {
    const wrap = el('div', 'share');
    wrap.setAttribute('data-role', 'obs-copy-link');
    wrap.append(el('p', 'fine', OBS_LINK_LEDE));
    const row = el('div', 'share-row');
    const field = el('input', 'share-url');
    field.type = 'text';
    field.readOnly = true;
    field.value = url;
    field.setAttribute('aria-label', OBS_COPY_LINK);
    const btn = el('button', 'mini obs-copy', OBS_COPY_LINK);
    btn.type = 'button';
    const fallback = (): void => {
        field.focus();
        field.select();
        btn.textContent = OBS_COPY_LINK_FALLBACK;
    };
    btn.addEventListener('click', () => {
        const clipboard = navigator.clipboard;
        if (clipboard !== undefined && typeof clipboard.writeText === 'function') {
            void clipboard.writeText(url).then(
                () => {
                    btn.textContent = OBS_LINK_COPIED;
                },
                () => {
                    fallback();
                },
            );
            return;
        }
        fallback();
    });
    row.append(field, btn);
    wrap.append(row);
    return wrap;
}

const RECIPE_STEPS = [
    OBS_RECIPE_SOURCE,
    OBS_RECIPE_URL,
    OBS_RECIPE_SIZE,
    OBS_RECIPE_STICKER,
    OBS_RECIPE_CSS,
    OBS_RECIPE_TOGGLES,
    OBS_RECIPE_POSITION,
];

/**
 * The toggles line, with each quoted OBS control bolded — built by SLICING
 * the constant at its quote characters, so `textContent` stays byte-identical
 * to `OBS_RECIPE_TOGGLES`. Retyping either name would put a second copy of
 * pinned copy in this file, and the two would drift with the test still
 * green. Test: `the-toggle-line-names-both-toggles-in-strong`.
 */
function togglesLine(into: HTMLElement): void {
    let at = 0;
    for (const quoted of OBS_RECIPE_TOGGLES.matchAll(/“[^”]*”/g)) {
        const start = quoted.index ?? 0;
        if (start > at) {
            into.append(OBS_RECIPE_TOGGLES.slice(at, start));
        }
        into.append(el('strong', undefined, quoted[0]));
        at = start + quoted[0].length;
    }
    into.append(OBS_RECIPE_TOGGLES.slice(at));
}

/**
 * The Browser Source recipe. Each line's number is a REAL `<span>`, never a
 * `::before` counter: the layout probe refuses a positioned pseudo-element
 * outright, because it is not in the DOM and neither the box check nor the
 * hit test can see one. The line's own text sits in a second span so the
 * `<li>`'s two-column grid holds exactly two items — the bolded names inside
 * the toggles line would otherwise each become a grid item of their own.
 */
/**
 * The last line of the section, and the only link out of it: the guide is a
 * document path served beside the app (CLAUDE.md §9), so this is a plain
 * anchor, never a handler. Painted with or without an identity — a seller
 * on a waiting screen can still read how the overlay works.
 */
function guideLink(): HTMLElement {
    const p = el('p', 'fine obs-more');
    p.append(OBS_GUIDE_MORE, ' ');
    const a = el('a', undefined, OBS_GUIDE_MORE_LINK);
    a.setAttribute('href', '/stream');
    a.setAttribute('data-role', 'obs-guide-link');
    p.append(a);
    return p;
}

function recipeList(): HTMLElement {
    const list = el('ol', 'obs-recipe');
    list.setAttribute('data-role', 'obs-recipe');
    RECIPE_STEPS.forEach((step, index) => {
        const warns = step === OBS_RECIPE_TOGGLES;
        const item = el('li', warns ? 'obs-warn' : undefined);
        item.append(el('span', 'obs-n', String(index + 1).padStart(2, '0')));
        const line = el('span', 'obs-t');
        if (warns) {
            togglesLine(line);
        } else {
            line.textContent = step;
        }
        item.append(line);
        list.append(item);
    });
    return list;
}

/** Where a truth's lead phrase ends. Every truth carries one. */
const LEAD_END = ' — ';

/** One truth on its own plate, led by its first phrase in bold — sliced, for
 *  the same reason the toggle names are. */
function truthPlate(truth: string): HTMLElement {
    const plate = el('p', 'fine');
    const cut = truth.indexOf(LEAD_END);
    if (cut === -1) {
        plate.textContent = truth;
        return plate;
    }
    plate.append(el('strong', undefined, truth.slice(0, cut)));
    plate.append(truth.slice(cut));
    return plate;
}

function truthsList(): HTMLElement {
    const wrap = el('div', 'obs-truths');
    wrap.setAttribute('data-role', 'obs-truths');
    const truths =
        selectedPreset === 'rail'
            ? [
                  OBS_TRUTH_PHONE_VIEWERS,
                  OBS_TRUTH_QR_SCAN,
                  OBS_TRUTH_SIDE_RAIL_HAS_NO_PRICE,
                  OBS_TRUTH_STALE_OVERLAY,
              ]
            : [
                  OBS_TRUTH_PHONE_VIEWERS,
                  OBS_TRUTH_QR_SCAN,
                  OBS_TRUTH_RAIL_RESTS,
                  OBS_TRUTH_STALE_OVERLAY,
              ];
    for (const truth of truths) {
        wrap.append(truthPlate(truth));
    }
    return wrap;
}

/**
 * A step's box and its heading. `<h3 class="obs-h">`, never `.section-head`
 * — that class is the studio section's own h2 and stays data-role-free
 * (`the-studio-groups-its-tools`). The badge is `.obs-sn` so `.obs-n` names
 * the recipe's numbers alone. The truths carry a title and no badge: they
 * are not a step a streamer performs.
 */
function stepBox(badge: number | undefined, heading: string, area: string): HTMLElement {
    const wrap = el('div', `obs-step ${area}`);
    const head = el('div', 'obs-sh');
    if (badge !== undefined) {
        head.append(el('span', 'obs-sn', String(badge)));
    }
    head.append(el('h3', 'obs-h', heading));
    wrap.append(head);
    return wrap;
}

/**
 * Paints, inside the section it is handed: the preset/mode choice, the
 * generated link with its own copy control, the Browser Source recipe, and
 * the truths a streamer needs before trusting an unattended overlay.
 *
 * `handlers` is accepted, unused, to match every studio section's call
 * shape — `paintStudio` hands each section the same three arguments — but
 * this module never navigates and never touches storage, so it has nothing
 * to call back for. Selection lives in this module's own state and a click
 * re-renders only the subtree this function owns.
 */
export function paintObsGuide(
    section: HTMLElement,
    view: StallView,
    _handlers: StallHandlers,
): void {
    const mount = el('div', 'obs-guide');
    mount.setAttribute('data-role', 'obs-guide');
    section.append(mount);

    const raw = identityOf(view);
    if (raw === undefined) {
        mount.append(el('p', 'fine obs-lead', OBS_GUIDE_LEDE));
        mount.append(guideLink());
        return;
    }

    /*
     * DOM order is the phone's reading order: the three steps, then the
     * truths. The desktop block in `obsGuide.css` re-places the same four
     * children into two columns — a grid area moves paint, never reading
     * order, which is why the truths are last here and second-from-bottom
     * on a wide screen.
     */
    const renderBody = (): void => {
        mount.replaceChildren();
        mount.append(el('p', 'fine obs-lead', OBS_GUIDE_LEDE));
        const grid = el('div', 'obs-grid');

        const where = stepBox(1, OBS_STEP_CHOOSE, 'obs-step-where');
        const choose = el('div', 'obs-choose');
        choose.append(diagram(selectedPreset, selectedMode));
        const fields = el('div', 'obs-fields');
        fields.append(presetPicker(renderBody));
        if (selectedPreset !== 'rail') {
            fields.append(modePicker(renderBody));
        }
        choose.append(fields);
        where.append(choose);
        grid.append(where);

        const copyStep = stepBox(2, OBS_STEP_COPY, 'obs-step-copy');
        copyStep.append(copyControl(urlFor(raw, selectedPreset, selectedMode)));
        grid.append(copyStep);

        const source = stepBox(3, OBS_STEP_SOURCE, 'obs-step-source');
        source.append(recipeList());
        grid.append(source);

        const truths = stepBox(undefined, OBS_TRUTHS_TITLE, 'obs-step-truths');
        truths.append(truthsList());
        grid.append(truths);

        mount.append(grid);
        mount.append(guideLink());
    };
    renderBody();
}
