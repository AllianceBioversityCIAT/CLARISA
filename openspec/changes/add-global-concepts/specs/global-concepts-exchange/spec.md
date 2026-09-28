## ADDED Requirements

### Requirement: Exports
The module SHALL export a scheme (live or a release) as JSON, CSV (UTF-8 with BOM, formula-injection
guarded), SKOS Turtle and JSON-LD, including labels with language tags, definitions, notes that are
public, relations, external mappings, provenance, deprecation and license.

#### Scenario: SKOS export validates
- **WHEN** the Turtle export is parsed by a standard RDF parser
- **THEN** it yields one `skos:ConceptScheme` and one `skos:Concept` per published concept

### Requirement: Content negotiation
A concept URI SHALL return HTML to browsers and Turtle or JSON-LD to clients asking for them via
`Accept` (or `?format=`), with `Vary: Accept`.

#### Scenario: Machine request
- **WHEN** a client requests a concept with `Accept: text/turtle`
- **THEN** it receives the concept as Turtle

### Requirement: External mappings with provenance
Mappings to AGROVOC, IPCC, OECD-DAC, PRMS or other vocabularies SHALL record the target URI and
label, the SKOS mapping property, justification, confidence, author, reviewer and date; `closeMatch`
SHALL be the default.

#### Scenario: AI-suggested mapping
- **WHEN** an AI suggestion proposes an AGROVOC match
- **THEN** it is stored as a suggestion with justification `ai_suggested` until an editor approves it

### Requirement: Bulk import
Admins SHALL import concepts from Excel, CSV or pasted text with a dry-run preview, per-row actions
and a data-quality report, reusing the CLARISA import wizard; nothing SHALL be written while any row
is invalid.

#### Scenario: Lexicon file
- **WHEN** the current Lexicon workbook (312 rows) is previewed
- **THEN** duplicated or missing IDs, repeated labels and non-list values are reported per row

### Requirement: Change feed
The module SHALL expose the concepts changed since a given timestamp so consumers sync
incrementally.

#### Scenario: Incremental sync
- **WHEN** a client asks for changes since yesterday
- **THEN** only concepts created, edited or deprecated since then are returned
