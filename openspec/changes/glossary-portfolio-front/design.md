# Design: glossary-portfolio-front

## Context

Exploration findings (2026-07-14):
- The panel Glossary table is **metadata-driven**: columns come from `response_json` in `documentation/metadata/endpoints-information.ts` (Glossary entry: `route: 'api/glossary'`, columns `term`/`definition`), parsed by `content.component.ts` `columnsTable()` and rendered by a generic `<p-table>` whose cell renderer is an `[ngSwitch]` on `object_type` supporting only `field` (innerHTML), `object` and `list`. **No chips or per-column templates today.**
- `ManageApiService.getAllPortfolios()` already calls `GET api/portfolios?show=all`; interface `GetPortfoliosInterface` exists. A homemade chip style (`.portfolio-chip`) exists in `dynamic-table-filters`; PrimeNG `TagModule` is used in `microservices-admin`.
- Landing pages are lazy child modules under `landing-page/pages/*`; simplest pattern to clone is `faq/` (`faq-routing.module.ts` + `faq.module.ts` + `sections/`). Landing has no auth guard; the interceptor omits the Authorization header when no token — public calls to `api/glossary` work.
- ⚠️ `src/environments/environment.ts` currently carries a `[LOCAL-DEV TEMPORAL]` comment — do NOT commit changes to that file.

## Goals / Non-Goals

**Goals:**
- Portfolios visible as chips in the panel Glossary table; filter by portfolio id client-side.
- A public, polished glossary page on the landing (search + portfolio filter + chips).

**Non-Goals:**
- No backend changes (no query params; filtering is front-side).
- No redesign of the generic documentation table beyond the new cell type.
- No CRUD/management UI for term–portfolio associations.

## Decisions

1. **New `object_type: 'chips'` in the metadata-driven table** (panel). A new `ngSwitchCase 'chips'` in `content.component.html` renders `rowData[key]` items as chip spans using `item.name` (styled in `content.component.scss`, visually consistent with the existing `.portfolio-chip`). Rationale: extends the existing generic mechanism (same pattern as the `list` case) instead of forking the table; other endpoints can reuse `chips` later.
   ⚠️ **Correction found during apply:** at runtime the column metadata does NOT come from the static `metadata/endpoints-information.ts` file — it comes from the backend DB (`GET api/hp-clarisa-category-endpoints` → `hp_clarisa_endpoints.response_json`). Therefore the `portfolios` column is added via a **backend data migration** (`AddPortfoliosToGlossaryDocsMetadata`) using `JSON_SET`/`JSON_REMOVE` (additive, idempotent, Docker-tested). The static file was updated too, for consistency as seed reference.
2. **Portfolio filter in `ContentComponent`, endpoint-scoped.** A PrimeNG dropdown (options from `getAllPortfolios()`, label `name`, value `id`) shown only when the loaded endpoint's data contains a `portfolios` field (generic detection, no hardcoding to Glossary). Filtering is client-side: `rows.filter(r => r.portfolios?.some(p => p.id === selectedId))`; "All portfolios" resets. The global text search keeps working on the filtered set.
3. **Export includes portfolios.** `exportInformation()` flattens `portfolios` to a comma-separated string of names for Excel/PDF.
4. **Landing page `/glossary` cloned from the `faq/` pattern.** New lazy module `landing-page/pages/glossary/` (routing + module + component + `sections/`): banner section + terms section rendered as **cards** (term, definition, portfolio chips) with a search box and portfolio filter pills. Data via a small `providedIn: 'root'` service (`GET api/glossary` + `GET api/portfolios`, pattern copied from `EndpointsInformationService`). SCSS follows the landing look (CGIAR palette, CoreUI/PrimeNG utilities already global). Add the nav/footer link if the landing header allows it without layout surgery; otherwise route-only.
5. **Branch:** same `glossary-portfolio-relation`; integration to `dev-v2` through the usual flow.

## Risks / Trade-offs

- [Metadata `response_json` is a JSON string — malformed edits break the whole documentation section] → change is additive (one column object), validated by running the panel locally.
- [Terms without portfolios (`portfolios: []`)] → chips cell renders empty; the portfolio filter must not exclude them when "All" is selected.
- [Landing page depends on the public reachability of `api/glossary`] → verified live in dev (HTTP 200 without token).
- [Front tests] → Jest specs for the new pipe/filter logic and the landing component (data mapping), following colocated `*.spec.ts` convention.

## Open Questions

- ~~Landing nav placement~~ → Resolved (Yeck, 2026-07-14): the "Glossary" link goes in the landing **footer**.
