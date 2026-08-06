## ADDED Requirements

### Requirement: API Reference entry in the landing-page Services menu

The landing-page navigation bar's **Services** dropdown SHALL include an entry labelled **API Reference** that navigates to the dynamic OpenAPI documentation view at `/clarisa-panel/api-reference`. The entry SHALL reuse the existing dropdown `<li>` markup and styling so it is visually consistent with the sibling items (`Introduction`, `One CGIAR Control List`, `One CGIAR Operation`, `Institution Request`).

#### Scenario: User opens the Services dropdown

- **WHEN** a user opens the **Services** dropdown in the landing-page navbar
- **THEN** an **API Reference** item is listed alongside the existing documentation items
- **AND** the item is styled identically to its siblings

#### Scenario: User clicks API Reference

- **WHEN** a user clicks the **API Reference** item
- **THEN** the app navigates to `/clarisa-panel/api-reference`
- **AND** the dynamic OpenAPI documentation view renders the filtered spec

### Requirement: API Reference entry in the clarisa-panel documentation menu

The `clarisa-panel` documentation horizontal menu SHALL expose an **API Reference** entry pointing to `/clarisa-panel/api-reference`, placed within the same group as the existing documentation links (`One CGIAR Control List`, `One CGIAR Operation`) and using the existing `dropdown-item` pattern.

#### Scenario: Reviewer navigates from the panel documentation menu

- **WHEN** a user is in the `clarisa-panel` documentation area and opens the documentation menu
- **THEN** an **API Reference** entry is available next to the existing documentation links
- **AND** selecting it loads `/clarisa-panel/api-reference`

### Requirement: API Reference entry in the clarisa-panel manage menu

The `clarisa-panel` manage horizontal menu, which mirrors the documentation links, SHALL also expose the **API Reference** entry pointing to `/clarisa-panel/api-reference`, so the view is reachable from every place the legacy documentation links appear.

#### Scenario: User navigates from the manage menu

- **WHEN** a user opens the documentation links within the `clarisa-panel` manage menu
- **THEN** an **API Reference** entry is present
- **AND** selecting it loads `/clarisa-panel/api-reference`

### Requirement: Legacy documentation remains available

Adding the API Reference entry SHALL NOT remove or replace the existing legacy documentation links (`/clarisa-panel/documentation/...`). Both the new view and the legacy documentation SHALL coexist.

#### Scenario: Legacy documentation still reachable

- **WHEN** the API Reference entry has been added to the menus
- **THEN** the existing `One CGIAR Control List` and `One CGIAR Operation` links continue to work and point to the legacy documentation as before

### Requirement: Route presented as a first-class view

The `api-reference` route SHALL no longer be framed as a proposal/experimental view. The `// PROPUESTA` annotation in the routing module SHALL be removed so the route reads as a standard, supported view.

#### Scenario: Routing no longer marks the view as a proposal

- **WHEN** a developer reads `clarisa-panel-routing.module.ts`
- **THEN** the `api-reference` route definition contains no `PROPUESTA` framing
- **AND** the route still lazy-loads the `ApiReferenceModule`
