# Tasks: glossary-portfolio-front

## 1. Panel — chips column + portfolio filter

- [x] 1.1 Add the `portfolios` column metadata — implemented as backend data migration `AddPortfoliosToGlossaryDocsMetadata` (JSON_SET on `hp_clarisa_endpoints.response_json`, Docker-tested up/idempotent/down) + static `endpoints-information.ts` updated as seed reference
- [x] 1.2 Add the `chips` case to the `[ngSwitch]` cell renderer in `content.component.html` (chip span per item using `item.name`) + chip styles in `content.component.scss` (consistent with the existing `.portfolio-chip` look)
- [x] 1.3 Add the portfolio dropdown filter to `ContentComponent`: options from `ManageApiService.getAllPortfolios()`, shown only when the loaded data has a `portfolios` field; client-side filter by `id` with an "all" reset option
- [x] 1.4 Extend `exportInformation()` so Excel/PDF flatten `portfolios` to comma-separated names, respecting the active filter

## 2. Landing — public glossary page

- [x] 2.1 Create `landing-page/pages/glossary/` (module + routing + component + `sections/` with banner and terms sections) following the `faq/` pattern, and register the lazy route `glossary` in `landing-page-routing.module.ts`
- [x] 2.2 Create a `providedIn: 'root'` glossary service (`GET api/glossary`, `GET api/portfolios`) following the existing service pattern
- [x] 2.3 Build the polished terms UI: card per term (term, definition, portfolio chips), text search, portfolio filter pills, loading + empty states, responsive SCSS aligned with the landing's visual identity
- [x] 2.4 Add the "Glossary" link to the landing **footer** (Yeck's decision 2026-07-14: footer, not the header nav)

## 3. Quality gate

- [x] 3.1 Jest specs: chips rendering/filter logic (panel) and landing component data mapping/filtering — colocated `*.spec.ts`
- [x] 3.2 `npm test` + `ng build` green in `clarisa-front`; do NOT touch `src/environments/environment.ts` (carries a temporary local note)
- [x] 3.3 Visual verification against the dev API (`clarisatest-back`): chips visible in the panel Glossary, filter working, public page rendering nicely
