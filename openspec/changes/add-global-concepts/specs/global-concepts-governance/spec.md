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
