// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { WALL_FIGURE_FLOOR_PX, WALL_FIGURE_MIN_PX, fitWallFigures, forgetWallFit, setWallFigureGauge, type WallFigureRead } from './wallFit';

/**
 * A card as the wall builds it: the money node inside its price cell, a
 * listing's `from` beside it, and the figure built with its comma breaks
 * when `breaks`.
 */
function wall(figureText: string, opts: { from?: boolean; breaks?: boolean } = {}): { root: HTMLElement; head: HTMLElement; figure: HTMLElement } {
    const root = document.createElement('div');
    root.innerHTML = `<div class="stall shop-window" data-mode="cycle"><div class="stall-scroll"><main class="stall-body"><div class="items sw-strip"><div class="item"><div class="item-head"><span class="item-p"><span class="item-a">${opts.from === true ? '<span class="item-from">from</span>' : ''}<span class="item-x" data-role="price"></span>${opts.from === true ? '<span class="item-u">XEC</span>' : ''}</span></span></div></div></div></main><div class="sw-status"></div></div></div>`;
    const head = root.querySelector<HTMLElement>('.item-head')!;
    const figure = root.querySelector<HTMLElement>('.item-x')!;
    if (opts.breaks === true) {
        figure.innerHTML = `<span class="fig-say" role="img" aria-label="${figureText}"><span aria-hidden="true">${figureText}</span></span>`;
    } else {
        figure.textContent = figureText;
    }
    return { root, head, figure };
}

type Model = {
    room: number;
    design: number;
    /** The money node's width per px of its size. */
    perPx: number;
    /** `from`, ` XEC` and the gaps on one line. */
    fixed?: number;
    /** ` XEC` and its gap beside the figure once `from` stands above. */
    stackFixed?: number;
    /** The widest unbreakable piece, per px. */
    piecePerPx?: number;
    /** Chrome breaks at `<wbr>` under nowrap: an overflowing line comes back as two lines that fit. */
    chromeWraps?: boolean;
    /** And the price cell then reads stretched across its column, as the real one does. */
    cellFills?: boolean;
    /** How far the card runs past the status line at a size, in a shape. */
    over?: (px: number, shape: string) => number;
};

/** A gauge over a model of the card, reading the dress the fit put on it. */
function modelGauge(model: Model, reads: string[] = []) {
    return (head: HTMLElement, figure: HTMLElement): WallFigureRead => {
        const px = figure.style.fontSize === '' ? model.design : Number.parseFloat(figure.style.fontSize);
        const shape = head.getAttribute('data-wall-wrap') ?? 'line';
        const fig = model.perPx * px;
        let need: number;
        let widest = fig;
        let lines = 1;
        if (shape === 'line') {
            need = (model.fixed ?? 0) + fig;
            if (model.chromeWraps === true && need > model.room) {
                lines = 2;
                widest = fig / 2;
                need = (model.fixed ?? 0) + widest;
                if (model.cellFills === true) need = Math.max(need, model.room);
            }
        } else if (shape === 'stack') {
            need = (model.stackFixed ?? 0) + fig;
        } else {
            const avail = model.room - (model.stackFixed ?? 0);
            const piece = (model.piecePerPx ?? model.perPx) * px;
            widest = Math.max(piece, Math.min(fig, avail));
            lines = Math.max(1, Math.ceil(fig / Math.max(avail, piece)));
            need = (model.stackFixed ?? 0) + widest;
        }
        reads.push(`${shape} ${px}`);
        return {
            size: px,
            room: model.room,
            need,
            figure: fig,
            widest,
            lines,
            block: 1.1 * px * lines,
            over: model.over?.(px, shape) ?? -10,
            fits: need <= model.room + 0.5,
        };
    };
}

const sizeOf = (figure: HTMLElement): number => Number.parseFloat(figure.style.fontSize);

