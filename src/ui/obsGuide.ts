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

export type ObsPreset = 'corner' | 'rail';
export type ObsMode = 'fixed' | 'rail';

export const OBS_GUIDE_TITLE = 'Stream overlay';
export const OBS_GUIDE_LEDE =
    'Two ways to add this shop as a Browser Source: a drop-in 1920×1080 canvas, or a sticker you drag onto the stream.';

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

function presetPicker(onChange: () => void): HTMLElement {
    const label = el('label', 'paste-label', OBS_PRESET_LABEL);
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
    const label = el('label', 'paste-label', OBS_MODE_LABEL);
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
    const btn = el('button', 'mini', OBS_COPY_LINK);
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

function recipeList(): HTMLElement {
    const list = el('ol', 'obs-recipe');
    list.setAttribute('data-role', 'obs-recipe');
    for (const step of [
        OBS_RECIPE_SOURCE,
        OBS_RECIPE_URL,
        OBS_RECIPE_SIZE,
        OBS_RECIPE_STICKER,
        OBS_RECIPE_CSS,
        OBS_RECIPE_TOGGLES,
        OBS_RECIPE_POSITION,
    ]) {
        list.append(el('li', undefined, step));
    }
    return list;
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
        wrap.append(el('p', 'fine', truth));
    }
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
        mount.append(el('p', 'fine', OBS_GUIDE_LEDE));
        return;
    }

    const renderBody = (): void => {
        mount.replaceChildren();
        mount.append(el('p', 'fine', OBS_GUIDE_LEDE));

        const choices = el('div', 'obs-choices');
        choices.append(presetPicker(renderBody));
        if (selectedPreset !== 'rail') {
            choices.append(modePicker(renderBody));
        }
        mount.append(choices);

        const url = urlFor(raw, selectedPreset, selectedMode);
        mount.append(copyControl(url));

        mount.append(recipeList());
        mount.append(truthsList());
    };
    renderBody();
}
