/**
 * The workshop probe's entry: the layout probe over the kit's look alone.
 *
 * Order is the whole design, twice over.
 *
 * - **Evaluation.** `workshopRegister` evaluates before `probe` and hands
 *   `looks.ts` the kit's look, so `probe.ts`'s body measures that look and no
 *   other (`measuredLooks`) — with no dynamic import inside the shared probe.
 * - **The cascade.** The kit's sheet must land where a shipped look's does:
 *   after `stall.css`. A build links an entry's stylesheets in the order it
 *   imports their chunks, and the kit's sheet sits in the chunk this page
 *   shares with the showroom — the chunk `workshopRegister` pulls in. So the
 *   app's renderer (and with it every app sheet) is imported FIRST: measured,
 *   importing the register first linked the kit's sheet ahead of `stall.css`.
 *   (It still follows `broadcast.css`, where a shipped look's sheet precedes
 *   it — the one place the order differs, and the starter carries
 *   `broadcast.css`'s look rules into the kit's sheet for that reason.)
 *
 * Built only by `vite.workshop.config.ts`; the ordinary probe entry is
 * `layout/probe.html`, which never imports the kit.
 */
import '../src/ui/render';
import './workshopRegister';
import './probe';
import '../workshop/theme-workshop.css';
