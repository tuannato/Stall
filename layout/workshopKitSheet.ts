/**
 * The built URL of the workshop kit's sheet (`workshop/theme-workshop.css`;
 * step 8d1, STEP-6-PLAN v2 item 6.8): the kit loads the worn-only way, as a
 * private look's sheet does in the app — its own file, loaded by the app's
 * loader (`src/ui/lookSheets.ts`) before a kit page paints, never in a kit
 * page's entry CSS.
 *
 * `?url`: Vite builds the sheet as its own CSS asset — minified, hashed, its
 * `url()`s rewritten to the built art — and hands back the same-origin URL.
 * Imported by the kit's pages alone (the showroom and the workshop probe,
 * through `workshopRegister.ts`), so the ordinary probe never carries it
 * (`the-ordinary-probe-loads-no-kit`) and nothing under `src/` reaches it
 * (`gallery-is-not-served`). Every kit build holds the file against what
 * the build was given (`the-kit-build-emits-no-file-it-was-not-given`).
 */
import kitSheetUrl from '../workshop/theme-workshop.css?url';

/** The kit's built sheet's URL, same origin. */
export const KIT_SHEET_URL: string = kitSheetUrl;
