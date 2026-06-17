## 1. Doc tab scaffolding

- [x] 1.1 Add `'doc:Doc'` as the first entry in the endpoint tab list (`renderEndpointShell`) and dispatch it in `renderTab` (`renderDoc()`)
- [x] 1.2 Make `doc` the default tab when an endpoint opens (`selectEndpoint` → `state.tab = 'doc'`)
- [x] 1.3 Let Doc/Code render without waiting for the live-data fetch (loading guard in `renderEndpointShell`)
- [x] 1.4 Add the `.docpill` inline-code style used by the Doc tab

## 2. Doc tab content (spec-derived)

- [x] 2.1 Query parameters section: name, type, default, description from `op.parameters`, plus an example URL built from the endpoint's own params
- [x] 2.2 Responses section: status codes + descriptions from `op.responses` (with a sensible 200/401 fallback when absent)
- [x] 2.3 Response model section: resolve the 200 schema (`$ref` + `components.schemas`) and render it as a TypeScript-style interface; fall back to a shape inferred from live data when the spec has no model
- [x] 2.4 `tsType` helper: maps JSON-schema types to TS (`integer/number → number`, arrays → `Name[]`, enums → unions, `$ref` → schema name)

## 3. Versioning (per endpoint)

- [x] 3.1 `V2_ENDPOINTS` map with the 5 v2 endpoints (`cgiar-entities`, `cgiar-entity-typology`, `sdgs`, `sdg-targets`, `sdg-indicators`) and a note on what each v2 changes
- [x] 3.2 Versioning section: v1-default / v2-opt-in cards + `?version=1` / `?version=2` example for v2 endpoints; "v1 only, `?version=2` has no effect" for the rest
- [x] 3.3 Remove the earlier global versioning block from the Get Started view

## 4. Convention / rule

- [x] 4.1 Convention note placed in the wiki (`~/Desktop/clarisa/context/arquitectura.md`) — front `CLAUDE.md` is the official team file, left untouched
- [x] 4.2 Convention: when exposing a new endpoint, check the controller's `@Version(...)` and, if it has a v2, add it to `V2_ENDPOINTS`

## 5. Verify

- [x] 5.1 Run the front locally (asset folder on :8899) and open the Doc tab on a v2 endpoint (`cgiar-entities`) and a v1-only endpoint (`countries`); both render correctly, 0 console errors
- [x] 5.2 Sanity-check against the live back: `?version=2` on `cgiar-entities` returns the richer v2 shape (`entity_type`, `portfolio`, lineages…) vs the v1 legacy shape (`cgiarEntityTypeDTO`, `institutionId`)
- [x] 5.3 Confirm no backend files were modified (docs-only change)
