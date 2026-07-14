# glossary-public-page

## ADDED Requirements

### Requirement: Public glossary page on the landing
The landing SHALL expose a public page (route `/glossary`, no authentication) that consumes `GET api/glossary` and presents every active term with its definition and portfolio chips in a polished card-based layout consistent with the landing's visual identity.

#### Scenario: Anonymous visit
- **WHEN** a visitor without a session opens `<front-host>/glossary`
- **THEN** the page renders the glossary terms as cards showing term, definition and portfolio chips, with no login required

### Requirement: Search and portfolio filtering on the public page
The public page SHALL provide a text search (matching term and definition) and a portfolio filter (options from `GET api/portfolios`, filtering client-side by portfolio `id`), combinable with each other.

#### Scenario: Searching a term
- **WHEN** the visitor types "action" in the search box
- **THEN** only terms whose term or definition contains "action" (case-insensitive) remain visible

#### Scenario: Filtering by portfolio
- **WHEN** the visitor picks a portfolio
- **THEN** only terms associated with that portfolio id remain visible

### Requirement: Vertical list with pagination
Because definitions vary greatly in length, the public page SHALL present terms as a single-column vertical list (one card per row) with client-side pagination (10 terms per page, pager controls). Changing the search text or the portfolio filter SHALL reset the pager to page 1.

#### Scenario: Paging through terms
- **WHEN** more than 10 terms match the current search/filter
- **THEN** the page shows the first 10 with pager controls, and selecting page 2 shows the next batch

#### Scenario: Filter resets the pager
- **WHEN** the visitor is on page 2 and types in the search box
- **THEN** the pager returns to page 1 with the new result set

### Requirement: Resilient rendering
The page SHALL handle edge states gracefully: loading indicator while fetching, an empty-state message when no term matches the search/filter, and terms without portfolios rendered without chips.

#### Scenario: No matches
- **WHEN** the search/filter combination matches zero terms
- **THEN** the page shows an empty-state message instead of a blank area
