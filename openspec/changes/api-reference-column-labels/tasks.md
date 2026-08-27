# Tasks: api-reference-column-labels

## 1. Label derivation

- [x] 1.1 Add `LABEL_OVERRIDES` and the pure `humanizeColumn(key)` helper next to `deriveColumns()` in `clarisa-front/src/assets/api-reference/index.html` (drop trailing `DTO`/`Dto` per segment, split camelCase + digit boundaries, capitalise, join with ` · `)
- [x] 1.2 Sanity-run `humanizeColumn` against the real column sets of `GET api/countries`, `GET api/institutions`, `GET api/glossary` and one deeply nested endpoint; fix only the acronyms it mangles, by adding overrides — never by special-casing an endpoint

## 2. Header rendering

- [x] 2.1 Rewrite the `ths` block in `renderTable()` (~line 709) to emit two stacked lines: label (existing uppercase style) over the raw key in `font-mono text-[10px] normal-case leading-none` at reduced opacity
- [x] 2.2 Keep `onclick="sortBy('<raw key>')"` and the sort caret bound to the raw key; verify the whole header cell stays one click target
- [x] 2.3 Check header height against the widest table (`GET api/countries`, all columns) at 1280px and at 1440px — the first data rows must still be visible without scrolling

## 3. Column visibility (Santiago, 2026-08-27)

- [x] 3.1 Add a route-keyed `HIDDEN_COLUMNS` map and apply it inside `deriveColumns()`; absent route = nothing hidden
- [x] 3.2 Hide `icon` and `color` on `Action Areas` and `Impact Areas`
- [x] 3.3 On `Action Areas Outcomes`, identified against the live payload: hidden `id`, `actionAreaId`, `outcomeId`, `outcomeIndicatorId`; kept `outcomeSMOcode` / `outcomeIndicatorSMOcode`, which are the item's own numbering. ⚠️ Told Santiago exactly what is hidden so he can object if he expected `id` to stay
- [x] 3.4 Verify the hidden columns also disappear from the CSV/XLSX export, and that no other table lost a column

## 4. Non-regression of the contract

- [x] 4.1 Verify sorting, the search box, and the CSV / XLSX / JSON exports still key off the raw field path (exported header row must read `regionDTO.name`)
- [x] 4.2 Confirm zero backend diff: no touch to `clarisa-back`, no DTO, no migration

## 5. Verification

- [x] 5.1 Browser check on the dev front against `clarisatest-back`: `GET api/countries` filtered by `indo` renders `Region · Name` over `regionDTO.name` — capture a before/after screenshot for the ticket
- [x] 5.2 Shared with Santiago on the DM (2026-08-27 09:40) with the deployed result and direct links. He validated at 11:05: "ya quedó". He asked to review separately, later, which data each table should show
