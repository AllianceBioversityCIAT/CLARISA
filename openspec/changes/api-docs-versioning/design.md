## Context

The CLARISA custom API documentation front (`clarisa-front/src/assets/api-reference/index.html`) is a single-file SPA that renders a curated catalog (`catalog.json`), the OpenAPI spec (`{API}/api-docs-json`), and live data per endpoint. Each endpoint page already had tabs (`Table / JSON / Schema / Code`) built in `renderEndpointShell` + `renderTab`. The OpenAPI spec exposes, per endpoint, the query params (`op.parameters`), the responses/status codes (`op.responses`), and the response DTO (`op.responses['200'].content['application/json'].schema` → resolved against `components.schemas`) — but it does NOT carry version information.

Backend versioning (audited against `clarisa-back`):

- **Mechanism:** `app.enableVersioning({ type: VersioningType.CUSTOM, extractor: versionExtractor })` in `src/main.ts:17-20`.
- **Extractor:** `src/shared/interfaces/version-extractor.ts` reads `request.query.version`, returns `String(version)` or `'1'` by default. No version header exists.
- **URI:** global `/api` prefix via `RouterModule` (`src/routes.ts`), per-module base route (`src/api/api.routes.ts`). Final shape: `GET /api/{route}[?version=N]`.
- **v2 coverage:** only 5 of 81 controllers expose v2 — `cgiar-entities`, `cgiar-entity-typology`, `sdgs`, `sdg-targets`, `sdg-indicators`. The other 76 run on the default v1 (no `@Version`).
- **Common query params:** `show` (`all|active|inactive`) is near-universal; endpoint-specific ones include `type`, `portfolioId`, `year`, `status`, `source`, `mis`, `offset/limit`.

This is a documentation-only change — no backend code is touched.

## Goals / Non-Goals

**Goals:**
- Give every endpoint a single place (a "Doc" tab) to read its contract: versioning, query params, status codes, response DTO.
- Make the versioning scheme (query param, default v1, no URI versioning) discoverable per endpoint, stating whether *that* endpoint has a v2 and what its v2 changes.
- Generate the spec-derived sections (params, responses, DTO) automatically so they stay correct with zero manual upkeep.
- Establish a convention so future endpoint exposure always checks and records versioning.

**Non-Goals:**
- Changing backend versioning behavior or adding URI versioning.
- Auto-generating versioning info from the OpenAPI spec (the custom extractor isn't reflected there; the v2 list is maintained by hand).
- A global versioning page — the explainer is per endpoint; the earlier Get Started block was removed.

## Decisions

**1. Put the contract in a per-endpoint "Doc" tab, not a global page.**
Each endpoint's versioning, params, status codes and DTO are endpoint-specific, so they belong on the endpoint page. The Doc tab is added to the existing tab list (`renderEndpointShell`) and dispatched in `renderTab`, made the first tab and the default (`state.tab = 'doc'`). The earlier global versioning block in Get Started was removed — it duplicated information that is clearer in context. Alternative considered: keep both. Rejected to avoid two sources of truth.

**2. Generate params/responses/DTO from the OpenAPI spec; keep versioning in a hand-maintained map.**
The spec already carries params, responses and schemas, so those three sections render automatically and stay correct. The CUSTOM extractor versioning is invisible to the spec, so the v2 set lives in a `V2_ENDPOINTS` map in the asset (each entry noting what its v2 changes). Trade-off: the map is kept in sync by hand — which the convention (decision 4) addresses.

**3. Render the Doc tab without waiting for the live-data fetch.**
Doc is spec-derived, so `renderEndpointShell` short-circuits the loading spinner for the `doc` (and `code`) tabs. This keeps docs readable instantly even on large lists (Institutions, Countries) where the live fetch takes seconds.

**4. Present the v2 endpoints as an explicit short map, and encode the convention.**
Only 5 controllers have v2, so an explicit map is clearer and lower-maintenance than dynamic detection. The "check `@Version` when exposing an endpoint, add to `V2_ENDPOINTS` if it has a v2" rule lives as a requirement in this change's spec (traceable) and as a note in the wiki (`arquitectura.md`) so it's visible day-to-day. This is the durable mechanism against doc drift.

## Risks / Trade-offs

- **Manual sync drift on the v2 map** → the convention (decision 4) plus keeping the map short and explicit mitigates it; if a 6th v2 appears, the rule catches it.
- **DTO rendering on nested/`$ref` schemas** → `tsType` resolves `$ref` to the schema name and arrays to `Name[]`; deeply nested objects show the referenced type name rather than expanding inline, which keeps the interface readable.
- **`clarisa-front/CLAUDE.md` is the official team file** → not edited; the convention note lives in the wiki (`~/Desktop/clarisa/context/arquitectura.md`) instead.
