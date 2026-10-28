/**
 * Concept creation is paused while MELIAF taxonomy moves into the Glossary
 * (Yeck, 2026-10-28): the Glossary, published since 2022 and consumed by PRMS,
 * MEL and MARLO, is the base, and the taxonomy capabilities are being added to
 * it. Nothing is deleted here — reading, editing and exporting what exists keep
 * working — but no new concept may enter this module, one by one or in bulk.
 *
 * One switch for every surface (the "New concept" button, the Usage shortcut
 * that opens the same form, the bulk import), so lifting the pause is one line.
 */
export const CONCEPT_CREATION_PAUSED = true;

/** The notice shown at the top of the MELIAF taxonomy admin page. */
export const MIGRATION_NOTICE =
  'MELIAF taxonomy is being migrated into the Glossary. Creating concepts — one by one or in bulk — is disabled for now; ' +
  'the Glossary you already use keeps working as usual.';

/** The short reason next to a disabled create button. */
export const CREATION_PAUSED_HINT = 'Disabled for now: MELIAF taxonomy is being migrated into the Glossary.';
