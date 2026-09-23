/**
 * The showroom: every screen × look × decoration set, painted from the same
 * fixtures the layout probe measures, with the animations seekable. This is
 * the design iteration loop — offline, no chain, no network — and the page a
 * billboard check drives.
 *
 * Dev-only. It is not a build input of the app (`vite.config.ts` names no
 * extra entry); `vite.workshop.config.ts` builds it for `pnpm workshop`, and
 * `gallery-is-not-served` in `bundle.test.ts` proves the production build
 * emits none of it.
 *
 * It offers the shipped looks and, when `workshop/look.json` reads, the
 * workshop look ("Workshop (0xff)") with its moods and decorations. A look is
 * chosen through `looks.ts` and never by id here
 * (`the-harness-chooses-looks-in-one-place`).
 *
 * Read on load: `?look=` (an id — `255`, `0xff` — or `workshop`), `?screen=`,
 * `?flags=` (decoration bits, decimal or `0x…`) and `?chrome=0` (no control
 * panel, for screenshots).
 *
 * Automation hooks, kept stable on purpose:
 *   __paint(screen, themeId, flags) — paint one combination, return a label
 *   __seek(ms)                      — pause every animation at an instant
 *   __sheetClasses()                — the `t-*` classes the painted stall wears
 *   __shotPlan()                    — the workshop look's shot list (`shotPlan.ts`)
 *   __galleryReady                  — true once the module has evaluated
 */
import { renderStall } from '../src/ui/render';
import { WORKSHOP_THEME_ID } from '../src/domain/theme';
import { SCREENS, handlers } from './fixtures';
import { galleryLooks, kitLook, lookById, registerWorkshopLook, wornOf, type Look } from './looks';
import { shotPlan, type ShotJob } from './shotPlan';
import { loadKitLook } from './workshopKit';
// After the app's own sheets (imported through `render`), so the kit's sheet
// lands where a shipped look's does: last among equals in the cascade.
import '../workshop/theme-workshop.css';

const app = document.getElementById('app')!;
const ui = document.getElementById('gallery-ui')!;
const params = new URLSearchParams(location.search);

/*
 * The kit's look, when `workshop/look.json` reads. A file that does not read
 * leaves the shipped looks and says why on the page — the showroom is where a
 * creator is looking, and a blank page would say nothing.
 */
let kitProblem: string | undefined;
try {
    registerWorkshopLook(loadKitLook());
} catch (err) {
    kitProblem = (err as Error).message;
}

function numberParam(raw: string | null): number | undefined {
    if (raw === null || raw === '') {
        return undefined;
    }
    const n = raw.startsWith('0x') ? Number.parseInt(raw.slice(2), 16) : Number(raw);
    return Number.isInteger(n) ? n : undefined;
}

function lookParam(): Look | undefined {
    const raw = params.get('look');
    const id = raw === 'workshop' ? WORKSHOP_THEME_ID : numberParam(raw);
    return galleryLooks().find((look) => look.id === id);
}

let screen = (() => {
    const asked = params.get('screen');
    return asked !== null && asked in SCREENS ? asked : 'offers';
})();
let look: Look = lookParam() ?? kitLook() ?? galleryLooks()[0]!;
let flags = numberParam(params.get('flags')) ?? 0;

function paint(): string {
    const worn = wornOf(look, flags);
    const view = { ...SCREENS[screen]!, theme: look.theme, worn };
    renderStall(app, view, handlers);
    return `${screen} · theme ${look.id} · flags ${flags} · worn [${worn
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

function sheetClasses(): string[] {
    const out = new Set<string>();
    for (const stall of app.querySelectorAll('.stall')) {
        for (const cls of stall.classList) {
            if (cls.startsWith('t-')) {
                out.add(cls);
            }
        }
    }
    return [...out].sort();
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

function lookName(candidate: Look): string {
    const hex = `0x${candidate.id.toString(16).padStart(2, '0')}`;
    return candidate.id === WORKSHOP_THEME_ID
        ? `Workshop (${hex}) · ${candidate.label}`
        : `${candidate.label} (${hex})`;
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
for (const candidate of galleryLooks()) {
    const opt = el('option', undefined, lookName(candidate));
    opt.value = String(candidate.id);
    themeSelect.append(opt);
}
themeSelect.value = String(look.id);
themeSelect.addEventListener('change', () => {
    look = lookById(Number(themeSelect.value));
    // A look change drops the flags rather than re-aiming them — the same
    // rule the real picker enforces.
    flags = 0;
    paint();
    rebuildDecorRows();
});

const decorBox = el('div');

function rebuildDecorRows(): void {
    decorBox.replaceChildren();
    for (const row of look.rows) {
        const check = el('input') as HTMLInputElement;
        check.type = 'checkbox';
        check.checked = (flags & (1 << row.bit)) !== 0;
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

if (params.get('chrome') !== '0') {
    const panel = el('details');
    panel.open = true;
    panel.append(el('summary', undefined, 'showroom'));
    if (kitProblem !== undefined) {
        panel.append(el('pre', 'g-problem', kitProblem));
    }
    panel.append(labelled('screen', screenSelect));
    panel.append(labelled('look', themeSelect));
    panel.append(labelled('decorations', decorBox));
    panel.append(labelled('seek ms (dblclick: play)', seekRange));
    ui.append(panel);
}

rebuildDecorRows();
paint();

/* ---------- automation ---------- */

declare global {
    interface Window {
        __paint: (screenName: string, theme: number, flagBits: number) => string;
        __seek: (ms: number) => number;
        __sheetClasses: () => string[];
        __shotPlan: () => ShotJob[];
        __galleryReady: boolean;
    }
}

window.__paint = (screenName: string, theme: number, flagBits: number): string => {
    screen = screenName;
    look = lookById(theme);
    flags = flagBits;
    screenSelect.value = screenName;
    themeSelect.value = String(theme);
    rebuildDecorRows();
    return paint();
};

window.__seek = seek;
window.__sheetClasses = sheetClasses;
window.__shotPlan = () => {
    const kit = kitLook();
    if (kit === undefined) {
        throw new Error(kitProblem ?? 'no workshop look on this page');
    }
    return shotPlan(kit);
};
window.__galleryReady = true;
