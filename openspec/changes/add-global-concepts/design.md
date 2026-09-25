## Context

- **Source requirements** (all read 2026-09-25): Build Brief Topic 4 v1 (Alejandro Imbach, 25-sep;
  same text as the PDF shared by Juan David), *MELIAF Taxonomy use cases* v0, *Use cases and users
  summary table*, *MELIAF Taxonomy — data schema template* v0.1 (sheets Schema, Term register, Icon
  register, Lists, Data quality) and *Capability checklist v3* (16 rows, CLARISA column empty).
  Mirror of all of them, in plain Spanish, in the internal site `clarisa/output/meliaf-hub/`.
- **The competition**: Acquia DAM (asset-first; ships an MCP server) and Microsoft Fabric (data
  platform; editing needs Power BI Pro, no MCP). CLARISA's edge is that it already is CGIAR's
  controlled-vocabulary service, with a public API PRMS consumes.
- **What CLARISA already has to reuse** (exploration, file:line in the internal notes): module
  anatomy (`api.routes.ts` + module + custom repositories), `JwtAuthGuard` + `PermissionGuard`
  (substring match on the path), idempotent migrations, the Excel/CSV/paste parser and 4-step import
  wizard of the glossary admin, the export helpers (CSV with formula guard, Turtle literals) written
  on branch `glossary-taxonomy-readiness`, the public API reference site (`catalog.json` +
  `PUBLIC_OPENAPI_PATHS`), the revamp design tokens and admin partials.
- **Timebox**: production before the convening (6-oct). Flow `feature → dev-v2 (clarisatest) →
  feature → staging → main`; migrations run in the production Jenkins job.

## Goals / Non-Goals

**Goals**
- Answer "yes" to every must-have row of the checklist with something running, not a promise.
- Implement the schema template as-is (field names included), so Group 4 recognises its own work.
- Make the Rabat success criteria demonstrable live: version published at a stable address, another
  system reading it through the API, a change request travelling proposal → screening → validation
  → published.
- Zero coupling: removable in one migration without touching anything else.

**Non-Goals**
- Replacing, migrating or syncing the existing glossary (a later decision; `maps_to_prms` keeps a
  textual bridge).
- Deciding the governance roles (Rabat decides; the module ships configurable steps).
- The knowledge graph itself (the export and relations are its input; building it comes after).

## Decisions

### D1. A separate module, not an extension of the glossary
New tables and endpoints under `api/global-concepts`. The glossary keeps its contract untouched.
*Alternative rejected*: extending `glossary` (partly prototyped on `glossary-taxonomy-readiness`) —
it would change what PRMS reads and mix portfolio versioning with SKOS relations.

### D2. Data model (MySQL, InnoDB, **no foreign keys to existing tables**)
Integrity between the module's own tables is enforced in the service layer (and optional FKs among
themselves only), so dropping the module never has to touch another table.

| Table | Purpose | Key columns |
|---|---|---|
| `gc_schemes` | A vocabulary (MELIAF first; room for domain taxonomies such as climate change adaptation) | id, code (`meliaf`), title, description, uri_base, license, publisher |
| `gc_concepts` | The term register (one row per concept) | id, scheme_id, **term_id** (external stable code, e.g. 2374), term_uri, preferred_label, language, definition, short_definition, scope_note, example_of_use, term_type, meliaf_function (JSON list), meliaf_phase_primary, meliaf_phase_also (JSON), source_citation, source_url, derivation, **origin** (lexicon/ai_generated/domain_expert/external_standard), status, version, date_created, date_modified, validated_by, date_validated, steward, replaced_by_concept_id, notes, is_active, created_by_email, updated_by_email |
| `gc_labels` | Every non-preferred label, per language | concept_id, label, language, kind (`alt` / `hidden` for misspellings and old names / `acronym` / `discouraged` = do-not-use), status |
| `gc_relations` | broader / related between concepts; **polyhierarchy allowed** (several broader), narrower derived | concept_id, related_concept_id, kind |
| `gc_collections` + `gc_collection_members` | Curated subsets without touching the hierarchy ("PRMS reporting terms", "MEL phase: Design", "climate adaptation") | code, label, ordered; concept_id, position |
| `gc_mappings` | Links to external vocabularies, **with SSSOM-style provenance** | concept_id, target_scheme (`agrovoc`, `ipcc`, `oecd-dac`, `prms`…), target_uri, target_label, match (`exact`/`close`/`broad`/`narrow`/`related`; `close` by default because `exactMatch` is transitive), justification (manual / lexical / ai_suggested), confidence, author_email, reviewed_by_email, mapped_at, status |
| `gc_icons` | Icon register (priority low, per CGIAR) | concept_id, icon_status, file_name, file_format, file_url, designer, designer_country, year_created, rights_and_licence, alt_text |
| `gc_lists` | Controlled lists (status, function, phase, term_type, derivation, language, icon_status, icon_format) | list_code, value, label, sort, is_active |
| `gc_history` | Append-only change log | concept_id, action, changes (JSON from/to), changed_by_email, changed_at |
| `gc_proposals` | Change requests (governance) | type (new/edit/merge/deprecate), concept_id?, payload (JSON), rationale, proposer_email, state (submitted/screening/validation/published/rejected), decision_note, decided_by_email, timestamps |
| `gc_releases` | Released versions of a scheme | scheme_id, version (semver), released_at, notes, snapshot (JSON/Turtle), license |

