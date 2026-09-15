## ADDED Requirements

### Requirement: The admin surface exposes the glossary rows that need a human eye

The system SHALL expose `GET api/glossary/admin/diagnostics`, protected by the same guards as the
rest of the admin surface (`JwtAuthGuard` + `PermissionGuard`), read-only, returning the glossary
rows that are inconsistent or were written outside the panel, grouped by finding. Every entry SHALL
carry the row `id`, `title`, `is_active`, its portfolio links — active and inactive — and its audit
fields (`created_at`, `created_by`, `updated_at`, `updated_by`, `modification_justification`).

#### Scenario: A term with no active portfolio

- **WHEN** an active term holds no active portfolio link
- **THEN** it is reported under `without_active_portfolio`, because it is invisible under every
  portfolio filter of the public page

#### Scenario: Same-titled terms are listed together

- **WHEN** two or more terms share a normalized title
- **THEN** all of them are reported under `duplicated_titles` in one entry, each with its own
  portfolios, so a deliberate version is told apart from an accidental duplicate

#### Scenario: Two versions claiming the same portfolio

- **WHEN** two active terms share a normalized title and both hold the same portfolio
- **THEN** they are reported under `portfolio_conflicts`, which the public page would render as two
  cards with the same title under the same filter

#### Scenario: A row written outside the panel

- **WHEN** a term's `updated_at` is set while its `updated_by` is `NULL`
- **THEN** it is reported under `written_outside_panel`, since every panel write records the acting
  user and direct SQL does not

#### Scenario: A healthy glossary

- **WHEN** no row matches any finding
- **THEN** every group is returned empty, and the response states the totals it examined

### Requirement: The diagnostics endpoint never writes

The endpoint SHALL be a read: it SHALL NOT create, update, deactivate nor repair any row, so it can
be called at any time to compare environments.

#### Scenario: Calling it twice changes nothing

- **WHEN** the endpoint is called twice in a row
- **THEN** both responses are identical and no audit field in the database has moved

### Requirement: The findings are reachable from the panel

The admin panel SHALL offer the diagnostics as a view inside the glossary module, so a term reported
there can be opened and corrected without leaving the panel.

#### Scenario: Repairing a reported term

- **WHEN** an administrator opens a term reported under `without_active_portfolio` from the
  diagnostics view and assigns it a portfolio
- **THEN** the term stops being reported on the next call

### Requirement: The terms table flags and lists the terms with no portfolio

The glossary terms table of the admin panel SHALL warn when an **active** term has no portfolio
linked, stating how many there are, SHALL mark each unlinked term in its portfolio column as a
warning rather than as an empty cell, and SHALL offer a filter that lists them — active and inactive
alike, so a term can be linked or deactivated from the same screen. The warning SHALL NOT be raised
by inactive rows alone: the 2023 glossary replacement left around 240 of them in every environment.

#### Scenario: A term written outside the panel is found from the panel

- **WHEN** an administrator opens the glossary terms table and an active term has no portfolio linked
- **THEN** a notice states how many active terms are in that state, and how many more are inactive
- **AND** choosing to list them shows every unlinked term, whatever its status

#### Scenario: Only deactivated rows are unlinked

- **WHEN** every unlinked term is inactive
- **THEN** no notice is raised, and the terms stay reachable through the filter

#### Scenario: The filter sentinel is never saved as a portfolio

- **WHEN** the edit dialog offers the portfolios of a term
- **THEN** the "no portfolio" entry of the filter is not among the options
