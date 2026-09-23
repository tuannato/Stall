/**
 * The workshop look this checkout holds: `workshop/look.json`, read at build
 * time as text (`?raw`, so `tsc` never types a creator's file and a JSON
 * fault is the validator's sentence rather than a build error) and parsed by
 * `workshopLook.ts`.
 *
 * Imported by the kit's pages only — the showroom and the workshop probe
 * entry. The ordinary probe (`layout/probe.html`) never reaches this module,
 * so `pnpm test:layout` never loads a creator's look
 * (`the-ordinary-probe-loads-no-kit`).
 */
import lookText from '../workshop/look.json?raw';
import { parseWorkshopLook, type WorkshopLook } from './workshopLook';

/** The kit's look, or a `WorkshopLookError` listing every fault in the file. */
export function loadKitLook(): WorkshopLook {
    return parseWorkshopLook(lookText);
}
