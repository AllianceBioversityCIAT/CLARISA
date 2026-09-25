# api-reference-data-table

## ADDED Requirements

### Requirement: Human-readable column label above the exact field path
Every column header of the API Reference data table SHALL show a humanised label derived from the field path, AND directly underneath it, in monospace, the exact flattened field path returned by the endpoint. The path SHALL NOT be hidden behind a tooltip, a toggle, or any interaction.

#### Scenario: Nested field on GET api/countries
- **WHEN** a user opens `GET api/countries` and looks at the column for `regionDTO.parentRegion.name`
- **THEN** the header shows `Region · Parent region · Name` on the first line
- **AND** shows `regionDTO.parentRegion.name` in monospace on the second line

#### Scenario: Flat field
- **WHEN** the column is `code`
- **THEN** the header shows `Code` over `code`

#### Scenario: Acronym field
- **WHEN** the column is `isoAlpha2`
- **THEN** the header shows `ISO Alpha-2` over `isoAlpha2`

### Requirement: Labels are derived, with a bounded override list
The label SHALL be computed from the field path by a pure function (drop a trailing `DTO`/`Dto` per segment, split camelCase and digit boundaries, capitalise, join nested segments with ` · `), consulting a small override table only for acronyms. An endpoint or field with no override entry SHALL still render a derived label — never an empty header, never a raw key alone.

#### Scenario: Field never seen before
- **WHEN** an endpoint returns a field `someNewFieldDTO.innerValue` that no override covers
- **THEN** the header shows `Some new field · Inner value` over `someNewFieldDTO.innerValue`

### Requirement: Data operations keep using the raw field path
Sorting, the table search filter, and the CSV, XLSX and JSON exports SHALL keep operating on the raw flattened key. Downloaded files SHALL keep the technical field names as their headers.

#### Scenario: Sorting by a relabelled column
- **WHEN** a user clicks the header showing `Region · Name`
- **THEN** rows are sorted by the value of `regionDTO.name`

#### Scenario: Exported file headers
- **WHEN** a user exports the table to CSV or XLSX
- **THEN** the file's header row contains `regionDTO.name`, not `Region · Name`

### Requirement: Per-endpoint column hiding
The table SHALL support hiding named columns for a specific endpoint through one explicit route-keyed map. An endpoint absent from that map SHALL show every column its payload carries.

#### Scenario: Action Areas hides presentation-only fields
- **WHEN** a user opens the `Action Areas` or `Impact Areas` table
- **THEN** the `icon` and `color` columns are not rendered
- **AND** every other column of the payload is rendered

#### Scenario: Action Areas Outcomes hides internal ids
- **WHEN** a user opens the `Action Areas Outcomes` table
- **THEN** the internal id columns that are not the item's own numbering are not rendered

#### Scenario: Endpoint with no entry
- **WHEN** a user opens any endpoint absent from the hidden-columns map
- **THEN** all of its columns are rendered, exactly as today

### Requirement: No change to the API contract
This capability SHALL NOT rename, alias, or remove any field of any endpoint response. `locationDTO`, `regionDTO` and every other field name SHALL keep being returned exactly as they are today.

#### Scenario: Response is untouched
- **WHEN** any consumer calls `GET api/countries` after this change is deployed
- **THEN** the JSON payload is byte-for-byte the same shape as before, including `locationDTO` and `regionDTO`
