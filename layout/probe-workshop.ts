/**
 * The workshop probe's entry: the layout probe over the kit's look alone.
 *
 * **Evaluation order is the design.** `workshopRegister` evaluates before
 * `probe` and hands `looks.ts` the kit's look and its built sheet's URL, so
 * `probe.ts`'s body loads that sheet through the app's loader and measures
 * that look and no other (`measuredLooks`) — with no dynamic import inside
 * the shared probe.
 *
 * **The cascade is the loader's** (8d1): the kit's sheet is its own file,
 * appended by `src/ui/lookSheets.ts` after every sheet the page already
 * links — after `stall.css` like a shipped look's, and after
 * `broadcast.css`, where a shipped look's precedes it, which is why the
 * starter carries `broadcast.css`'s look rules into the kit's sheet. The
 * road a private look's sheet takes in the app. (Until 8d1 the sheet rode
 * this page's entry CSS, and the order of the imports below decided where
 * it landed: importing the register first had linked it ahead of
 * `stall.css`.)
 *
 * Built only by `vite.workshop.config.ts`; the ordinary probe entry is
 * `layout/probe.html`, which never imports the kit.
 */
import '../src/ui/render';
import './workshopRegister';
import './probe';
