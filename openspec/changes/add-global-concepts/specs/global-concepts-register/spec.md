## ADDED Requirements

### Requirement: Decoupled storage
The Global Concepts module SHALL store its data only in its own tables (prefix `gc_`) and SHALL NOT
declare foreign keys to any table outside the module; its only contact points with existing tables
SHALL be those listed in design.md (*Audit corrections*, item 3).

#### Scenario: Dropping the module
- **WHEN** the module migration is reverted
- **THEN** every `gc_` table and the `/api/global-concepts/admin` permission rows are removed
- **AND** no other table is altered

### Requirement: Concept record
Each concept SHALL carry the fields of the MELIAF data schema template v0.1 (term_uri, term_id,
preferred_label, alternative labels, language, definition, scope_note, example_of_use, term_type,
broader/narrower/related, meliaf_function, meliaf_phase_primary, meliaf_phase_also,
source_citation, source_url, derivation, status, version, date_created, date_modified,
validated_by, date_validated, steward, replaced_by, maps_to_prms, maps_to_external, notes) plus
`short_definition` and `origin` (lexicon, ai_generated, domain_expert, external_standard).

#### Scenario: Origin is never lost
- **WHEN** concepts from the Lexicon file and from a domain taxonomy are loaded into the same scheme
- **THEN** each concept keeps its own `origin` and `source_citation`
- **AND** the public read exposes both

### Requirement: Persistent identifier
Each concept SHALL have a `term_id` that never changes and a URI built from it
(`https://api.clarisa.cgiar.org/concepts/{scheme}/{term_id}`, domain pending Group 4's decision); editing labels or definitions SHALL NOT
change either, and a deprecated concept SHALL keep resolving.

#### Scenario: Wording changes
- **WHEN** an editor changes the preferred label of concept 2374
- **THEN** its URI and `term_id` stay the same and its history records the change

### Requirement: Controlled lists
Status, MELIAF function, phase, term type, derivation, language, icon status and icon format SHALL
accept only values from the module's own lists, editable by admins.

#### Scenario: Unknown value on import
- **WHEN** a row brings the function "MEL+IA"
- **THEN** the import flags it and proposes the closest list values instead of storing it

### Requirement: One status, no second switch
A concept SHALL have exactly one editorial status and no separate active flag; whether it is public
follows from the status alone.

#### Scenario: Retracting a published concept
- **WHEN** an admin wants a published concept out of the public read
- **THEN** the only way is to deprecate it (optionally with a replacement), and the history records it

### Requirement: Public read
The module SHALL expose anonymous, read-only endpoints to list, filter (function, phase, type,
status, collection), search (preferred, alternative and hidden labels, partial words) and get a
concept, returning only approved and deprecated concepts.

#### Scenario: Search by synonym
- **WHEN** a client searches "IA"
- **THEN** the concept whose alternative label is "IA" is returned with its preferred label

#### Scenario: Drafts stay private
- **WHEN** a concept is in `draft` or `in_review`
- **THEN** no public endpoint, export or MCP tool returns it

#### Scenario: Hub shows approved terms only
- **WHEN** a client lists concepts with `status=approved`
- **THEN** deprecated concepts are excluded (they stay resolvable by URI)
