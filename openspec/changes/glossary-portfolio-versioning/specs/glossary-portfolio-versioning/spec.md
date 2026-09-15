## ADDED Requirements

### Requirement: A term is unique per portfolio, not globally

The system SHALL reject a glossary write when another **active** term with the same normalized title
(whitespace-collapsed, case-insensitive) already holds any of the portfolios being requested. The
system SHALL accept the write otherwise, including when the title already exists on a term covering
different portfolios.

#### Scenario: A version is created for a portfolio the term does not cover

- **WHEN** an admin creates the term `Impact` for portfolio `P22` and an active `Impact` exists
  covering only `P25`
- **THEN** the term is created and both rows coexist, each with its own definition

#### Scenario: Two versions cannot claim the same portfolio

- **WHEN** an admin creates the term `Impact` for portfolios `P22` and `P25` and an active `Impact`
  already covers `P25`
- **THEN** the request is rejected with `409 Conflict` naming the term and the portfolio in conflict
- **AND** nothing is written

#### Scenario: A deactivated term no longer reserves its title

- **WHEN** an admin creates the term `Impact` for portfolio `P25` and the only other `Impact` is
  inactive
- **THEN** the term is created

#### Scenario: A term with no portfolio is accepted

- **WHEN** an admin creates a term without portfolios
- **THEN** the term is created and reported by the diagnostics endpoint as having no active
  portfolio

### Requirement: Editing a term applies to all its portfolios unless it is split

`PATCH api/glossary/admin/terms/:id` SHALL keep applying the edit to the row as a whole — that is,
to every portfolio the row is tagged with — and SHALL NOT create rows.

#### Scenario: Editing a shared term

- **WHEN** an admin edits the definition of a term covering `P22` and `P25` through `PATCH`
- **THEN** the single row is updated and both portfolios show the new definition

### Requirement: A shared term can be split into one version per portfolio

The system SHALL expose `POST api/glossary/admin/terms/:id/versions`, which in a single transaction
deactivates the listed portfolio links on the source term and creates a new term with the same
title, the submitted definition and provenance, and those portfolios. The response SHALL return both
terms.

#### Scenario: Splitting the 2025-2030 definition off a shared term

- **WHEN** an admin splits portfolio `P25` off the term `Impact` (covering `P22` and `P25`) with a
  new definition
- **THEN** the original term keeps `P22` and its previous definition
- **AND** a new term `Impact` exists with `P25` and the new definition
- **AND** `GET api/glossary` returns `Impact` twice, one entry per portfolio

#### Scenario: The split must be a strict subset of the term's portfolios

- **WHEN** the requested portfolios include one the source term does not actively hold, or include
  every portfolio it holds
- **THEN** the request is rejected with `400 Bad Request` explaining which case applies
- **AND** nothing is written

#### Scenario: The split is auditable

- **WHEN** a split succeeds
- **THEN** both rows record the acting user in their audit fields and the new row states in its
  modification justification that it was split from the source term id

### Requirement: Bulk import matches rows by title and portfolio

The bulk import plan SHALL resolve an incoming row against the existing term that shares its
normalized title **and** at least one of its portfolios. When several same-titled terms exist and
none matches the incoming portfolios, the row SHALL be planned as a creation.

#### Scenario: A file updates the 2022-2024 version only

- **WHEN** a bulk file carries `Impact` mapped to portfolio `P22` and two versions of `Impact` exist,
  one on `P22` and one on `P25`
- **THEN** the plan marks the `P22` version as an update and leaves the `P25` version untouched

#### Scenario: A file with no portfolio column cannot pick a version

- **WHEN** a bulk file carries a term that exists in more than one version and the file maps no
  portfolio column and no batch portfolio is chosen
- **THEN** the row is reported as invalid, naming the versions it could refer to
- **AND** the import is refused before writing anything

### Requirement: The public glossary publishes one entry per version

`GET api/glossary` SHALL return one entry per term row, so a versioned term appears more than once,
each entry carrying the portfolios of that version. The response SHALL NOT be deduplicated and its
keys SHALL NOT change.

