/**
 * The MELIAF taxonomy module is not used (product decision, 2026-11-11): the
 * Glossary is what people see. `true` hides every surface of the module in the
 * front — panel entry and route, site menu and footer, the public
 * `landing-page/concepts` pages (they redirect to the glossary), the API keys
 * scopes and the example texts. Nothing is deleted: `false` brings it all back.
 *
 * The back keeps serving `GET /meliaf-taxonomy/:id` and
 * `GET api/meliaf-taxonomy/concepts`, which the glossary page uses (Persistent
 * URI, Cite, similar terms).
 */
export const MELIAF_TAXONOMY_HIDDEN = true;

/** API key scopes of the module (`concepts:read`, `concepts:request`, …). */
export function isMeliafTaxonomyScope(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('concepts:');
}
