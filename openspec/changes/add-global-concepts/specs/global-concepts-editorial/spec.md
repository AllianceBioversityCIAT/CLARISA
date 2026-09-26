## ADDED Requirements

### Requirement: Editorial status
Concepts SHALL move through draft, in_review, approved and deprecated; a deprecated concept SHALL
NOT be deleted and MAY point to one approved replacement.

#### Scenario: Deprecate with replacement
- **WHEN** an admin deprecates a concept pointing to another approved concept
- **THEN** the concept stays published with `owl:deprecated` and `dcterms:isReplacedBy`
- **AND** its URI page shows the replacement

#### Scenario: Invalid replacement
- **WHEN** the replacement is itself a draft, deprecated, the same concept, or a concept whose own
  replacement chain leads back to this one
- **THEN** the request is rejected with 400 and nothing changes

### Requirement: Merge
Merging concept B into A SHALL move B's labels (deduplicated per language against A's), relations
(dropping self-relations and duplicates) and mappings to A, deprecate B with A as replacement, and
log both concepts, in one transaction.

#### Scenario: Merged label equals the survivor's preferred label
- **WHEN** B's preferred label equals A's preferred label in the same language
- **THEN** it is not added as an alternative label of A and the merge still succeeds

### Requirement: Relation integrity at write time
The module SHALL reject, when written: a relation between concepts of different schemes, a
self-relation, a `broader` that creates a cycle, and a `related` between a concept and one of its
ancestors or descendants.

#### Scenario: Cycle attempt
- **WHEN** A is broader than B and someone sets B as broader than A
- **THEN** the write is rejected with 400 and the hierarchy is unchanged

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
