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

### Requirement: Vertical alphabetical list with letter index
Because definitions vary greatly in length, the public page SHALL present terms as a single-column vertical list (one card per row), sorted alphabetically, with NO pagination (updated per Yeck 2026-07-15). Below the portfolio filter, the page SHALL show a letter index as small circles containing ONLY the initials that exist among the current terms; selecting a letter filters the list (toggle), and the available letters SHALL recompute when the portfolio filter changes.

#### Scenario: Letter index reflects existing initials
- **WHEN** the loaded terms start with A, C and S only
- **THEN** the letter index shows exactly the circles A, C and S

#### Scenario: Filtering by initial
- **WHEN** the visitor clicks the "S" circle
- **THEN** only terms starting with S remain visible; clicking it again restores the list

### Requirement: Portfolio filter shows active portfolios without CGIAR prefix
The portfolio filter SHALL offer every ACTIVE portfolio (even those with no terms yet, each taking its deterministic color when selected) and hide inactive/closed portfolios (e.g. 2016-2021). Portfolio labels in pills and chips SHALL drop the leading "CGIAR" word, keeping a capitalized first letter (e.g. "Portfolio 2022-2024", "General"). Inactive (unselected) pills SHALL be neutral (no portfolio color).

#### Scenario: Closed portfolio hidden
- **WHEN** the portfolios endpoint returns 2016-2021 with is_active = 0
- **THEN** that portfolio does not appear among the filter pills

### Requirement: Resilient rendering
The page SHALL handle edge states gracefully: loading indicator while fetching, an empty-state message when no term matches the search/filter, and terms without portfolios rendered without chips.

#### Scenario: No matches
- **WHEN** the search/filter combination matches zero terms
- **THEN** the page shows an empty-state message instead of a blank area
