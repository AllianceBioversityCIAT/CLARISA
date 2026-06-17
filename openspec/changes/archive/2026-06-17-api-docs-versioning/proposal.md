## Why

The CLARISA API is versioned in a non-obvious way: versioning is **CUSTOM via the `?version=N` query param** (not via URI like `/v1/`), it **defaults to v1** when the param is absent, and only **5 of 81 controllers expose a v2**. None of this is documented in the custom API documentation front, so a consumer hitting `/api/cgiar-entities` has no way to know a v2 exists or how to request it. Beyond versioning, each endpoint page lacked a single place to read its contract — the response DTO, the status codes, and how to use its query params. We also lack a convention that forces us to check and document versioning every time we expose a new endpoint, which is how the docs drift out of sync.

## What Changes

- Add a new **"Doc" tab** to every endpoint page in the custom API documentation front (`clarisa-front/src/assets/api-reference/index.html`). It is the **first tab and the default** when an endpoint opens, and it renders four sections:
  - **Versioning** (per endpoint): the CUSTOM `?version=N` mechanism, default v1, no URI/header versioning; whether *this* endpoint has a v2 and what its v2 changes, with copy-paste `?version=1` / `?version=2` examples.
  - **Query parameters**: name, type, default and description pulled from the OpenAPI spec, plus a realistic example URL built from the endpoint's own params.
  - **Responses**: the HTTP status codes the endpoint can return, from the spec.
  - **Response model**: the response DTO rendered as a readable TypeScript-style interface, resolved from the spec's `components.schemas`.
- Three of the four sections are generated automatically from the OpenAPI spec (`{API}/api-docs-json`). Versioning is **not** in the spec, so it lives in a hardcoded `V2_ENDPOINTS` map in `index.html` (the 5 v2 endpoints + a note on what each v2 changes).
- The Doc tab renders immediately without waiting for the live-data fetch (it is spec-derived), so reading docs on large lists (Institutions, Countries) is not blocked behind the loading spinner.
- Add a **team convention/rule**: whenever we expose a new endpoint in the custom doc, verify its versioning by checking `@Version(...)` in the back controller and, if it has a v2, add it to `V2_ENDPOINTS`. This keeps the doc in sync with the API.

No backend behavior changes — this is documentation-only (front asset + project rule).

## Capabilities

### New Capabilities
- `api-docs-versioning`: A per-endpoint "Doc" tab in the custom API documentation front that surfaces each endpoint's versioning, query params, status codes and response DTO, plus the convention for keeping versioning docs in sync when exposing new endpoints.

### Modified Capabilities
<!-- None. The existing `api-documentation` capability lives only as a change delta (not yet archived); this change adds a focused, independent capability rather than modifying it. -->

## Impact

- **Front (docs-only):** `clarisa-front/src/assets/api-reference/index.html` — new "Doc" tab (`renderDoc()` + helpers + `V2_ENDPOINTS` map), added to the tab list and made the default tab; the loading guard lets Doc/Code render without the live-data fetch. The earlier global versioning block in "Get Started" was removed in favor of the per-endpoint tab.
- **Back:** none (read-only references to `src/main.ts`, `src/shared/interfaces/version-extractor.ts`, `src/routes.ts`, `src/api/api.routes.ts`, controllers).
- **Process:** a new convention for documenting versioning when exposing endpoints.
- **No breaking changes**, no API surface changes.
