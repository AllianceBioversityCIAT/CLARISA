# api-docs-versioning Specification

## Purpose
TBD - created by archiving change api-docs-versioning. Update Purpose after archive.
## Requirements
### Requirement: Each endpoint page has a Doc tab

The custom API documentation front SHALL provide a "Doc" tab on every endpoint page. The Doc tab SHALL be the first tab and the default selected tab when an endpoint is opened, and it SHALL render from the OpenAPI spec without waiting for the endpoint's live-data fetch to complete.

#### Scenario: Doc tab is the default view of an endpoint

- **WHEN** a consumer opens any endpoint in the custom API documentation
- **THEN** the "Doc" tab is shown first, before the live Table/JSON tabs

#### Scenario: Doc tab is not blocked by large live lists

- **WHEN** a consumer opens an endpoint backed by a large list (e.g. Institutions, Countries)
- **THEN** the Doc tab content renders immediately, without being hidden behind the "Fetching live data…" spinner

### Requirement: Doc tab documents per-endpoint versioning

The Doc tab SHALL explain that the API is versioned via the `?version=N` query parameter (NestJS `VersioningType.CUSTOM`), defaults to version `1` when absent, and has NO URI-based versioning (e.g. `/v1/`) and NO version header. For the open endpoint it SHALL state whether a v2 exists; if so it SHALL describe what that endpoint's v2 changes and show copy-paste `?version=1` / `?version=2` examples. The set of v2-capable endpoints SHALL include at minimum `cgiar-entities`, `cgiar-entity-typology`, `sdgs`, `sdg-targets`, and `sdg-indicators`.

#### Scenario: Endpoint with a v2

- **WHEN** a consumer opens an endpoint that exposes a v2 (e.g. `cgiar-entities`)
- **THEN** the Doc tab shows a v1 (default) and a v2 (opt-in) card, a note on what v2 changes, and an example selecting the version with `?version=2`

#### Scenario: Endpoint with v1 only

- **WHEN** a consumer opens an endpoint that has no v2 (e.g. `countries`)
- **THEN** the Doc tab states it has a single version and that sending `?version=2` has no effect

### Requirement: Doc tab documents query params, status codes and the response DTO

The Doc tab SHALL render, from the OpenAPI spec, the endpoint's query parameters (name, type, default, description) with a realistic example URL built from those params, the HTTP status codes the endpoint can return, and the response DTO rendered as a readable TypeScript-style interface resolved from `components.schemas`. When the spec does not publish a model, the tab SHALL fall back to a shape inferred from live data and label it as inferred.

#### Scenario: Consumer reads the response contract

- **WHEN** a consumer opens the Doc tab of an endpoint present in the spec
- **THEN** they see its query params, its status codes, and its response DTO as an interface

#### Scenario: Consumer learns how to use the query params

- **WHEN** a consumer reads the query-params section
- **THEN** they see each param's type and default plus an example request URL combining the endpoint's own params (e.g. `show`, and `version=2` where applicable)

### Requirement: Versioning lives in a maintained map, not the spec

Because the OpenAPI spec does not carry version information, the set of v2-capable endpoints SHALL be maintained as an explicit `V2_ENDPOINTS` map in the front asset, each entry carrying a note on what that endpoint's v2 changes. Endpoints absent from the map SHALL be presented as v1-only.

#### Scenario: Endpoint absent from the map

- **WHEN** an endpoint is not present in `V2_ENDPOINTS`
- **THEN** its Doc tab presents it as v1-only and states `?version=2` has no effect

### Requirement: Convention to verify versioning when exposing an endpoint

The project SHALL adopt a documented convention that, whenever a new endpoint is exposed in the custom API documentation, its versioning is verified against the backend controller (checking for `@Version(...)` decorators); if the endpoint has a v2 it SHALL be added to `V2_ENDPOINTS` with a note on what its v2 changes, to keep the docs in sync with the API.

#### Scenario: New endpoint is added to the catalog

- **WHEN** a contributor adds a new endpoint to the custom API documentation catalog
- **THEN** the convention requires them to check the controller's `@Version` decorators and, if a v2 exists, add the endpoint to `V2_ENDPOINTS`

#### Scenario: Convention is discoverable

- **WHEN** a contributor looks for how to document a new endpoint
- **THEN** the convention is written down in a project-visible location (the wiki `arquitectura.md`) and is findable

