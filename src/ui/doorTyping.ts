/**
 * The door's paste box shows what goes in it by typing it.
 *
 * The owner's ask (2026-09-20): a visitor did not know the box takes an
 * address. So the placeholder types three example addresses one after
 * another, then types the instruction and rests on it — the instruction and
 * not an address, because a box that rests on an address reads as already
 * filled in. The examples are derived from dummy keys nobody holds
 * (`copy.HOME_PASTE_SAMPLES`), never a real seller's.
 *
 * Three rules, each with its reason:
 * - **It is the placeholder, never the value.** Nothing here can be
 *   submitted, copied or mistaken for what the visitor typed.
 * - **It stops the moment the box is touched**, and never starts while the
 *   box holds text: a visitor mid-paste must not watch letters move.
 * - **Reduced motion means no motion**: the placeholder is the instruction,
 *   still, from the first paint.
 *
 * `renderStall` rebuilds the door on every paint, so the cursor lives here
 * in module state and a repaint continues the sequence rather than starting
 * it again; one timer at a time, cleared before the next is armed.
 */

const TYPE_MIN_MS = 28;
const TYPE_JITTER_MS = 34;
const HOLD_MS = 1100;
const PAUSE_MS = 350;
const DELETE_MS = 18;
const DELETE_CHARS = 3;
const START_MS = 900;

interface Cursor {
    sample: number;
    chars: number;
    deleting: boolean;
    done: boolean;
}

let cursor: Cursor = { sample: 0, chars: 0, deleting: false, done: false };
let stopped = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function clear(): void {
    if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
    }
}

/** Test seam: the next arm starts the sequence from the beginning. */
export function resetDoorTyping(): void {
    clear();
    cursor = { sample: 0, chars: 0, deleting: false, done: false };
    stopped = false;
}

function reducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/**
 * Arm the sequence on `input`. `samples` are typed and deleted in turn;
 * `rest` is typed last and stays. Safe to call on every paint.
 */
export function armDoorTyping(
    input: HTMLInputElement,
    samples: readonly string[],
    rest: string,
): void {
    clear();
    const script = [...samples, rest];
    const halt = (): void => {
        stopped = true;
        clear();
        input.placeholder = rest;
    };
    if (stopped || cursor.done || input.value !== '' || reducedMotion() || script.length === 0) {
        input.placeholder = rest;
        return;
    }
    input.addEventListener('focus', halt, { once: true });
    input.addEventListener('input', halt, { once: true });
    const current = script[cursor.sample] ?? rest;
    input.placeholder = current.slice(0, cursor.chars);
    const tick = (): void => {
        timer = undefined;
        if (stopped || !input.isConnected) {
            return;
        }
        const text = script[cursor.sample] ?? rest;
        const last = cursor.sample === script.length - 1;
        if (!cursor.deleting) {
            cursor.chars += 1;
            input.placeholder = text.slice(0, cursor.chars);
            if (cursor.chars >= text.length) {
                if (last) {
                    cursor.done = true;
                    return;
                }
                cursor.deleting = true;
                timer = setTimeout(tick, HOLD_MS);
                return;
            }
            timer = setTimeout(tick, TYPE_MIN_MS + Math.random() * TYPE_JITTER_MS);
            return;
        }
        cursor.chars -= DELETE_CHARS;
        if (cursor.chars <= 0) {
            cursor.chars = 0;
            cursor.deleting = false;
            cursor.sample += 1;
            input.placeholder = '';
            timer = setTimeout(tick, PAUSE_MS);
            return;
        }
        input.placeholder = text.slice(0, cursor.chars);
        timer = setTimeout(tick, DELETE_MS);
    };
    timer = setTimeout(tick, cursor.chars === 0 && cursor.sample === 0 ? START_MS : TYPE_MIN_MS);
}
