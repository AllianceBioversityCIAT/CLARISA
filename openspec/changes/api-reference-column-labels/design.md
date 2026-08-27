# Design: api-reference-column-labels

## Branch

Per the repo's global branch rule (`CLARISA/CLAUDE.md:28`, Yeck 2026-07-14): **a feature branch created from `staging`** — `api-reference-column-labels`. Never developed on `dev-v2`, so that promoting this work to `staging` cannot drag along the other `dev-v2` work that is not meant to ship yet. Integration stays one-way: feature → `staging` → `dev-v2`.

Verified 2026-08-27: `origin/staging` already carries this page, byte-identical to `origin/dev-v2` (`git diff origin/staging origin/dev-v2 -- clarisa-front/src/assets/api-reference/` is empty), with the same line numbers cited below. `origin/dev` is irrelevant here — it does not contain the page at all and its last commit is 2025-10-30.

## Current behaviour (verified 2026-08-27 on `origin/staging`)

| Piece | Location | What it does |
|---|---|---|
| `flatten()` | `index.html:583` | Flattens nested objects up to depth 2 into `a.b.c` keys; arrays collapse to `name/code/acronym` joined by comma |
| `deriveColumns()` | `index.html:594` | Column list = union of the keys of the first 200 flattened rows, in first-seen order |
| `renderTable()` → `ths` | `index.html:709-714` | `<th>` prints `esc(c)` — the raw key — under a Tailwind `uppercase` class, hence `LOCATIONDTO.LATITUDE` |
| `sortBy(col)` | `index.html:788` | Sorts by the raw key |
| table search | `index.html:776` | Matches against every column value, keyed by raw key |
| `exportExcel()` / `exportCSV()` | `index.html:1245,1251` | `XLSX.utils.json_to_sheet(state.filtered)` — sheet headers are the raw keys |

The uppercase is cosmetic (a CSS class); the ugliness is the key itself.

## Decision 1 — Add a label, never replace the key

The page's contract with a developer is "what you see is what the endpoint returns". A pretty header alone would silently break that: someone reads `Latitude`, writes `row.latitude`, and gets `undefined`, because the field is `locationDTO.latitude`.

So the header carries both, stacked:

```
+-----------------------------+   +-----------------------------+
| REGION · PARENT REGION · NAME|  | LATITUDE                    |
| regionDTO.parentRegion.name  |  | locationDTO.latitude        |
+-----------------------------+   +-----------------------------+
```

Top line: existing style (bold, uppercase, tracking-wider, white).
Second line: `font-mono`, one step smaller, `normal-case`, lower opacity — visibly secondary, still readable and still copyable.

**Alternative rejected:** label on the header, raw key only in a tooltip. A tooltip is invisible on touch, unreachable for a screen reader in this markup, and impossible to copy — for the one audience that needs the key most.

## Decision 2 — Derive the label, do not curate a dictionary per endpoint

`humanizeColumn(key)`, a pure function:

1. Split the path on `.`.
2. Per segment: drop a trailing `DTO` / `Dto`; if the segment is now empty, keep the original.
3. Look the segment up in `LABEL_OVERRIDES` (below). On a hit, use it as-is.
4. Otherwise split camelCase and digit boundaries (`parentRegion` → `parent region`, `um49Code` → `um 49 code`), lowercase everything, capitalise the first character.
5. Join the segments with ` · `.

```js
const LABEL_OVERRIDES = {
  id: 'ID', code: 'Code', name: 'Name', acronym: 'Acronym',
  isoAlpha2: 'ISO Alpha-2', isoAlpha3: 'ISO Alpha-3',
  um49Code: 'UN M49 code', umCode: 'UN M49 code',
  smoCode: 'SMO code', financialCode: 'Financial code',
  websiteLink: 'Website', latitude: 'Latitude', longitude: 'Longitude'
};
```

Why derived: 60+ endpoints, each with its own shape, and new ones arriving. A curated map would be wrong the day a field is added, and nobody would notice — a derived label is at worst clumsy, never stale.

Why an override list anyway: acronyms are exactly what camelCase splitting mangles (`isoAlpha2` → "Iso alpha 2"). It is a short list, on purpose, and a miss degrades to the derived label — never to an error.

## Decision 3 — Exports and data operations stay on the raw key

`sortBy`, the search filter, `exportExcel`, `exportCSV` and `exportJSON` keep using `state.columns` as they do now. A CSV whose headers changed from `regionDTO.name` to `Region · Name` breaks whatever script already reads it, and pushes a `·` into a file that must stay machine-friendly.

⚠️ Consequence to state out loud: a downloaded Excel keeps the technical headers. That is deliberate — an export is data, the table is reading. If business asks for pretty headers in Excel, it is a separate decision with a separate cost (and probably a second "friendly" export button), not a side effect of this change.

## Decision 4 — Where the code lives

Two pure helpers next to `deriveColumns()` (`humanizeColumn`, plus `LABEL_OVERRIDES`), and a modified `ths` template inside `renderTable()`. No new file, no build step: the page is a standalone asset served as-is.

## Risks

| Risk | Mitigation |
|---|---|
| A two-line header makes the table taller and pushes rows below the fold | Second line is `text-[10px] leading-none`; measured against `GET api/countries` (widest table) before merging |
| A derived label collides with another one (two different paths, same words) | Impossible in practice — the paths differ, and the key is printed right underneath |
| Someone later "simplifies" this by deleting the mono line | The spec scenario below pins the raw key as a requirement, not a decoration |
