## ADDED Requirements

### Requirement: Editorial status
Concepts SHALL move through draft, in_review, approved and deprecated; a deprecated concept SHALL
NOT be deleted and MAY point to one approved replacement.

#### Scenario: Deprecate with replacement
- **WHEN** an admin deprecates a concept pointing to another approved concept
- **THEN** the concept stays published with `owl:deprecated` and `dcterms:isReplacedBy`
- **AND** its URI page shows the replacement

#### Scenario: Invalid replacement
- **WHEN** the replacement is itself a draft, inactive, deprecated or the same concept
- **THEN** the request is rejected with 400 and nothing changes

### Requirement: Change log
Every write to a concept SHALL append an entry with the fields that changed (before/after), the
action, who made it (email) and when, in the same transaction as the write; entries SHALL NOT be
edited or deleted by the application.

#### Scenario: Public history
- **WHEN** a client asks for the history of a published concept
- **THEN** it receives the entries in order without the editor's identity

### Requirement: Released versions
Admins SHALL be able to publish a release of a scheme with a semantic version; a release SHALL
freeze its exports as immutable files at a versioned path together with its change log and license.

#### Scenario: Citable version
- **WHEN** release 1.0.0 is published and a concept is edited afterwards
- **THEN** `…/releases/1.0.0/…` still returns the concept as it was in 1.0.0

### Requirement: Quality gate
A release SHALL be blocked while the scheme violates SKOS integrity conditions S13, S14 or S27,
has cycles in broader relations, or has approved concepts without a definition.

#### Scenario: Two preferred labels in one language
- **WHEN** two approved concepts would publish the same preferred label in the same language
- **THEN** the release is refused and the quality report lists both
