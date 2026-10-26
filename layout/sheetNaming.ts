/**
 * Whether a look's sheet names an attribute, read from the stylesheets a
 * probe page has loaded (the lint-belts critic's fifth review, ranked item
 * 4). The contrast plan samples the staged address screens (`addr-shown`,
 * `addr-copied`) for each measured look whose sheet names `[data-copied]`
 * (`COPIED_JOBS` in `contrastPlan.ts`), and the page cannot read a sheet's
 * text: the worn-only sheets are `<link>`s the app's loader put on the
 * page, and a shipped look's rules are in the entry CSS. It reads the
 * CSSOM instead — every rule of every sheet, a media block entered — for a
 * rule whose selector holds both the look's class and the attribute.
 *
 * The runner holds this answer to its own: it reads the same sheets as text
 * with the look lint's reader (`sheetNamesAttribute`,
 * `scripts/workshop-css.mjs`) and fails a run whose plan differs
 * (`the-plan-follows-the-sheets-that-name-data-copied`), so a CSSOM that
 * serialises a selector another way cannot quietly plan nothing.
 */

const escapeRe = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether any rule of `sheets` has a selector naming both `.cls` and the attribute `attribute`, in any case. */
export function loadedSheetNames(attribute: string, cls: string, sheets: StyleSheetList = document.styleSheets): boolean {
    const hasAttribute = new RegExp(`\\[\\s*${escapeRe(attribute)}(?![\\w-])`, 'i');
    const hasClass = new RegExp(`\\.${escapeRe(cls)}(?![\\w-])`);
    const walk = (rules: CSSRuleList): boolean => {
        for (const rule of Array.from(rules)) {
            const selector = (rule as CSSStyleRule).selectorText;
            if (typeof selector === 'string' && hasAttribute.test(selector) && hasClass.test(selector)) return true;
            const inner = (rule as CSSGroupingRule).cssRules;
            if (inner !== undefined && walk(inner)) return true;
        }
        return false;
    };
    for (const sheet of Array.from(sheets)) {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            // A sheet from another origin is unreadable; the probe page loads none.
            continue;
        }
        if (walk(rules)) return true;
    }
    return false;
}