#### Scenario: A versioned term in the public payload

- **WHEN** a consumer reads `GET api/glossary` and `Impact` has a version per portfolio
- **THEN** two entries with `term: "Impact"` are returned, distinguishable by `portfolios[]`
- **AND** every other term returns exactly one entry with the same keys as before

#### Scenario: The public glossary page shows the definition of the selected portfolio

- **WHEN** a reader filters the public glossary page by a portfolio
- **THEN** exactly one card is shown for a versioned term: the version tagged with that portfolio

#### Scenario: The versions of a concept are not shown as unrelated cards

- **WHEN** a reader opens the public glossary with no portfolio filter and a concept has two versions
- **THEN** the concept is shown once, with each definition labelled by the portfolio it belongs to
- **AND** two rows that were never related keep being shown as the separate terms they are

### Requirement: An unlinked term can be linked, and two versions can be merged, from the panel

The panel SHALL allow assigning portfolios to a term that has none, and SHALL allow merging two rows
that share a title by moving the portfolios of one onto the other and deactivating the emptied row.
Neither operation SHALL delete a row.

#### Scenario: Linking a term written outside the panel

- **WHEN** an administrator assigns a portfolio to a term that had none
- **THEN** the term shows under that portfolio's filter on the public page
- **AND** it stops being reported as unlinked

#### Scenario: Merging two versions that turned out to say the same

- **WHEN** an administrator merges two same-titled terms
- **THEN** the surviving row holds the portfolios of both
- **AND** the emptied row is deactivated, not deleted, and can be reactivated

#### Scenario: A merge cannot silently drop a definition

- **WHEN** the two rows have different definitions
- **THEN** the panel states which definition survives before the merge is applied

### Requirement: Nothing in this capability deletes data

No write SHALL issue a delete: rows that stop applying are deactivated, and the public payload SHALL
keep every key it publishes today.

#### Scenario: A split, a merge and a deactivation leave the rows in place

- **WHEN** a term is split, merged back and deactivated
- **THEN** every `glossary` and `glossary_portfolios` row involved still exists, only with its
  `is_active` flag changed

### Requirement: A portfolio created later needs no code change

The system SHALL read from the portfolios catalogue the versions of a term, the portfolios the panel
offers and the one the public page opens on. No portfolio identifier SHALL be hardcoded.

#### Scenario: A new portfolio is created

- **WHEN** a portfolio for 2031-2036 is added to the catalogue and marked active
- **THEN** it can be assigned to a term as a new version from the panel, with no release
- **AND** the public glossary offers its filter and opens on it, since it is the active portfolio
  with the latest start year

### Requirement: Versions of a term are related explicitly

The system SHALL let an administrator declare that a term is a version of another one, and undo that
declaration. Rows so related SHALL form a group, exposed to the public read so that a concept is
rendered once instead of once per row. A row with no declared group SHALL be its own group, so every
term that exists today keeps behaving exactly as it does.

#### Scenario: Relating the two rows that already exist for one concept

- **WHEN** an administrator declares that the 2022-2024 row of `Impact` is a version of the current one
- **THEN** both rows report the same group
- **AND** the panel lists them as one term with two versions
- **AND** the public glossary shows one entry for `Impact` with the definition of each portfolio

#### Scenario: Titles that differ by an invisible character

- **WHEN** two rows differ only by a trailing non-breaking space in the title
- **THEN** they can still be related, because the grouping is declared and not inferred from the title

#### Scenario: A group cannot hold two versions of the same portfolio

- **WHEN** relating a term to a group where an active member already holds one of its portfolios
- **THEN** the request is rejected naming the portfolio in conflict
- **AND** nothing is written

#### Scenario: Unrelating a term

- **WHEN** an administrator unrelates a term from its group
- **THEN** the term becomes its own group again and no row is deleted

#### Scenario: A split keeps the group

- **WHEN** a term is split into a new version
- **THEN** the new row belongs to the same group as the row it came from
