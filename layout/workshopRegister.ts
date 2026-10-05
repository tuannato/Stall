/**
 * Registers the kit's look with `looks.ts`, as a side effect of being
 * imported, with the URL of its built sheet (`workshopKitSheet.ts`): the
 * probe module's body loads every worn-only look it measures through the
 * app's loader before its first paint, the kit's among them.
 * `probe-workshop.ts` imports this BEFORE `probe.ts`: an ES module's
 * dependencies evaluate in import order, so the look is there by the time
 * the probe module's body asks `measuredLooks()` — with no dynamic import
 * inside the shared probe, whose body runs synchronously and must stay so.
 *
 * A file that does not read throws here, and the probe never reports; the
 * kit's commands validate `workshop/look.json` before they build, so the
 * creator reads the list in the terminal first.
 */
import { registerWorkshopLook } from './looks';
import { loadKitLook } from './workshopKit';
import { KIT_SHEET_URL } from './workshopKitSheet';

registerWorkshopLook(loadKitLook(), KIT_SHEET_URL);
