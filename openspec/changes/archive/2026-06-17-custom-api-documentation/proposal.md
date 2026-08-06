## Why

The current API documentation view in `clarisa-front` ships in two forms: the legacy hand-built page (`/documentation`) and a Scalar-based proposal (`/api-reference`). Scalar was rejected: it renders generic, hard-to-restyle UI, injects widgets that don't apply to CLARISA (Ask AI, Test Request, MCP layer), is pinned to a third-party CDN bundle, and breaks the CLARISA visual identity. The control-list audience is mixed — analysts who just want to see a list and export it to Excel, and developers integrating CLARISA — and neither the legacy page nor Scalar serves both well in one clean, on-brand interface.

## What Changes

- **Remove the Scalar-based API reference**: delete the `@scalar/api-reference` CDN bundle usage and the curation script in `clarisa-front/src/assets/api-reference/index.html`. **BREAKING** for the `/api-reference` route's current rendering (the route stays, its content is fully replaced).
- **Add a new custom API documentation UI** built by hand with Tailwind, on-brand (CLARISA blue `#0065bd`, leaf green `#7ab800`), served inside the existing isolated iframe so the global template CSS does not interfere.
- **Dual audience in one view**:
  - **Table tab** (primary, for non-technical users): each control list rendered as a live table with instant filter, column sort, pagination and one-click export to **Excel / CSV / JSON**.
  - **JSON / Schema / Code tabs** (for developers): raw live response, field+type schema from the OpenAPI spec, and copyable cURL / JavaScript / Python snippets.
- **Data sources unchanged**: keeps consuming the existing `catalog.json` (group > category > endpoint hierarchy) and the back's `api-docs-json` (zero-leak Swagger) for descriptions and schema. The `api-docs-json` is the only schema source so no business logic / internal model is exposed.
- **Document the grouping mechanism**: add a maintenance guide (`CATALOG.md`) next to `catalog.json` that explains how the grouping/filtering works and the exact two-step procedure to expose a new endpoint in the docs (back allowlist `PUBLIC_OPENAPI_PATHS` + front `catalog.json` category), so a future maintainer knows where a new endpoint goes and under which category.
- The validated functional prototype already exists at `~/Desktop/clarisa/output/api-docs-proposal/index.html` (wiki, outside the repo).

## Capabilities

### New Capabilities
- `api-documentation`: Public, in-panel documentation of CLARISA's control-list endpoints that serves both non-technical users (live table + Excel/CSV/JSON export) and developers (JSON, schema, code snippets), driven by the curated `catalog.json` hierarchy and the `api-docs-json` OpenAPI spec, isolated in an iframe and styled on-brand.

### Modified Capabilities
<!-- None — openspec/specs/ has no existing specs; this is the first capability documented. -->

## Impact

- **Front (`clarisa-front`)**:
  - `src/assets/api-reference/index.html` — replaced (Scalar → custom Tailwind app).
  - `src/assets/api-reference/catalog.json` — reused as-is (the grouping/filtering source).
  - `src/assets/api-reference/CATALOG.md` — **new**: maintenance guide for the grouping (how to expose a new endpoint and pick its category; sync with the back allowlist).
  - `src/app/clarisa-panel/api-reference/api-reference.component.ts` — adjust how the iframe receives the API base URL (today passes `?spec=`; the new app reads `?api=`).
  - `src/app/clarisa-panel/clarisa-panel-routing.module.ts` — `/api-reference` route kept.
  - Excel/CSV export relies on a SheetJS (`xlsx`) build inside the iframe (CDN or vendored asset), consistent with the legacy page's existing `xlsx` usage.
- **Removed dependency**: `@scalar/api-reference` CDN script (no `package.json` entry existed; it was CDN-loaded).
- **No back changes**: `api-docs-json` and the public endpoints are untouched.
- **Out of scope**: the legacy `/documentation` page (left as-is for now), commit/push/deploy.
