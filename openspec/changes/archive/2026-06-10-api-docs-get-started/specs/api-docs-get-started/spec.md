## ADDED Requirements

### Requirement: Get Started sidebar entry

The API documentation page SHALL display a "Get Started" entry as the **first item in the sidebar**, above all catalog groups. Selecting it SHALL render the Get Started view in the main area and mark the entry as active.

#### Scenario: Entry is visible on load
- **WHEN** the documentation page finishes loading the catalog
- **THEN** a "Get Started" entry is rendered at the top of the sidebar, before the first catalog group

#### Scenario: Selecting the entry shows the view
- **WHEN** the user clicks the "Get Started" sidebar entry
- **THEN** the main area renders the Get Started content
- **AND** the "Get Started" entry is visually highlighted as active
- **AND** any previously active endpoint entry is no longer highlighted

#### Scenario: Entry persists during search
- **WHEN** the user types a query in the global endpoint search
- **THEN** the "Get Started" entry remains accessible (it is navigation, not an endpoint, and is not filtered out by the endpoint search)

### Requirement: Authentication onboarding content

The Get Started view SHALL explain how to authenticate against the CLARISA API using the hybrid model, in English.

#### Scenario: Explains hybrid auth
- **WHEN** the Get Started view is rendered
- **THEN** it states that the API supports a valid API token via the `X-API-Key` header
- **AND** it states that legacy JWT authentication still works for backward compatibility

#### Scenario: Explains how to request a token
- **WHEN** the Get Started view is rendered
- **THEN** it instructs the user to request a token by email to both `CLARISASupport@cgiar.org` and `PRMSTechsupport@cgiar.org`
- **AND** it lists what information to include in the request (name/organization, use case, environment)
- **AND** it shows the token format `cl_[env]_[random]`

#### Scenario: Shows usage examples
- **WHEN** the Get Started view is rendered
- **THEN** it shows a curl example sending the `X-API-Key` header
- **AND** it shows a JavaScript fetch example sending the `X-API-Key` header
- **AND** the examples use the live API base URL injected via the `?api=` query param

#### Scenario: States endpoints are read-only
- **WHEN** the Get Started view is rendered
- **THEN** it notes that the public control-list endpoints are read-only

### Requirement: Visual consistency with the docs page

The Get Started view SHALL reuse the existing docs page styling (Tailwind classes, CLARISA color palette, card/section layout) so it is indistinguishable in style from the rest of the documentation.

#### Scenario: Matches existing look and feel
- **WHEN** the Get Started view is rendered
- **THEN** it uses the same fonts, color tokens (clarisa/leaf), and card components already used by the home and endpoint views
