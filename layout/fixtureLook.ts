/**
 * The built URL of the harness's worn-only look's sheet (`FIXTURE_LOOK` in
 * `looks.ts`; step 6, 6.7 of the step-6 plan v2) — its own module so that
 * only the page that loads the sheet imports it: the probe. The showroom,
 * which never paints the fixture, carries neither the URL nor the file.
 *
 * `?url`: Vite builds `fixture-look.css` as its own CSS asset — minified,
 * hashed, its `url()` rewritten to the built art — and hands back the
 * same-origin URL, the shape a worn-only look's sheet takes in the
 * production loader's map (step 8). Never in the entry CSS
 * (`a-worn-only-look-sheet-is-not-in-the-entry-css`), and nothing under
 * `src/` imports this module (`gallery-is-not-served`).
 */
import fixtureSheetUrl from './fixture-look.css?url';

/** The built sheet's URL, same origin. */
export const FIXTURE_SHEET_URL: string = fixtureSheetUrl;
