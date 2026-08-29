/**
 * The showroom: every screen × look × decoration set, painted from the same
 * fixtures the layout probe measures, with the animations seekable. This is
 * the design iteration loop — offline, no chain, no network — and the page a
 * billboard check drives.
 *
 * Dev-only. It is not a build input (`vite.config.ts` names no extra entry),
 * and `gallery-is-not-served` in `bundle.test.ts` proves the production build
 * emits none of it.
 *
 * Automation hooks, kept stable on purpose:
 *   __paint(screen, themeId, flags) — paint one combination, return a label
 *   __seek(ms)                      — pause every animation at an instant
 *   __galleryReady                  — true once the module has evaluated
 */
import { renderStall } from '../src/ui/render';
import { decodeTheme, SHIPPED_THEMES } from '../src/domain/theme';
import { attachmentsForTheme, wornAttachments } from '../src/domain/attachments';
import { SCREENS, handlers } from './fixtures';

const app = document.getElementById('app')!;
const ui = document.getElementById('gallery-ui')!;

let screen = 'offers';
let themeId = SHIPPED_THEMES[0]!.id;
let flags = 0;

function paint(): string {
    const worn = wornAttachments(themeId, flags);
    const view = { ...SCREENS[screen]!, theme: decodeTheme(themeId), worn };
    renderStall(app, view, handlers);
    return `${screen} · theme ${themeId} · flags ${flags} · worn [${worn
        .map((w) => w.label)
        .join(', ')}]`;
}

function seek(ms: number): number {
    const anims = document.getAnimations();
    for (const a of anims) {
        a.pause();
        try {
            a.currentTime = ms;
        } catch {
            // A finished or unseekable animation is not a moving thing.
        }
    }
    return anims.length;
}

function resume(): void {
    for (const a of document.getAnimations()) {
        a.play();
    }
}

/* ---------- the control strip ---------- */

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls !== undefined) {
        node.className = cls;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

function labelled(text: string, control: HTMLElement): HTMLElement {
    const row = el('div', 'g-row');
    row.append(el('span', undefined, text), control);
    return row;
}

const screenSelect = el('select');
for (const name of Object.keys(SCREENS)) {
    const opt = el('option', undefined, name);
    opt.value = name;
    screenSelect.append(opt);
}
screenSelect.value = screen;
screenSelect.addEventListener('change', () => {
    screen = screenSelect.value;
    paint();
});

const themeSelect = el('select');
for (const t of SHIPPED_THEMES) {
    const opt = el('option', undefined, `${t.label} (0x${t.id.toString(16).padStart(2, '0')})`);
    opt.value = String(t.id);
    themeSelect.append(opt);
}
themeSelect.addEventListener('change', () => {
    themeId = Number(themeSelect.value);
    // A look change drops the flags rather than re-aiming them — the same
    // rule the real picker enforces.
    flags = 0;
    paint();
    rebuildDecorRows();
});

const decorBox = el('div');

function rebuildDecorRows(): void {
    decorBox.replaceChildren();
    for (const row of attachmentsForTheme(themeId)) {
        const check = el('input') as HTMLInputElement;
        check.type = 'checkbox';
        check.addEventListener('change', () => {
            flags = check.checked ? flags | (1 << row.bit) : flags & ~(1 << row.bit);
            paint();
        });
        const label = el('label', 'g-check');
        label.append(check, document.createTextNode(`${row.label} (${row.slot})`));
        decorBox.append(label);
    }
}

const seekRange = el('input') as HTMLInputElement;
seekRange.type = 'range';
seekRange.min = '0';
seekRange.max = '15000';
seekRange.value = '0';
seekRange.addEventListener('input', () => {
    seek(Number(seekRange.value));
});
seekRange.addEventListener('dblclick', () => {
    resume();
});

const panel = el('details');
panel.open = true;
panel.append(el('summary', undefined, 'showroom'));
panel.append(labelled('screen', screenSelect));
panel.append(labelled('look', themeSelect));
panel.append(labelled('decorations', decorBox));
panel.append(labelled('seek ms (dblclick: play)', seekRange));
ui.append(panel);

rebuildDecorRows();
paint();

/* ---------- automation ---------- */

declare global {
    interface Window {
        __paint: (screenName: string, theme: number, flagBits: number) => string;
        __seek: (ms: number) => number;
        __galleryReady: boolean;
    }
}

window.__paint = (screenName: string, theme: number, flagBits: number): string => {
    screen = screenName;
    themeId = theme;
    flags = flagBits;
    screenSelect.value = screenName;
    themeSelect.value = String(theme);
    rebuildDecorRows();
    return paint();
};

window.__seek = seek;
window.__galleryReady = true;
