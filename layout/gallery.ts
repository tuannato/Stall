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
 * It offers the shipped looks, every private look the build carries (8e2:
 * none unless a selection put one there, `scripts/looks-selection.mjs`) and,
 * when `workshop/look.json` reads, the workshop look ("Workshop (0xff)") with
 * its moods and decorations. A look is chosen through `looks.ts` and never by
 * id here, and its view is composed there (`paintView`;
 * `the-harness-chooses-looks-in-one-place`).
 *
 * Read on load: `?look=` (an id — `255`, `0xff` — or `workshop`), `?screen=`,
 * `?flags=` (decoration bits, decimal or `0x…`) and `?chrome=0` (no control
 * panel, for screenshots).
 *
 * Automation hooks, kept stable on purpose:
 *   __paint(screen, themeId, flags) — paint one combination, return a label
 *   __seek(ms)                      — pause every animation at an instant
 *   __sheetClasses()                — the `t-*` classes the painted stall wears
 *   __shotPlan(id?)                 — the workshop look's shot list, or a carried private look's (`shotPlan.ts`)
 *   __diffPlan()                    — the shipped and carried private looks' before/after list (`pnpm looks:diff`)
 *   __privateLooks()                — the private looks this build carries, by id and class
 *   __screens()                     — every fixture screen this build paints
 *   __lookSheets()                  — each painted stall's `t-*` class and the name its sheet gives it
 *   __galleryReady                  — true once the module has evaluated, a look's sheet that did not load included
 *
 * A worn-only look's sheet is loaded before the first paint, through the
 * app's loader (`src/ui/lookSheets.ts`), the way the probe's page does
 * (`wornSheet.ts`) — the kit's, which loads the worn-only way (8d1) — and
 * `pnpm looks:diff` refuses a shot whose painted look its sheet did not
 * name (`looks-diff-refuses-a-look-painted-without-its-sheet`).
 */
import { renderStall } from '../src/ui/render';
import { WORKSHOP_THEME_ID } from '../src/domain/theme';
import { SCREENS, handlers } from './fixtures';
import {
    galleryLooks,
    kitLook,
    lookById,
    paintView,
    privateLooks,
    registerWorkshopLook,
    shippedLooks,
    wornOf,
    type Look,
} from './looks';
import { diffPlan, shotPlan, type DiffJob, type ShotJob } from './shotPlan';
import { loadLookSheet } from '../src/ui/lookSheets';
import { loadKitLook } from './workshopKit';
import { KIT_SHEET_URL } from './workshopKitSheet';
import { lookSheetReads, wornSheetsOf, type LookSheetRead } from './wornSheet';

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
    registerWorkshopLook(loadKitLook(), KIT_SHEET_URL);
} catch (err) {
    kitProblem = (err as Error).message;
}

// Every worn-only look this showroom offers, its sheet on the page before
// the first paint — through the app's loader, after every sheet the page
// links: the kit's lands where a private look's does in the app, and a
// carried private look's (8e2) is the app's own road. A sheet that does
// not load (or loads and does not name its look) is said, as a look.json
// that does not read is (CRITIC-STEP-8D1 item 5): the page comes up with
// the reason where the look would paint, and that look is never painted
// without its sheet — `__paint` and `__shotPlan` refuse it with the same
// sentence, which `pnpm workshop:shots` then prints.
const sheetProblems = new Map<number, string>();
await Promise.all(
    galleryLooks()
        .filter((candidate) => candidate.theme.sheetLoad === 'worn')
        .map(async (candidate) => {
            try {
                await Promise.all(wornSheetsOf([candidate]).map(({ url, cls }) => loadLookSheet(url, cls)));
            } catch (err) {
                const whose = candidate === kitLook() ? "the workshop look's" : `${candidate.label}'s`;
                sheetProblems.set(
                    candidate.id,
                    `${whose} sheet did not load, so the showroom does not paint the look: ${(err as Error).message}`,
                );
            }
        }),
);
/** Why `candidate` is not painted on this page, or undefined. */
const sheetProblem = (candidate: Look | undefined): string | undefined =>
    candidate === undefined ? undefined : sheetProblems.get(candidate.id);

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
    const problem = sheetProblem(look);
    if (problem !== undefined) {
        // The look without its sheet is not the look: say why instead.
        app.replaceChildren(el('pre', 'g-problem', problem));
        return problem;
    }
    const worn = wornOf(look, flags);
    // Composed where every harness page composes a look (`paintView`): a
    // carried private look rides the try-on, under the harness's licence.
    renderStall(app, paintView(SCREENS[screen]!, look, worn), handlers);
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
    for (const problem of [kitProblem, ...sheetProblems.values()]) {
        if (problem !== undefined) {
            panel.append(el('pre', 'g-problem', problem));
        }
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
        __shotPlan: (lookId?: number) => ShotJob[];
        __diffPlan: () => DiffJob[];
        __screens: () => string[];
        __lookSheets: () => LookSheetRead[];
        __privateLooks: () => { id: number; sheetClass: string }[];
        __galleryReady: boolean;
    }
}

window.__paint = (screenName: string, theme: number, flagBits: number): string => {
    const problem = sheetProblem(galleryLooks().find((candidate) => candidate.id === theme));
    if (problem !== undefined) {
        throw new Error(problem);
    }
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
window.__shotPlan = (lookId?: number) => {
    // The kit's look by default; a carried private look's by its id (8e2:
    // `pnpm workshop:shots` under a selection shoots each one).
    const subject = lookId === undefined ? kitLook() : privateLooks().find((candidate) => candidate.id === lookId);
    if (subject === undefined) {
        throw new Error(
            lookId === undefined ? (kitProblem ?? 'no workshop look on this page') : `no private look ${lookId} in this build`,
        );
    }
    const problem = sheetProblem(subject);
    if (problem !== undefined) {
        throw new Error(problem);
    }
    return shotPlan(subject);
};
// The shipped looks, then every private look this build carries (8e2): what
// `pnpm looks:diff` compares, on both sides of a run that selects them.
window.__diffPlan = () => diffPlan([...shippedLooks(), ...privateLooks()]);
/** The private looks this build carries, by id and class (8e2): what a harness command holds to its selection. */
window.__privateLooks = () => privateLooks().map((candidate) => ({ id: candidate.id, sheetClass: candidate.theme.sheetClass }));
window.__screens = () => Object.keys(SCREENS);
window.__lookSheets = () => lookSheetReads(app);
window.__galleryReady = true;
