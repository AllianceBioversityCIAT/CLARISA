## ADDED Requirements

### Requirement: On-brand documentation in isolated iframe

The API documentation SHALL render inside the existing isolated `<iframe>` of `ApiReferenceComponent`, styled with the CLARISA visual identity (blue `#0065bd`, leaf green `#7ab800`), with no Scalar or other third-party documentation widget present.

#### Scenario: Documentation loads without Scalar

- **WHEN** a user navigates to the `/api-reference` route
- **THEN** the documentation renders inside the iframe using the custom CLARISA-branded UI
- **AND** no `@scalar/api-reference` script, Scalar widget, "Ask AI", "Test Request", or MCP layer is loaded or displayed

#### Scenario: API base URL passed from Angular

- **WHEN** `ApiReferenceComponent` mounts the iframe
- **THEN** it passes the configured API base URL via the `?api=` query parameter
- **AND** the documentation app uses that base to fetch both the OpenAPI spec and each live endpoint

### Requirement: Curated hierarchy navigation

The documentation SHALL present the endpoints grouped as group > category > endpoint, sourced from the existing `catalog.json`, and SHALL let the user search/filter that navigation. The grouping SHALL be the only source of which endpoints are shown and in which category, mirroring the legacy custom Swagger's specific groupings.

#### Scenario: Hierarchy rendered from catalog

- **WHEN** the documentation loads `catalog.json`
- **THEN** the sidebar lists each group with its categories and endpoints in the catalog order
- **AND** the home view shows group/category/endpoint counts

#### Scenario: Endpoint listed in multiple categories

- **WHEN** an endpoint route appears under more than one category in `catalog.json`
- **THEN** the documentation shows it under each of those categories

#### Scenario: Endpoint search

- **WHEN** the user types text in the endpoint search box
- **THEN** the navigation filters to endpoints whose name or route matches the text

### Requirement: Documented grouping maintenance

The grouping catalog SHALL be accompanied by a maintenance guide so a maintainer can expose a new endpoint without reverse-engineering the code.

#### Scenario: Guide explains how to expose a new endpoint

- **WHEN** a maintainer needs to add a new endpoint to the public documentation
- **THEN** a `CATALOG.md` next to `catalog.json` documents the catalog shape (group > category > endpoint, multi-category allowed) and the two-step procedure: add the path to the back allowlist `PUBLIC_OPENAPI_PATHS` so it enters the zero-leak spec, then add it under the chosen category in `catalog.json` so it appears in the docs

### Requirement: Live data table for non-technical users

For a selected endpoint, the documentation SHALL fetch the live response and render it as a table with per-record filtering, column sorting, and pagination.

#### Scenario: Render live records as a table

- **WHEN** the user selects an endpoint
- **THEN** the documentation fetches the live response from the API base and renders the records as a table with derived columns
- **AND** nested object fields are flattened into `parent.child` columns and array fields are joined by a representative value

#### Scenario: Filter, sort and paginate

- **WHEN** the user types in the table filter, clicks a column header, or changes page/rows-per-page
- **THEN** the table updates to show the filtered, sorted, and paginated records
- **AND** the visible record count reflects the active filter

#### Scenario: Endpoint fails to load

- **WHEN** the live request for an endpoint returns an error
- **THEN** the documentation shows an error state with a Retry action instead of the table

### Requirement: Export to Excel, CSV and JSON

The documentation SHALL let the user export the current endpoint's data to Excel (.xlsx), CSV, and JSON.

#### Scenario: Export the current control list

- **WHEN** the user clicks Excel, CSV, or JSON in the table toolbar
- **THEN** the documentation downloads a file in the chosen format named after the endpoint
- **AND** the Excel and CSV exports reflect the currently filtered records

### Requirement: Developer views (JSON, Schema, Code)

The documentation SHALL provide, per endpoint, a JSON tab (raw live response), a Schema tab (field names and types), and a Code tab (copyable request snippets).

#### Scenario: View raw JSON

- **WHEN** the user opens the JSON tab
- **THEN** the documentation shows the raw live response and offers a full-JSON download

#### Scenario: View schema

- **WHEN** the user opens the Schema tab
- **THEN** the documentation shows each field with its type from the OpenAPI spec
- **AND** when the endpoint is absent from the public spec, fields are inferred from live data and the view indicates the schema is inferred

#### Scenario: Copy code snippets

- **WHEN** the user opens the Code tab and clicks Copy on a snippet
- **THEN** the documentation provides cURL, JavaScript, and Python snippets targeting the endpoint URL and copies the selected one to the clipboard
