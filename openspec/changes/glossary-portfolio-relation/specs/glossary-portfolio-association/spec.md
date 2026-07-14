# glossary-portfolio-association

## ADDED Requirements

### Requirement: Glossary term to portfolio association
The system SHALL store associations between glossary terms and CGIAR portfolios in a join table `glossary_portfolios`, where each association links one `glossary.id` to one `portfolios.id`. A glossary term SHALL be associable with one or more portfolios, and the pair (`glossary_id`, `portfolio_id`) MUST be unique.

#### Scenario: Term belonging to multiple portfolios
- **WHEN** a glossary term is associated with portfolio 2 (2022-2024) and portfolio 3 (2025-2030)
- **THEN** `glossary_portfolios` contains two rows for that term, one per portfolio

#### Scenario: Duplicate association rejected
- **WHEN** an insert attempts to associate a term with a portfolio it is already associated with
- **THEN** the database rejects it via the unique constraint on (`glossary_id`, `portfolio_id`)

### Requirement: Backfill of existing terms to portfolio 2022-2024
The migration that creates `glossary_portfolios` SHALL, in the same `up()` execution, insert one association per existing `glossary` row pointing to portfolio id 2 (CGIAR portfolio 2022-2024), mirroring each term's `is_active` value. The migration MUST fail (not silently skip) if portfolio id 2 does not exist in the target database.

#### Scenario: Backfill on deploy
- **WHEN** the migration runs in the cloud against a database with N glossary rows
- **THEN** `glossary_portfolios` ends with N rows, all with `portfolio_id = 2`, each with `is_active` equal to its glossary row's `is_active`

#### Scenario: Missing portfolio aborts migration
- **WHEN** the migration runs against a database where `portfolios.id = 2` does not exist
- **THEN** the backfill insert fails with a foreign key error and the migration does not complete

### Requirement: Glossary API exposes portfolios per term
The glossary read endpoints (`GET /api/glossary`, `GET /api/glossary/dashboard`, `GET /api/glossary/get/:id`) SHALL include for each term a `portfolios` array of objects with `id`, `name` and `acronym`, containing only active associations. All previously existing response fields MUST remain unchanged (additive, non-breaking).

#### Scenario: Listing terms with portfolios
- **WHEN** a client calls `GET /api/glossary`
- **THEN** each item includes `portfolios` (e.g. `[{ "id": 2, "name": "CGIAR portfolio 2022-2024", "acronym": … }]`) alongside the existing `term` and `definition` fields

#### Scenario: Term without associations
- **WHEN** a term has no active association rows
- **THEN** its `portfolios` field is an empty array (the term is still returned)

### Requirement: Migration is cloud-only
The migration file SHALL only be executed in the cloud deployment pipeline. It MUST NOT be executed from a local environment; locally it is only written and audited (up and down reviewed against the real schema).

#### Scenario: Local development
- **WHEN** the change is developed and reviewed locally
- **THEN** no `migration:execute`/`migration:revert` is run locally; the migration first runs during the cloud deploy of the merged change
