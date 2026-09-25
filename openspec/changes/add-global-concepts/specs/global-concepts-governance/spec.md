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
