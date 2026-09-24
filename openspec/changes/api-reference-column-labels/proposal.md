# Proposal: api-reference-column-labels

## Why

In the API Reference data table, column headers read `LOCATIONDTO.LATITUDE`, `REGIONDTO.NAME`, `REGIONDTO.PARENTREGION.NAME` (reported by Santiago Sánchez, 2026-08-27, on `GET api/countries`). They are unreadable for anyone who is not already fluent in the payload.

They are not hand-written labels. `renderTable()` prints `state.columns` verbatim, and `deriveColumns()` (`clarisa-front/src/assets/api-reference/index.html:594`) derives those columns from the keys of `flatten()`ed rows — so the header **is** the JSON field name the API actually returns. Those names come from the backend contract: `clarisa-back/src/api/country/dto/country.dto.ts:34,41` declares `regionDTO: SimpleRegionDto` and `locationDTO: GeopositionDto`.

Two things must both stay true, and today only the second one does:

1. A human scanning the table should read plain words.
2. A developer must still see, exactly, the key they will have to write in their own code — this page's only reason to exist is to mirror the response.

## Decision (Santiago Sánchez, DM 2026-08-27 07:39–07:41)

Option B confirmed, in his words: *"la idea no es tocar el API"*, *"La idea no es tocar el backend"*. He also asked, in the same thread, for two column-visibility fixes and listed the 19 tables he reviewed (see § Column visibility).

## What Changes

**Header becomes two lines instead of one:** a humanised label on top (`Latitude`, `Region · Name`, `Region · Parent region · Name`) and, underneath, the exact field path in small monospace (`locationDTO.latitude`, `regionDTO.name`). Nothing is replaced — the technical name stays on screen.

The label is **derived, not curated**: strip the `DTO` suffix from path segments, split camelCase, capitalise, join nested levels with `·`, plus a small override dictionary for the acronyms that humanising would mangle (`isoAlpha2` → `ISO Alpha-2`, `um49Code` → `UN M49 code`, `id` → `ID`, `smoCode` → `SMO code`). No per-endpoint configuration, so every present and future endpoint is covered on day one.

Sorting, filtering, search and the JSON/CSV/XLSX exports keep operating on the raw key — they are the contract, and a downstream script reading those files must not break.

**Column visibility (added 2026-08-27 at Santiago's request).** Two hides, both cosmetic and both front-only:

- `Action Areas` and `Impact Areas`: hide the `icon` and `color` columns — they carry no meaning for a reader of the catalogue.
- `Action Areas Outcomes`: hide the internal `id` columns that are not the item's own numbering ("los IDs que no hacen parte de la numeración de los items no sirve para el usuario final").

Unlike the labels, this one **is** per-endpoint knowledge, so it lives in a single explicit `HIDDEN_COLUMNS` map keyed by route. A route with no entry hides nothing — the default stays "show everything the payload carries".

Tables he reviewed: CGIAR entities · Countries · UN Region · CGIAR entities groups · Projects · Institutions list · Institutions Related list · Institution Types · Action Areas · Impact Areas · Impact Areas Indicators · Sustainable Development Goals · SDG Targets · SDG Indicators · Initiatives · End of Initiative Outcomes · Action Areas Outcomes · Action Areas Outcome Indicators · Workpackages. He noted he did not review every table, so the derived label must work everywhere — not only on this list.

### Explicitly NOT in this change

🛑 **Renaming the fields in the API** (`locationDTO` → `location`, `regionDTO` → `region`). Two independent reasons:

1. It is already forbidden by the repo's **golden API/schema rule** (`CLARISA/CLAUDE.md:27`, Yeck 2026-07-14): attribute names are not renamed with respect to prod, because external systems (PRMS, MEL, MARLO) integrate against those exact names. Exceptions need Yeck's explicit OK plus coordination with the consumers.
2. It is verifiably breaking: `onecgiar-pr-server/src/clarisa/dtos/clarisa-country.dto.ts:8-9` types `regionDTO` and `locationDTO` by those names today.

If it is ever wanted, it needs endpoint versioning and a consumer migration, not a front-end tweak.

## Capabilities

### New Capabilities
- `api-reference-data-table`: the API Reference table presents every column with a human-readable label above the exact API field path, while all data operations keep using the raw key.

### Modified Capabilities

_None — no existing spec covers the data table (only `api-reference-navigation`, `api-documentation`, `api-docs-get-started`, `api-docs-versioning`)._

## Impact

- **`clarisa-front` only**, and inside it a single file: `src/assets/api-reference/index.html` (`renderTable()` header block, ~line 709, plus two new pure helpers).
- **No backend change. No DTO change. No database change.** Nothing any API consumer can observe.
- Branch: `api-reference-column-labels`, **created from `staging`** per `CLARISA/CLAUDE.md:28`. Not developed on `dev-v2` — that would drag unrelated, not-yet-shippable `dev-v2` work into `staging` when this is promoted.
- Not a blocker for anything currently in flight; ships independently.
