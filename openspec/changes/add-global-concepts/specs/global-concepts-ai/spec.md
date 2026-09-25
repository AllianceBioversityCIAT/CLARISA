## ADDED Requirements

### Requirement: MCP endpoint
The module SHALL expose a stateless MCP endpoint (Streamable HTTP) in the CLARISA back end with
read-only tools `search_concepts`, `get_concept`, `suggest_concepts_for_text` and `list_releases`,
returning only published concepts and never inventing identifiers.

#### Scenario: Assistant asks for a definition
- **WHEN** an AI assistant calls `get_concept` for "outcome"
- **THEN** it receives the official definition, source, version and URI

### Requirement: AI assistance is opt-in and suggestion-only
AI features SHALL run only when enabled, only on the server with a server-side key, and SHALL store
their output as suggestions that an editor accepts or discards; nothing SHALL be published by a
model.

#### Scenario: AI disabled
- **WHEN** `GLOBAL_CONCEPTS_AI_ENABLED` is false
- **THEN** every AI endpoint answers 404 and the rest of the module works unchanged

#### Scenario: Import column mapping
- **WHEN** a file with unknown headers is uploaded and AI is enabled
- **THEN** the wizard proposes a mapping of each column to a schema field with a confidence
- **AND** the editor confirms or changes it before the preview

### Requirement: No retention of user text
Text sent to `suggest_concepts_for_text` or the text-alignment endpoint SHALL NOT be stored.

#### Scenario: Draft checked
- **WHEN** a user checks a confidential draft
- **THEN** the response lists matched concepts and nothing of the text is persisted
