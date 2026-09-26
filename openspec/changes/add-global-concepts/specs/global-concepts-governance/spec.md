## ADDED Requirements

### Requirement: Change proposals
Any signed-in CLARISA user SHALL be able to propose a new concept, an edit, a merge or a
deprecation, with a rationale; the proposal SHALL move through submitted, screening, validation and
published or rejected, each step recorded with who decided and a note.

#### Scenario: Proposal travels end to end
- **WHEN** a proposal for a new concept is screened, validated and published
- **THEN** the concept is created as approved in the same transaction
- **AND** the proposal, the concept history and the next release change log reference each other

#### Scenario: Automatic duplicate check
- **WHEN** a proposal is submitted
- **THEN** the module lists existing concepts with similar labels or definitions on the proposal

### Requirement: Configurable steps
Who may move a proposal from one step to the next SHALL be a permission, not hard-coded, so the
governance model decided in Rabat is configuration.

#### Scenario: No-objection window
- **WHEN** a proposal enters validation with a no-objection window configured
- **THEN** it shows the deadline and cannot be published before it

### Requirement: Roles
The module SHALL distinguish visitor, requester, reviewer and admin/approver; only admins SHALL
create or edit concepts directly, and direct writes SHALL be flagged in the change log.

#### Scenario: Requester cannot write directly
- **WHEN** a signed-in user without the admin permission calls a concept write endpoint
- **THEN** the request is rejected with 403 and the user is offered to submit a request instead

#### Scenario: Outcome notification
- **WHEN** an admin approves, rejects or asks for changes on a request
- **THEN** the requester is emailed the decision and its justification

### Requirement: AI recommendation on requests
When AI is enabled, an admin or reviewer SHALL be able to request an AI recommendation for a
request, returning approve / needs changes / reject with reasons; the recommendation SHALL be stored
with the request and SHALL NOT change its state.

#### Scenario: Duplicate detected
- **WHEN** a request proposes a concept whose label or definition is close to an approved one
- **THEN** the AI recommendation is "needs changes" and names the existing concept

### Requirement: Platform integration by API key
Platforms SHALL be able to read, submit concept requests, write concepts in schemes they own and
review requests of schemes they own using a CLARISA API key with the matching scope; a platform key
SHALL NOT write directly to a scheme it does not own.

#### Scenario: PRMS submits a request to the global scheme
- **WHEN** PRMS sends a request with a key holding `global-concepts:request`, its user's email and an
  `external_request_id`
- **THEN** a request is created with `origin_platform = prms` and the acting user recorded
- **AND** sending the same `external_request_id` again returns the same request instead of a new one

#### Scenario: Platform writes outside its scheme
- **WHEN** a key with `global-concepts:write` tries to create a concept in the `meliaf` scheme it does
  not own
- **THEN** the call is rejected with 403

#### Scenario: Outcome callback
- **WHEN** a request that registered a `callback_url` is decided
- **THEN** the module posts the decision to that URL, signed, retrying on failure

### Requirement: Promotion to the global scheme
A platform concept SHALL be promotable to the global scheme through a `promote` request; on approval
the new global concept is created and the platform concept is mapped to it or deprecated with it as
replacement.

#### Scenario: Promote a PRMS concept
- **WHEN** a promote request for a PRMS concept is approved
- **THEN** the global concept exists and the PRMS concept points to it
