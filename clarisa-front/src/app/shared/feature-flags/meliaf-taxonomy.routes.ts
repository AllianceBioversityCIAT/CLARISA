import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

/**
 * Routes that replace the MELIAF taxonomy pages while `MELIAF_TAXONOMY_HIDDEN`
 * is on: redirects only, so the lazy modules are never loaded and nothing of
 * the module renders (its public pages include "Propose a change" forms).
 */

export const PANEL_HOME_URL = '/clarisa-panel/manage';
export const GLOSSARY_URL = '/landing-page/glossary';
const GLOSSARY_TERM_URL = '/landing-page/glossary/term/:termId';

/**
 * In place of `concepts-admin` (and its old name `global-concepts-admin`).
 * Without these, removing the menu entry alone would leave the page open:
 * `AdminAccessGuard` lets through any URL that has no entry in the nav.
 * Prefix match, so `concepts-admin/…` redirects too.
 */
export const HIDDEN_CONCEPTS_ADMIN_ROUTES: Routes = [
  { path: 'global-concepts-admin', redirectTo: PANEL_HOME_URL },
  { path: 'concepts-admin', redirectTo: PANEL_HOME_URL }
];

/**
 * One numeric segment is a concept of the default scheme
 * (`/landing-page/concepts/2374`). Same test as `defaultSchemeConceptMatcher`
 * in the module's routing, repeated here so the hidden routes do not import
 * (and bundle) the module's components.
 */
export function hiddenNumericConceptMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  return segments.length === 1 && /^\d+$/.test(segments[0].path) ? { consumed: segments, posParams: { termId: segments[0] } } : null;
}

/**
 * Children of `landing-page/concepts` while hidden. Old links exist in the
 * wild (production redirected term URIs to `concepts/meliaf-taxonomy/{id}`),
 * so a concept detail lands on its glossary permalink and everything else on
 * the glossary. `requests/*`, `developers` and `guide` go first: they are not
 * concepts (`requests/12` would otherwise read as a scheme and a term).
 */
export const HIDDEN_PUBLIC_CONCEPTS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: GLOSSARY_URL },
  { path: 'requests', redirectTo: GLOSSARY_URL },
  { path: 'developers', redirectTo: GLOSSARY_URL },
  { path: 'guide', redirectTo: GLOSSARY_URL },
  { matcher: hiddenNumericConceptMatcher, redirectTo: GLOSSARY_TERM_URL },
  { path: ':scheme/:termId', pathMatch: 'full', redirectTo: GLOSSARY_TERM_URL },
  { path: '**', redirectTo: GLOSSARY_URL }
];
