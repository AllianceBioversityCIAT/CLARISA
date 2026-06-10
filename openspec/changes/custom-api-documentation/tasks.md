## 1. Replace the iframe asset

- [x] 1.1 Back up the current Scalar `assets/api-reference/index.html` content (keep a copy for rollback reference) and replace it with the custom Tailwind documentation app adapted from the prototype (`~/Desktop/clarisa/output/api-docs-proposal/index.html`)
- [x] 1.2 Make the app read the API base from the `?api=` query param (with a localhost fallback) and use it to fetch both `api-docs-json` and each live endpoint
- [x] 1.3 Ensure the app loads SheetJS (`xlsx`) for Excel/CSV export (CDN or vendored asset) and Tailwind inside the iframe, with no new `package.json` entries
- [x] 1.4 Confirm `assets/api-reference/catalog.json` is reused unchanged and remove any Scalar-specific files/markup
- [x] 1.5 Write `assets/api-reference/CATALOG.md`: explain the catalog shape (group > category > endpoint, multi-category allowed) and the two-step procedure to expose a new endpoint (back `PUBLIC_OPENAPI_PATHS` allowlist → front `catalog.json` category), plus the sync rule with the wiki map

## 2. Wire the Angular component

- [x] 2.1 Update `api-reference.component.ts` to build the iframe URL with `?api=${environment.apiUrl}` instead of `?spec=${apiUrl}api-docs-json`
- [x] 2.2 Verify the `/api-reference` route still resolves to `ApiReferenceComponent` and the iframe sandbox/styling is intact
- [x] 2.3 Remove any now-dead references to the Scalar spec URL in the component/template

## 3. Verify locally

- [x] 3.1 Build the front (`npm run build` / `ng build`) and confirm no compile errors
- [x] 3.2 Load `/api-reference` and visually verify: home view (group/category/endpoint counts), sidebar hierarchy from `catalog.json`, and on-brand styling (blue/leaf, no Scalar widgets)
- [x] 3.3 Against a populated API (prod via `?api=` if local DB is empty), verify an endpoint renders as a table with working filter, column sort, and pagination
- [x] 3.4 Verify Excel, CSV, and JSON exports download correctly and reflect the active filter
- [x] 3.5 Verify the JSON, Schema (incl. inferred-schema fallback), and Code (cURL/JS/Python + copy) tabs
- [x] 3.6 Verify graceful error state with Retry when an endpoint request fails
