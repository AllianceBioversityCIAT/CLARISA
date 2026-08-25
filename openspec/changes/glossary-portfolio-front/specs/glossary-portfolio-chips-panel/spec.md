# glossary-portfolio-chips-panel

## ADDED Requirements

### Requirement: Portfolios chips column in the panel Glossary table
The admin-panel Glossary table (`/clarisa-panel/documentation/.../Glossary`) SHALL display a "Portfolios" column rendering each term's portfolios as chips labeled with the portfolio `name`. Terms with no portfolios SHALL render an empty cell (not break the row).

#### Scenario: Term with one portfolio
- **WHEN** the Glossary table loads a term whose `portfolios` is `[{ id: 2, name: "CGIAR portfolio 2022-2024", acronym: "P22" }]`
- **THEN** the Portfolios cell shows one chip labeled "CGIAR portfolio 2022-2024"

#### Scenario: Term with multiple portfolios
- **WHEN** a term has two portfolios
- **THEN** the cell shows two chips, one per portfolio name

### Requirement: Client-side multi-select portfolio filter (chips)
The Glossary table SHALL offer a portfolio filter rendered as clickable chips (one per portfolio from `GET api/portfolios`), supporting MULTIPLE simultaneous selections: a row matches when any of its `portfolios[].id` is among the selected ids (OR semantics). No backend query parameter is used. With no chip selected, the full list SHALL be visible, including terms with no portfolios.

#### Scenario: Filtering by one portfolio
- **WHEN** the user activates the "CGIAR portfolio 2025-2030" chip (id 3)
- **THEN** only terms associated with portfolio id 3 remain visible, and the global text search applies over that subset

#### Scenario: Combining portfolios
- **WHEN** the user activates the 2022-2024 and 2025-2030 chips together
- **THEN** terms associated with either portfolio are visible

#### Scenario: Clearing the filter
- **WHEN** the user deactivates every chip
- **THEN** every term is visible again, including terms with an empty `portfolios` array

### Requirement: Column metadata fallback
When the endpoint data carries a `portfolios` field but the DB-driven column metadata (`hp_clarisa_endpoints.response_json`) does not include the Portfolios column yet, the front SHALL inject the chips column client-side so the column always renders; when the metadata already includes it (after the `AddPortfoliosToGlossaryDocsMetadata` migration is deployed), the injection SHALL be a no-op.

#### Scenario: Metadata not yet migrated
- **WHEN** the Glossary data has `portfolios` but the metadata lacks the column
- **THEN** the Portfolios chips column renders anyway

### Requirement: Export includes portfolios
The Excel/PDF export of the Glossary table SHALL include a Portfolios column with the portfolio names of each exported term (comma-separated), respecting the active portfolio filter.

#### Scenario: Exporting filtered terms
- **WHEN** the user exports while a portfolio filter is active
- **THEN** the file contains only the filtered terms, each with its portfolio names