- Who edited is stored as **email text** (not a user id), so the module needs no relation — not
  even a logical one — with `users`.
- `term_id` is kept from the Lexicon file when it is unique; the data-quality sheet shows 13 IDs
  repeated or missing, so the import flags them and assigns new ones instead of guessing.

### D2b. Scheme as a first-class object
`gc_schemes` carries its own metadata record (title, publisher, creator, license, issued, modified,
version) and its own URI, as FAIRsFAIR and the *Ten Simple Rules for making a vocabulary FAIR*
require; each release gets its own version IRI. It is also what lets the climate-change-adaptation
taxonomy (the Build Brief's worked case) live as a second scheme mapped to MELIAF instead of being
merged into it.

### D3. Persistent identifiers and content negotiation
- URI pattern `https://clarisa.cgiar.org/concepts/{scheme}/{term_id}` (e.g. `…/concepts/meliaf/2374`)
  and scheme URI `https://clarisa.cgiar.org/concepts/meliaf`. `term_id` never changes; deprecated
  concepts keep resolving.
- The front route `concepts/:scheme/:termId` renders the human page. The API
  `GET api/global-concepts/{scheme}/concepts/{termId}` answers JSON by default and Turtle / JSON-LD
  with `Accept: text/turtle` / `application/ld+json` or `?format=`.
- *Open*: whether CGIAR wants a `w3id.org` or DOI (per released version) on top — cheap to add later
  because the URI is already stable.

### D4. Editorial model
Status `draft | in_review | approved | deprecated` (list-driven). Only `approved` and `deprecated`
are public. Deprecation requires nothing, allows a `replaced_by` that must be an approved concept.
Each approved edit of `definition` or `preferred_label` bumps `version` (minor). A **release**
freezes the scheme at a semantic version with the change log since the previous release.

### D5. Governance as data, not hard-coded roles
`gc_proposals` stores the request and its state; transitions are admin actions logged in
`gc_history`. The step names follow the Build Brief (screening by CoPs/domain champions, PPT
secretariat, PRM Steering Group validation by no objection) but who can move a step is a
permission, so Rabat's decision is configuration, not code. A proposal accepted into `published`
applies its payload in the same transaction.

### D6. Exports
`json` (API shape), `csv` (RFC 4180, BOM, formula guard), `skos` Turtle and `jsonld`, for the whole
scheme or a release. SKOS mapping: `skos:ConceptScheme`, `skos:Concept`, `prefLabel`/`altLabel`/
`hiddenLabel` with language tags, `definition`, `scopeNote`, `example`, `editorialNote` (notes are
**not** published), `broader`/`narrower`/`related`, `exactMatch`/`closeMatch`/…, `dcterms:source`,
`dcterms:created`/`modified`, `owl:deprecated` + `dcterms:isReplacedBy`, `owl:versionInfo`,
`dcterms:license` (CC BY 4.0 unless Group 4 decides otherwise). Reuses the helpers written for the
glossary export.

### D7. MCP inside the NestJS server
`POST/GET api/global-concepts/mcp` with `@modelcontextprotocol/sdk` Streamable HTTP transport,
stateless. Tools: `search_concepts(query, filters)`, `get_concept(term_id)`,
`suggest_concepts_for_text(text)` (lexical + optional semantic match, returns official labels and
definitions), `list_releases()`. Resources: the scheme as SKOS. Read-only and public like the rest
of the public read; a `propose_concept` tool is added only if Group 4 wants AI-submitted proposals
(they would still go through the human workflow). No new server or infrastructure.

### D8. AI assistance (OpenAI), opt-in and server-side
- Key in `OPENAI_API_KEY`; feature switch `GLOBAL_CONCEPTS_AI_ENABLED`; every call from the back.
- Features: import column mapping (headers + 5 sample rows → schema fields, editor confirms),
  near-duplicate detection (embeddings), semantic search fallback, draft `scope_note` /
  `example_of_use` / `short_definition` for editors, AGROVOC alignment suggestions (candidate list
  from AGROVOC's API, the model ranks), text alignment for `suggest_concepts_for_text`.
- Guardrails: a suggestion is stored as a suggestion, never published; AI-originated fields carry
  `origin = ai_generated` so the brief's "every term keeps its original source" holds; no user text
  is persisted by the text-alignment tool (answers the use-case open question "is uploaded text
  retained?").

### D10. Quality gate
Deterministic checks on import and before every release, blocking the release when they fail: one
preferred label per language (SKOS S14), no overlap between preferred/alternative/hidden labels
(S13), no concept both related to and an ancestor of another (S27), no cycles in broader, required
definition, deprecated concepts carry a replacement or a history note, controlled-list values only,
valid language tags and URLs. Findings shown as a quality report (qSKOS categories). The current
Lexicon file already trips several (13 duplicated/missing IDs, 10 repeated labels, 23 spellings of
function).

### D11. Change feed for consumers
`GET …/changes?since=` (and ETag/`Last-Modified` on reads) so PRMS, the Hub and AI assistants sync
incrementally instead of downloading everything; webhooks are a later step on the same feed.

### D12. Rights of external sources
The scheme is published under CC BY 4.0 (proposed), but external definitions keep their own terms:
IPCC glossary text needs IPCC permission, AGROVOC is CC BY IGO 3.0 with attribution, OECD content
is OECD-copyright. The module stores the **link and citation** of external definitions and a
`rights_note`, never republishes their text by default.

### D13. Releases as immutable files
A release writes its JSON, CSV, Turtle and JSON-LD once and serves them from a versioned path
(`…/releases/1.0.0/meliaf.ttl`), so "published at a stable address, versioned, time-stamped,
licensed and citable" holds even while the live scheme keeps changing. A DOI per release (Zenodo)
is optional on top.

### D14. Labels are per language from day one
The preferred label is also a row of `gc_labels` (`kind = pref`, one per language, SKOS S14), so a
concept can publish `prefLabel@en` and `prefLabel@fr` without schema changes. English ships
complete; French (Rabat is francophone) is machine-suggested and flagged unvalidated. Label rows
carry their own status, which is what the text-alignment use case needs to say "do not use this
label, use that one".

### D15. Few real columns + one JSON column for the long tail
The ~10 fields that are filtered or searched are real columns; the rest of the 28 plus any field
defined later live in a JSON `extra` column driven by a field-definition list, so "add fields
without rebuilding" holds without an EAV model.

### D16. Version pinning, diff and reconciliation
`?version=1.0.0` pins any read to a release; `GET …/diff?from=1.0.0&to=1.1.0` returns what was
added, changed and deprecated, so consumers know how to sync. An OpenRefine-compatible
reconciliation endpoint lets anyone match a spreadsheet column against the taxonomy with a free
desktop tool (post-core if time is short).

### D17. One API key per consuming system
Consumers that integrate (PRMS, the Hub, AI assistants) use a CLARISA API key; the existing usage
log then proves "retrieved by another system" and seeds the 2028 usage-convergence evidence. Public
anonymous reads stay open. (This is the only optional write to a shared table, `api_key_usage_logs`,
and it happens only when a caller sends a key.)

### D9. Reversibility
- `GLOBAL_CONCEPTS_ENABLED=false` hides the menu, the public page and returns 404 on the routes.
- One migration owns all tables; its `down` drops them and deletes the permission rows. No other
  table is altered.

## Risks / Trade-offs

- **Time**: 7 working days to production including review. → MVP cut below; the rest is released
  after Rabat on the same design.
- **Content quality** (duplicate IDs, 23 spellings of function, phase in the parent column): the
  import reports them instead of silently fixing them. → Data-quality report in the wizard.
- **AI cost and privacy**: bounded (≈500 terms; embeddings cost cents) and opt-in; no draft text
  stored. → Documented in the proposal to CGIAR.
- **New dependencies** (`@modelcontextprotocol/sdk`, `openai`): lockfile discipline and pinned
  versions.
- **URI choice** is hard to change once cited. → Decide the domain/path before the first release.
- **Deep links on production answer HTTP 404 at the CDN** (known infra issue, S3 + CloudFront): the
  page renders but a crawler reads 404. → Ask infra to fix the SPA fallback before Rabat; the RDF
  path is served by the API, so machines are not affected.

## Migration Plan

1. `feature → dev-v2`: migrations on clarisatest, seed of lists, import the Lexicon file as test
   data, demo rehearsal.
2. `feature → staging → main` after the checklist and demo are validated; production gets empty
   tables + lists.
3. Content loaded by the MELIAF team (import wizard) before 6-oct.
4. Rollback: switch off; if cancelled, run the module migration `down`.

## Open Questions

1. Public or internal? (use case 2 asks it). The design allows both: public read on, or only for
   signed-in users.
2. URI domain: `clarisa.cgiar.org/concepts/…` vs `w3id.org/cgiar/meliaf/…`.
3. License of the published scheme (CC BY 4.0 proposed).
4. Who holds each governance step in production (decided in Rabat), and the length of the no-objection window.
5. Whether the existing glossary later becomes a scheme inside Global Concepts.
6. Languages beyond English (FR/ES) and who approves translations.
7. Whether to register the scheme in BARTOC and AgroPortal once released.