describe('the-cycle-figure-is-fitted-to-its-column', () => {
    afterEach(() => setWallFigureGauge(undefined));

    it('pins the one-line floor and the fit\'s floor by value', () => {
        // Every other case here derives its expectation from these symbols,
        // so a smaller floor (a figure a room cannot read) would stay green.
        expect(WALL_FIGURE_MIN_PX).toBe(32);
        expect(WALL_FIGURE_FLOOR_PX).toBe(16);
    });

    it('leaves a figure that stands at its design size at it, on one line', () => {
        const { root, head, figure } = wall('875', { from: true });
        setWallFigureGauge(modelGauge({ room: 400, design: 80, perPx: 1.8, fixed: 140 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBe(80);
        expect(head.hasAttribute('data-wall-wrap')).toBe(false);
    });

    it('shrinks a figure too wide for one line to the largest size that stands, and never grows one', () => {
        const { root, head, figure } = wall('$999.99');
        // 4.2px of figure a px of size in a 221px column: 52.6px stands, 65.5 does not.
        setWallFigureGauge(modelGauge({ room: 221, design: 65.5, perPx: 4.2 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBeLessThanOrEqual(221 / 4.2);
        expect(sizeOf(figure)).toBeGreaterThan(221 / 4.2 - 1);
        expect(head.hasAttribute('data-wall-wrap')).toBe(false);
        // Given the room back, it is given its size back: each run starts from the design.
        setWallFigureGauge(modelGauge({ room: 600, design: 65.5, perPx: 4.2 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBe(65.5);
    });

    it('never takes a one-line shape that stands only because the browser broke it', () => {
        const { root, head, figure } = wall('12,345.67 XEC', { breaks: true });
        setWallFigureGauge(modelGauge({ room: 400, design: 80, perPx: 7.8, chromeWraps: true }));
        fitWallFigures(root);
        // 400 / 7.8 = 51.3: one line, smaller, rather than two lines at 80.
        expect(sizeOf(figure)).toBeLessThanOrEqual(400 / 7.8);
        expect(sizeOf(figure)).toBeGreaterThanOrEqual(WALL_FIGURE_MIN_PX);
        expect(head.hasAttribute('data-wall-wrap')).toBe(false);
    });

    it('takes the largest size that stands where its first estimate lands far under it', () => {
        const { root, head, figure } = wall('$1,234,567.89', { breaks: true });
        // At the design size Chrome breaks the line at a <wbr> and the cell
        // reads stretched across the column, so the estimate takes the
        // figure to half its size (39.9px); one line stands up to
        // 1034 / 13.65 = 75.75px (measured in Chrome: Neo's figure on the
        // tall wall, taken at 66.7px where 113 stands).
        setWallFigureGauge(modelGauge({ room: 1034, design: 79.92, perPx: 13.65, chromeWraps: true, cellFills: true }));
        fitWallFigures(root);
        expect(head.hasAttribute('data-wall-wrap')).toBe(false);
        expect(sizeOf(figure)).toBeLessThanOrEqual(1034 / 13.65);
        expect(sizeOf(figure)).toBeGreaterThan(1034 / 13.65 - 0.5);
    });

    it('stands a listing\'s from above its figure where that buys the figure a size worth the line', () => {
        const { root, head, figure } = wall('875', { from: true });
        // One line: (221 - 160) / 1.86 = 32.8px. Stacked: (221 - 70) / 1.86 = 81 → the design, 65.5.
        setWallFigureGauge(modelGauge({ room: 221, design: 65.5, perPx: 1.86, fixed: 160, stackFixed: 70 }));
        fitWallFigures(root);
        expect(head.getAttribute('data-wall-wrap')).toBe('stack');
        expect(sizeOf(figure)).toBe(65.5);
        // Where the stack buys less than STACK_GAIN, one line stands.
        setWallFigureGauge(modelGauge({ room: 221, design: 65.5, perPx: 1.86, fixed: 85, stackFixed: 70 }));
        fitWallFigures(root);
        expect(head.hasAttribute('data-wall-wrap')).toBe(false);
    });

    it('breaks a figure after its commas, where no one-line shape stands at the one-line size, at the largest size its pieces stand at', () => {
        // D-2026-10-19-03 (3): the largest size at which the broken figure
        // stands at any number of lines, capped by its design size — not the
        // one-line size and no larger, as until 2026-10-20. The widest piece
        // is 6px a px of size in a 221px column: 36.8px stands, at three lines.
        const { root, head, figure } = wall('184,467,440,737,095,516.15 XEC', { breaks: true });
        setWallFigureGauge(modelGauge({ room: 221, design: 65.5, perPx: 18, piecePerPx: 6 }));
        fitWallFigures(root);
        expect(head.getAttribute('data-wall-wrap')).toBe('break');
        expect(sizeOf(figure)).toBeLessThanOrEqual(221 / 6);
        expect(sizeOf(figure)).toBeGreaterThan(221 / 6 - 0.6);
        expect(sizeOf(figure)).toBeGreaterThan(WALL_FIGURE_MIN_PX);
    });

    it('caps a broken figure at its design size, and takes more lines over a smaller figure (the critic\'s 32 → 56px)', () => {
        // Neo's `12,345,678,901.23` at 1280x900 as the critic read it: one
        // line nowhere near, two lines at 32px, three standing at 56px.
        const { root, head, figure } = wall('12,345,678,901.23', { breaks: true });
        setWallFigureGauge(modelGauge({ room: 230, design: 70, perPx: 10.4, piecePerPx: 230 / 56 }));
        fitWallFigures(root);
        expect(head.getAttribute('data-wall-wrap')).toBe('break');
        expect(sizeOf(figure)).toBeGreaterThan(55.4);
        expect(sizeOf(figure)).toBeLessThanOrEqual(56);
        // Where every piece stands at the design size, the design size: never larger.
        setWallFigureGauge(modelGauge({ room: 230, design: 70, perPx: 10.4, piecePerPx: 2 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBe(70);
    });

    it('holds a broken figure\'s card clear of the status line at the largest size that clears, and never under the one-line size for it', () => {
        const { root, head, figure } = wall('12,345,678,901.23', { breaks: true });
        // The card's height is the figure's lines: past the status line at
        // 56px on three lines, clear at 45px on two lines and under.
        const room = 230;
        const piecePerPx = room / 56;
        const over = (px: number): number => {
            const lines = Math.max(1, Math.ceil((10.4 * px) / room));
            return 1.1 * px * lines - 110;
        };
        setWallFigureGauge(modelGauge({ room, design: 70, perPx: 10.4, piecePerPx, over }));
        fitWallFigures(root);
        expect(head.getAttribute('data-wall-wrap')).toBe('break');
        expect(over(sizeOf(figure))).toBeLessThanOrEqual(0.5);
        expect(over(sizeOf(figure) + 0.6)).toBeGreaterThan(0.5);
        expect(sizeOf(figure)).toBeGreaterThan(WALL_FIGURE_MIN_PX);
        // A card held down by something else keeps its figure's size.
        setWallFigureGauge(modelGauge({ room, design: 70, perPx: 10.4, piecePerPx, over: () => 40 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBeGreaterThan(55.4);
        // And where even the one-line size runs past it, that size if giving moved the card.
        setWallFigureGauge(modelGauge({ room, design: 70, perPx: 10.4, piecePerPx, over: (px) => px * 2 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBe(WALL_FIGURE_MIN_PX);
    });

    it('shrinks a broken figure under that size only while a piece still does not stand, down to the floor', () => {
        const { root, head, figure } = wall('184,467,440,737,095,516.15 XEC', { breaks: true });
        // The last group with its unit, 10 characters: 6px a px of size, in a 150px column.
        setWallFigureGauge(modelGauge({ room: 150, design: 65.5, perPx: 18, piecePerPx: 6 }));
        fitWallFigures(root);
        expect(head.getAttribute('data-wall-wrap')).toBe('break');
        expect(sizeOf(figure)).toBeLessThanOrEqual(25);
        expect(sizeOf(figure)).toBeGreaterThanOrEqual(WALL_FIGURE_FLOOR_PX);
    });

    it('makes a figure with no break smaller than one line\'s smallest size rather than cut it, to the floor', () => {
        const { root, figure } = wall('$999,999.99');
        setWallFigureGauge(modelGauge({ room: 300, design: 65.5, perPx: 10 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBeLessThanOrEqual(30);
        expect(sizeOf(figure)).toBeGreaterThan(29);
        const narrow = wall('$999,999.99');
        setWallFigureGauge(modelGauge({ room: 100, design: 65.5, perPx: 10 }));
        fitWallFigures(narrow.root);
        expect(sizeOf(narrow.figure)).toBe(WALL_FIGURE_FLOOR_PX);
    });

    it('gives what the figure can to a card past the status line, and only while giving moves the card', () => {
        const { root, figure } = wall('$5.00');
        // The figure's line box is the card's tallest: every px it gives is 1.1px the card gives.
        setWallFigureGauge(modelGauge({ room: 900, design: 80, perPx: 3, over: (px) => (px - 60) * 1.1 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBeLessThanOrEqual(60);
        expect(sizeOf(figure)).toBeGreaterThan(55);
        // A card held down by something else keeps its figure's size.
        setWallFigureGauge(modelGauge({ room: 900, design: 80, perPx: 3, over: () => 40 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBe(80);
        // And never below the one-line size for it.
        setWallFigureGauge(modelGauge({ room: 900, design: 80, perPx: 3, over: (px) => px * 1.1 }));
        fitWallFigures(root);
        expect(sizeOf(figure)).toBe(WALL_FIGURE_MIN_PX);
    });

    it('takes one line over a stacked listing that would still run past the status line', () => {
        const { root, head, figure } = wall('12,345,678,901,234.5', { from: true });
        // One line stands at 39px; stacked, 60px, but the stack's extra line
        // keeps the card 14px over the status line even at 32px.
        setWallFigureGauge(
            modelGauge({
                room: 702,
                design: 99,
                perPx: 8.9,
                fixed: 200,
                stackFixed: 70,
                over: (px, shape) => (shape === 'stack' ? px * 1.1 - 21 : px * 1.1 - 70),
            }),
        );
        fitWallFigures(root);
        expect(head.hasAttribute('data-wall-wrap')).toBe(false);
        expect(sizeOf(figure)).toBeGreaterThanOrEqual(WALL_FIGURE_MIN_PX);
        expect(sizeOf(figure)).toBeLessThanOrEqual((702 - 200) / 8.9);
    });

    it('is inert where nothing lays out, and outside a Cycle wall', () => {
        const { root, head, figure } = wall('875', { from: true });
        fitWallFigures(root);
        expect(figure.style.fontSize).toBe('');
        expect(head.hasAttribute('data-wall-wrap')).toBe(false);
        const browse = wall('875');
        browse.root.querySelector('.shop-window')!.setAttribute('data-mode', 'browse');
        const reads: string[] = [];
        setWallFigureGauge(modelGauge({ room: 10, design: 80, perPx: 3 }, reads));
        fitWallFigures(browse.root);
        expect(reads).toEqual([]);
    });

    it('fits the card again when its frame changes size with no paint, and lets go of a frame the next paint throws away', () => {
        const { root, figure } = wall('$999.99');
        document.body.append(root);
        const frame = root.querySelector<HTMLElement>('.shop-window')!;
        const size = (w: number, h: number): void => {
            Object.defineProperty(frame, 'clientWidth', { value: w, configurable: true });
            Object.defineProperty(frame, 'clientHeight', { value: h, configurable: true });
        };
        type Watch = { callback: () => void; watched: Element[]; live: boolean };
        const watches: Watch[] = [];
        const real = globalThis.ResizeObserver;
        globalThis.ResizeObserver = class {
            private readonly watch: Watch;
            constructor(callback: () => void) {
                this.watch = { callback, watched: [], live: true };
                watches.push(this.watch);
            }
            observe(el: Element): void {
                this.watch.watched.push(el);
            }
            unobserve(): void {}
            disconnect(): void {
                this.watch.live = false;
            }
        } as unknown as typeof ResizeObserver;
        try {
            size(1280, 800);
            setWallFigureGauge(modelGauge({ room: 600, design: 65.5, perPx: 4.2 }));
            fitWallFigures(root);
            expect(sizeOf(figure)).toBe(65.5);
            expect(watches.map((w) => w.watched)).toEqual([[frame]]);
            // The callback an observer delivers on `observe`, the size unchanged: nothing is fitted.
            const reads: string[] = [];
            setWallFigureGauge(modelGauge({ room: 221, design: 65.5, perPx: 4.2 }, reads));
            watches[0]!.callback();
            expect(reads).toEqual([]);
            // The frame narrows with no paint (a window resized, a tablet
            // turned): fitted again, to the new column, with what the paint
            // measures around the fit run again around it — the name ladder
            // before, the marquees after (the wall-offsize critic's item 9).
            size(1024, 768);
            watches[0]!.callback();
            expect(reads.length).toBeGreaterThan(0);
            expect(sizeOf(figure)).toBeLessThanOrEqual(221 / 4.2);
            expect(sizeOf(figure)).toBeGreaterThan(221 / 4.2 - 1);
            const order: string[] = [];
            const around = modelGauge({ room: 300, design: 65.5, perPx: 4.2 });
            setWallFigureGauge((h, f) => {
                order.push('fit');
                return around(h, f);
            });
            fitWallFigures(root, { before: (at) => order.push(at === root ? 'ladder' : 'ladder, elsewhere'), after: (at) => order.push(at === root ? 'marquees' : 'marquees, elsewhere') });
            order.length = 0;
            const refitted = watches.at(-1)!;
            size(800, 1280);
            refitted.callback();
            expect(order[0]).toBe('ladder');
            expect(order.at(-1)).toBe('marquees');
            expect(order.slice(1, -1).every((step) => step === 'fit') && order.length > 2).toBe(true);
            // A second fit of the same root watches anew and lets the first watch go.
            fitWallFigures(root);
            expect(watches.map((w) => w.live)).toEqual([false, false, true]);
            // The paint about to run throws the frame away, and its watch with it.
            forgetWallFit(root);
            expect(watches.map((w) => w.live)).toEqual([false, false, false]);
        } finally {
            globalThis.ResizeObserver = real;
            root.remove();
        }
    });

    it('holds every transition on the card off while it reads, finished first, and puts them back after the size is settled', () => {
        // D-2026-10-19-03 (1): a running transition out-ranks the fit's
        // inline size, so a look's `transition: all` on the figure read a
        // size halfway to the last one (the critic's plant on Neo).
        const { root, figure } = wall('$999.99');
        const cell = root.querySelector<HTMLElement>('.item-p')!;
        figure.style.setProperty('transition', 'all 0.4s');
        cell.style.setProperty('transition', 'font-size 1s');
        figure.style.setProperty('font-size', '50px');
        const finished: string[] = [];
        const real = (globalThis as { CSSTransition?: unknown }).CSSTransition;
        class FakeTransition {
            finish(): void {
                finished.push('finished');
            }
        }
        (globalThis as { CSSTransition?: unknown }).CSSTransition = FakeTransition;
        (figure as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [new FakeTransition()];
        // The last fit's size is taken off with the transitions already held.
        const taken: string[] = [];
        const remove = figure.style.removeProperty.bind(figure.style);
        figure.style.removeProperty = (prop: string): string => {
            if (prop === 'font-size') taken.push(`${figure.style.getPropertyValue('transition')} ${finished.length}`);
            return remove(prop);
        };
        const seen = new Set<string>();
        try {
            setWallFigureGauge((h, f) => {
                seen.add(`${f.style.getPropertyValue('transition')} ${f.style.getPropertyPriority('transition')} / ${cell.style.getPropertyValue('transition')}`);
                return modelGauge({ room: 221, design: 65.5, perPx: 4.2 })(h, f);
            });
            fitWallFigures(root);
        } finally {
            (globalThis as { CSSTransition?: unknown }).CSSTransition = real;
        }
        expect(taken).toEqual(['none 1']);
        expect([...seen]).toEqual(['none important / none']);
        expect(figure.style.getPropertyValue('transition')).toBe('all 0.4s');
        expect(figure.style.getPropertyPriority('transition')).toBe('');
        expect(cell.style.getPropertyValue('transition')).toBe('font-size 1s');
        expect(sizeOf(figure)).toBeLessThanOrEqual(221 / 4.2);
    });

    it('puts the card\'s own style back after it reads it', () => {
        const { root, head } = wall('875', { from: true });
        const cell = root.querySelector<HTMLElement>('.item-p')!;
        cell.style.setProperty('--sway', '1');
        cell.style.setProperty('rotate', '2deg');
        // While it reads, the turn and the sway are off.
        const seen: string[] = [];
        setWallFigureGauge((h, f) => {
            seen.push(`${cell.style.getPropertyValue('rotate')} ${cell.style.getPropertyPriority('rotate')} ${h.style.getPropertyValue('transform')}`);
            return modelGauge({ room: 221, design: 65.5, perPx: 1.86, fixed: 160, stackFixed: 70 })(h, f);
        });
        fitWallFigures(root);
        expect(new Set(seen)).toEqual(new Set(['none important none']));
        // And after, the card's own style is back — through the CSSOM, never the attribute.
        expect(cell.style.getPropertyValue('--sway')).toBe('1');
        expect(cell.style.getPropertyValue('rotate')).toBe('2deg');
        expect(cell.style.getPropertyValue('transform')).toBe('');
        expect(head.hasAttribute('style')).toBe(false);
        expect(head.parentElement!.hasAttribute('style')).toBe(false);
    });
});
