## Context

The `/api-reference` route in `clarisa-panel` currently mounts `ApiReferenceComponent`, which renders a single `<iframe>` pointing at `assets/api-reference/index.html`. That HTML loads Scalar from a CDN, fetches `api-docs-json` + `catalog.json`, curates the spec into a 2-level tag hierarchy, and hands it to Scalar. The iframe exists specifically to isolate the doc UI from the global CLARISA template CSS (Bootstrap/PrimeNG/CoreUI) which otherwise deforms third-party widgets.

The iframe boundary is the key existing constraint and we keep it: it already solves CSS isolation and lets the doc UI be a self-contained static asset with its own dependencies, without polluting the Angular bundle.

A validated functional prototype of the replacement already exists at `~/Desktop/clarisa/output/api-docs-proposal/index.html` and was tested live against `api.clarisa.cgiar.org` (594 CGIAR entities rendered, table/sort/filter/pagination/Excel all working).

## Goals / Non-Goals

**Goals:**
- Replace Scalar with a hand-built, on-brand documentation UI inside the same isolated iframe.
- One view that serves non-technical users (table + export) and developers (JSON/Schema/Code).
- Reuse the existing `catalog.json` and `api-docs-json` as the only data sources.
- Zero new entries in the Angular `package.json` (doc UI dependencies stay inside the iframe asset, like Scalar did).

**Non-Goals:**
- Touching the legacy `/documentation` page (separate capability, left untouched).
- Any back-end change (`api-docs-json` and public endpoints stay as-is).
- Server-side rendering or build-time generation of the docs — it stays a runtime, client-side static asset.
- Commit/push/deploy (out of scope per workflow rules).

## Decisions

**1. Keep the iframe + static asset architecture (vs. native Angular components).**
The iframe already isolates CSS and lets the doc UI ship its own libs (Tailwind, SheetJS) without entering the Angular bundle. Rebuilding the whole thing as native Angular components would mean fighting global CoreUI/PrimeNG styles and bloating the bundle for a self-contained, read-only view. Keep the boundary; only the asset's contents change.

**2. Pass the API base URL via `?api=` (vs. the current `?spec=`).**
The new app needs the API *base* (to fetch both `api-docs-json` and each live endpoint like `api/countries`), not just the spec URL. `ApiReferenceComponent` changes from building `?spec=${apiUrl}api-docs-json` to `?api=${apiUrl}`. The app defaults to the prototype's localhost fallback when the param is absent. Simpler and covers both fetch needs from one value.

**3. Tailwind via the same CDN pattern Scalar used (vs. PostCSS build).**
Scalar was CDN-loaded with no `package.json` footprint; mirror that for the prototype/first integration so the change stays self-contained and reviewable. The Tailwind production-CDN console warning is acceptable for an isolated iframe asset; a follow-up can vendor a compiled Tailwind build if the team prefers. Document this as a known trade-off, not a blocker.

**4. Excel/CSV export via SheetJS (`xlsx`) inside the iframe.**
The legacy page already uses `xlsx` + `file-saver` for the exact same "export control list to Excel" need, so this is a proven, expected capability. Inside the iframe we load SheetJS standalone (CDN/vendored) and use `XLSX.writeFile` + a Blob download, avoiding `file-saver`.

**5. Flatten nested DTOs into table columns at depth ≤ 2; arrays joined by a representative field.**
Live responses contain nested objects (e.g. `cgiarEntityTypeDTO.name`) and arrays. For the table, flatten objects up to 2 levels into `parent.child` columns and join arrays by `name`/`code`/`acronym`. The raw, unflattened response stays available in the JSON tab and the JSON export.

**6. Grouping stays in `catalog.json`, documented by a sibling `CATALOG.md` (vs. deriving groups from the spec or inventing a brand-new JSON).**
The curated group > category > endpoint hierarchy is what makes the docs readable (it mirrors the old custom Swagger's specific groupings), and it cannot be derived from `api-docs-json` because the spec has no notion of CLARISA's business categories. `catalog.json` already encodes exactly this and the prototype already consumes it — so reuse it as-is rather than inventing a new JSON. What's missing is *operational* documentation: the existing wiki `context/documentation-endpoints-map.md` only describes the current state, not how to change it. Add a `CATALOG.md` next to `catalog.json` (so it travels with the code and any repo dev finds it) that explains:
  - the JSON shape (`groups[].categories[].endpoints[]`) and that an endpoint may appear in several categories (multi-category is supported by the app, though the current catalog — 4 categories under One CGIAR Control List, 35 endpoints, mirroring the live public docs — has no duplicates);
  - the two-step procedure to expose a new endpoint: (1) add its path to the back allowlist `clarisa-back/src/shared/swagger/public-endpoints.ts` (`PUBLIC_OPENAPI_PATHS`) so it enters the zero-leak spec; (2) add it to the right category in `catalog.json` so it shows in the docs;
  - the rule that `catalog.json`, the back allowlist, and the wiki map (`context/documentation-endpoints-map.md`) stay in sync.

## Risks / Trade-offs

- [Tailwind production-CDN warning] → Accepted for the isolated iframe asset; follow-up to vendor a compiled build if the team wants it gone. No functional impact.
- [Local MySQL is near-empty / some endpoints 500] → Not a code defect; the app degrades gracefully (loading → error card with Retry, empty-state row). Demos and review use `?api=` against prod (CORS is `*`).
- [Endpoints not present in the zero-leak spec show "not in public spec" + schema inferred from live data] → Intended fallback; the table/JSON tabs still work fully. Surfaced as a non-error badge.
- [Heterogeneous/very wide responses produce many columns] → Columns derived from a 200-row sample; horizontal scroll + truncation with title tooltips keep it readable. Acceptable for a documentation/inspection view.

## Migration Plan

1. Replace the contents of `assets/api-reference/index.html` with the custom app (adapted from the prototype to read `?api=`).
2. Add the SheetJS asset reference the app needs.
3. Update `ApiReferenceComponent` to pass `?api=${environment.apiUrl}`.
4. Verify locally (build + visual check of home, a populated endpoint via `?api=` to prod, table sort/filter/pagination, all three exports, JSON/Schema/Code tabs).
5. Rollback: revert the asset + component change; the route and `catalog.json` are unchanged, so reverting restores the previous Scalar view cleanly.

## Open Questions

- Should a later follow-up vendor a compiled Tailwind build instead of the CDN? (Not blocking this change.)
- Should the legacy `/documentation` page eventually be retired in favor of this view? (Out of scope here; team decision.)
