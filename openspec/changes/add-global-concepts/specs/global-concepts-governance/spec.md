## ADDED Requirements

### Requirement: Change proposals
Any person SHALL be able to propose — through the public request form (verified email), a platform using its API key, or as a signed-in CLARISA user — a new concept, an edit, a merge or a
deprecation, with a rationale; the proposal SHALL move through submitted, in_review, changes_requested, validation (when a
validator is configured) and approved or rejected, each step recorded with who decided and a note.

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
- **AND** sending it again with a different payload is rejected with 409

#### Scenario: Platform writes outside its scheme
- **WHEN** a key with `global-concepts:write` tries to create a concept in the `meliaf` scheme it does
  not own
- **THEN** the call is rejected with 403

#### Scenario: Outcome is retrievable by the platform
- **WHEN** a request submitted with a platform key is decided
- **THEN** `GET …/requests/{id}` with that key returns the decision and its justification
- **AND** the requester is emailed (signed callbacks to a registered URL are a later step)

### Requirement: Promotion to the global scheme
A platform concept SHALL be promotable to the global scheme through a `promote` request; on approval
the new global concept is created and the platform concept is mapped to it or deprecated with it as
replacement.

#### Scenario: Promote a PRMS concept
- **WHEN** a promote request for a PRMS concept is approved
- **THEN** the global concept exists and the PRMS concept keeps its URI with an `exactMatch` mapping to it
- **AND** the PRMS concept is deprecated with the global one as replacement only if the request asked for it

### Requirement: Stale edit requests
An edit request SHALL record the concept version it was written against; approving it after the
concept changed SHALL be refused.

#### Scenario: Concept changed meanwhile
- **WHEN** an admin approves an edit request whose `base_version` is older than the concept's version
- **THEN** the approval is refused with 409 and the request returns to `in_review` with a note

### Requirement: Decisions are serialised
A decision SHALL only succeed if the request is still in the state the decider saw.

#### Scenario: Two admins decide at once
- **WHEN** two admins approve and reject the same request concurrently
- **THEN** exactly one decision is applied and the other receives 409

### Requirement: Public requester follow-up
A requester who used the public form SHALL be able to read the status of their request and resubmit
after changes are requested, using the per-request link from the verification email.

#### Scenario: Resubmit after changes requested
- **WHEN** an admin asks for changes on a request made through the public form
- **THEN** the requester receives an email with a link that lets them edit and resubmit that request only
