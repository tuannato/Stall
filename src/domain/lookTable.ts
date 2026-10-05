/**
 * The look table the app decodes against (step 8): the shipped looks
 * (`theme.ts`, `attachments.ts`, public) merged with the private looks a
 * build includes (`virtual:stall-private-looks`, `src/private-looks.d.ts`).
 *
 * **Public symbols keep their public meaning; merged views get new names.**
 * `decodeTheme`, `SHIPPED_THEMES`, `SHIPPED_ATTACHMENTS` and the attachment
 * readers that consult the catalogue stay the three shipped looks — every
 * pin that counts three looks, the harness that measures them and the
 * scripts that read `theme.ts` by Node's type stripping keep reading exactly
 * that — and every app site that turns a record's id into a look, or lists
 * the looks a seller can choose, reads the merged view here instead. A site
 * left on the public table would paint the default look under a private
 * look's id (the kit's P1 shape, `the-harness-chooses-looks-in-one-place`),
 * so an app file takes from `theme.ts` and `attachments.ts` only the names
 * that read no catalogue — an allow-list, each name with its reason, so a
 * new catalogue reader is refused before anyone has classified it
 * (`the-app-takes-from-the-public-table-only-what-reads-no-catalogue`) — and
 * the sites themselves are pinned to their merged views
 * (`no-app-site-decodes-against-the-shipped-table-alone`).
 *
 * | merged view               | public table it reads today |
 * |---------------------------|-----------------------------|
 * | `decodeLook`              | `decodeTheme`               |
 * | `LOOK_ROWS`               | `SHIPPED_THEMES`            |
 * | `LOOK_ATTACHMENTS`        | `SHIPPED_ATTACHMENTS`       |
 * | `attachmentsForLook`      | `attachmentsForTheme`       |
 * | `wornForLook`             | `wornAttachments`           |
 * | `publishableLookFlags`    | `publishableFlags`          |
 * | `mintedLookTokens`        | `mintedAttachmentTokens`    |
 * | `lookAttachmentByTokenId` | `attachmentByTokenId`       |
 *
 * These eight are the module's whole runtime export
 * (`the-look-table-exports-exactly-its-merged-views`), and each answers a
 * public id exactly as its public counterpart does, rows by reference
 * (`every-merged-view-answers-a-public-id-as-the-public-table-does`). The
 * readers that take a worn set rather than an id (`wornFrom`, `withMood`,
 * `attachmentClasses`, `attachmentNodesWanted`) consult no catalogue and
 * stay where they are.
 *
 * **Step 8b1: the private half is empty, so each merged view IS its public
 * counterpart, re-exported under the merged name.** No build includes a
 * private look yet — the plugin that resolves the virtual module, the paid
 * gate and the stage filter are 8b2's — so the merge of the public table
 * with nothing is the public table, and writing it as a re-export rather
 * than as a merge over an empty list keeps the served bundle the bytes it
 * was (measured: `dist` identical to the previous `main`'s): a merge
 * function, however inert, is code the minifier keeps. 8b2 replaces each
 * re-export with the merge over `privateLooks` — all eight, the derived
 * readers as well as the obvious ones, over one merged `LOOK_ATTACHMENTS`
 * with its rows by reference — validated at runtime (not built yet: a look
 * whose JSON fails `lookFromData`, or whose id is not reserved, or whose
 * class is a shipped or harness one, or that repeats an id or a class, is to
 * be dropped and its id read as unknown, never a thrown boot), and makes
 * this module the virtual module's one importer
 * (`the-private-looks-module-is-the-look-tables-alone` holds that nothing
 * else imports it today).
 */
export { decodeTheme as decodeLook, SHIPPED_THEMES as LOOK_ROWS } from './theme';
export {
    SHIPPED_ATTACHMENTS as LOOK_ATTACHMENTS,
    attachmentByTokenId as lookAttachmentByTokenId,
    attachmentsForTheme as attachmentsForLook,
    mintedAttachmentTokens as mintedLookTokens,
    publishableFlags as publishableLookFlags,
    wornAttachments as wornForLook,
} from './attachments';
