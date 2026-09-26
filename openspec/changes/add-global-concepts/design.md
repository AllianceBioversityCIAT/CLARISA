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

## Audit corrections (2026-09-25) — these supersede anything below that disagrees

An adversarial compliance audit against every source (brief, use cases, summary table, schema
workbook, live checklist, emails and Yeck's requirements) found gaps and self-contradictions.
Resolved here so the rest of the document can be read against one reference:

1. **Persistent URI** — `clarisa.cgiar.org` is S3 + CloudFront: it cannot negotiate on `Accept` and
   answers deep links with HTTP 404 today. The concept URI is therefore served by the **API host**,
   `https://api.clarisa.cgiar.org/concepts/{scheme}/{term_id}` (redirects browsers to the human page
   with 303, returns Turtle/JSON-LD to machines), with `https://w3id.org/cgiar/{scheme}/{term_id}`
   as the proposed permanent alias. The schema template uses `taxonomy.cgiar.org/meliaf/…`: the
   domain is **Open Question 2**, decided with Group 4 before release 1.0.0.
2. **"Anyone in CGIAR can contribute"** — CLARISA's login only admits people who already have a
   CLARISA user (`auth.service.ts:39-46`). Requests therefore come through three doors, none of which
   changes the existing login: (a) a **public request form** in the module, identified by email with a
   one-time verification link and rate-limited; (b) **platforms with their API key** on behalf of their
   own signed-in users (PRMS, the Hub); (c) signed-in CLARISA users.
3. **Contact points with existing CLARISA** (the honest list): reads `users`/`permissions` through the
   existing guards; one row in `permissions` + grants in `role_permission`; if platform keys are used,
   reads `api_keys` and writes `api_key_usage_logs`, and four scopes are added to the API-keys scope
   constant and admin; the glossary's Excel parser is generalised (behaviour unchanged, covered by its
   tests); outcome emails use the existing email service. No foreign key in any direction. The module
   migration `down` drops every `gc_` table, the permission rows and strips the four scopes from keys.
4. **One data model** — the reconciled table list is D2 as amended by: `gc_schemes` (+ `owner_platform`,
   `governance_description`, `license`, `default_language`; `code` immutable);
   `gc_releases` (+ `release_uri`, `previous_release_id`); `gc_concepts` (+ `extra` JSON, `rights_note`,
   `validated_by` as a JSON list, `replaced_by` named as in the schema); preferred labels live in
   `gc_concepts.preferred_label` for the scheme's default language **and** as `gc_labels` rows
   (`kind = pref`) for other languages; `gc_proposals` (+ `type` new/edit/merge/deprecate/promote,
   `origin_platform`, `acting_user_email`, `external_request_id`, `callback_url`, `ai_recommendation`,
   `reviewer_comments`, `no_objection_until`). Real columns: every scalar field of the schema; `extra`
   only for fields added later (D15 reads accordingly).
5. **One request state machine** — `submitted → in_review → (changes_requested ↔ in_review) →
   validation → approved | rejected`. `validation` is the no-objection step of the PRM Steering Group
   (`no_objection_until`, restarted every time a request re-enters it); when no validator is
   configured for a scheme the step is skipped; `approved` applies the payload in the same transaction (a merge moves labels, relations
   and mappings to the surviving concept and deprecates the other with it as replacement).
6. **Roles** — visitor, requester, reviewer (CoP / domain champion), admin-approver (PPT secretariat),
   plus configurable **validator** (PRM Steering Group, no-objection window) and **custodian /
   technical steward** of the published version. Who holds each is decided in Rabat.
7. **Governance travels with the data** — the scheme's `governance_description` is published in the
   scheme metadata and in every export; releases link to the previous one (`owl:priorVersion`).
8. **Deprecated URIs keep resolving** and show the replacement (no silent redirect).
9. **MCP tools** — `search_concepts`, `get_concept` (by `term_id` or exact label), `suggest_concepts_for_text`,
   `list_releases`; `propose_concept` exists only for callers with a key holding `global-concepts:request`.
10. **French** — the schema supports labels per language from day one; French labels for the Rabat
    demo are optional, machine-suggested and flagged unvalidated; full FR/ES is after Rabat.
11. **Text alignment** keeps no user text; phrases that matched nothing are only kept if the user
    ticks "suggest these as new terms", which files them as requests.
12. **Content timing** — production ships the structure plus the Lexicon terms loaded as **draft**;
    release 1.0.0 is published only if Group 4 approves content (the brief puts content work after
    Rabat). The Rabat demo publishes a small approved seed set, clearly labelled as a demo release.
13. **Brief's "~70% prototype"** — unknown owner (probably the Lexicon's or José Berenguer's). To be
    identified before Marissa's call, and the proposal positioned relative to it (Task 0.7).

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
| `gc_schemes` | A vocabulary (MELIAF first; room for domain taxonomies such as climate change adaptation) | id, code (`meliaf`, **immutable**), title, description, uri_base, default_language, license, publisher, governance_description, owner_platform?, next_term_id |
| `gc_concepts` | The term register (one row per concept) | id, scheme_id, **term_id** (external stable code, e.g. 2374; the URI is derived, never stored), preferred_label, language, definition, short_definition, scope_note, example_of_use, term_type, meliaf_function (JSON list), meliaf_phase_primary, meliaf_phase_also (JSON), source_citation, source_url, derivation, **origin** (lexicon/ai_generated/domain_expert/external_standard), status, version, date_created, date_modified, validated_by, date_validated, steward, replaced_by_concept_id, notes, is_active, created_by_email, updated_by_email |
| `gc_labels` | Every non-preferred label, per language | concept_id, label, language, kind (`alt` / `hidden` for misspellings and old names / `acronym` / `discouraged` = do-not-use), status |
| `gc_relations` | broader / related between concepts; **polyhierarchy allowed** (several broader), narrower derived | concept_id, related_concept_id, kind |
| `gc_collections` + `gc_collection_members` | Curated subsets without touching the hierarchy ("PRMS reporting terms", "MEL phase: Design", "climate adaptation") | scheme_id, code, label, ordered (unique `scheme_id, code`); concept_id (same scheme), position |
| `gc_mappings` | Links to external vocabularies, **with SSSOM-style provenance** | concept_id, target_scheme (`agrovoc`, `ipcc`, `oecd-dac`, `prms`…), target_uri, target_label, match (`exact`/`close`/`broad`/`narrow`/`related`; `close` by default because `exactMatch` is transitive), justification (manual / lexical / ai_suggested), confidence, author_email, reviewed_by_email, mapped_at, status |
| `gc_icons` | Icon register (priority low, per CGIAR), same field names as the schema's *Icon register* sheet | icon_id, concept_id (the sheet's term_id), icon_status, file_name, file_format, designer, designer_country, year_created, rights_and_licence, alt_text, file_link_primary, file_link_backup, date_added |
| `gc_lists` | Controlled lists (status, function, phase, term_type, derivation, language, icon_status, icon_format) | scheme_id? (null = shared by every scheme), list_code, value, label, sort, is_active |
| `gc_history` | Append-only change log; its auto-increment `id` is the cursor of the change feed | id, concept_id, action, changes (JSON from/to), changed_by_email, changed_at, tx_id (groups the rows of one merge/import), proposal_id?, release_id? |
| `gc_proposals` | Change requests (governance) | type (new/edit/merge/deprecate/promote), scheme_id, concept_id? (source), target_concept_id? (merge survivor / promote result), target_scheme_id? (promote), base_version?, access_token_hash (lets a public requester read and resubmit), payload (JSON), rationale, requester_email, origin (form/platform/clarisa_user), origin_platform?, external_request_id?, callback_url?, ai_recommendation (JSON)?, no_objection_until?, state (submitted/in_review/changes_requested/approved/rejected), decision_note, decided_by_email, timestamps |
| `gc_proposal_events` | State changes and comments of a proposal (a proposal for a *new* concept has no concept yet, so this cannot live in `gc_history`) | proposal_id, from_state, to_state, actor_email, note, at |
| `gc_email_verifications` | One-time links for the public request form | email, token_hash, proposal_draft (JSON), expires_at, used_at |
| `gc_releases` | Released versions of a scheme | scheme_id, version (semver), release_uri (stored, immutable), previous_release_id?, released_at, notes, snapshot (JSON/Turtle), license |
| `gc_outbox` | Emails and (later) callbacks written in the same transaction as the decision, delivered afterwards with retries | kind, payload (JSON), attempts, next_attempt_at, delivered_at |

- **Where each schema field lives**: the 25 scalar fields are columns of `gc_concepts` with the schema's
  own names; `alternative_labels` → `gc_labels` (kind `alt`); `broader_term` / `narrower_terms` /
  `related_terms` → `gc_relations` (narrower derived from broader); `maps_to_prms` /
  `maps_to_external` → `gc_mappings`; the eight lists of the *Lists* sheet (status, meliaf_function,
  meliaf_phase, term_type, derivation, language, icon_status, icon_format) → `gc_lists`. The export
  and the import wizard use the schema's field names, so the Excel round-trips.
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
- URI pattern `https://api.clarisa.cgiar.org/concepts/{scheme}/{term_id}` (e.g. `…/concepts/meliaf/2374`)
  and scheme URI `https://api.clarisa.cgiar.org/concepts/meliaf` (see *Audit corrections* 1; domain
  pending Group 4). `term_id` never changes; deprecated concepts keep resolving.
- The front route `concepts/:scheme/:termId` renders the human page. The API
  `GET api/global-concepts/{scheme}/concepts/{termId}` answers JSON by default and Turtle / JSON-LD
  with `Accept: text/turtle` / `application/ld+json` or `?format=`.
- *Open*: whether CGIAR wants a `w3id.org` or DOI (per released version) on top — cheap to add later
  because the URI is already stable.

### D4. Editorial model
Status `draft | in_review | approved | deprecated` (list-driven). Only `approved` and `deprecated`
are public. Deprecation requires **either** a `replaced_by` (an approved concept) **or** a written
reason, stored as a history note — the same rule the release gate checks, so the two never disagree.
Each approved edit of `definition` or `preferred_label` bumps `version` (minor). A **release**
freezes the scheme at a semantic version with the change log since the previous release.

### D5. Governance as data, not hard-coded roles
`gc_proposals` stores the request and its state; transitions are admin actions logged in
`gc_history`. The step names follow the Build Brief (screening by CoPs/domain champions, PPT
secretariat, PRM Steering Group validation by no objection) but who can move a step is a
permission, so Rabat's decision is configuration, not code. A proposal accepted into `published`
applies its payload in the same transaction.

### D5b. Roles and requests (the Partner Requests pattern)
- **Visitor** (anonymous): reads, searches and downloads what is published.
- **Requester** (through the public form with a verified email, a platform with its API key, or a
  signed-in CLARISA user — see *Audit corrections* 2): submits a *concept request* — new, edit or deprecate — with a rationale; cannot
  create or edit concepts directly; sees the state of their requests and is emailed the outcome.
- **Reviewer** (Community of Practice / domain expert, optional step): comments and recommends.
- **Admin / approver**: approves, requests changes or rejects, always with a justification; can also
  create and edit directly (initial load, quick fixes), and such writes are flagged
  `direct_edit` in the change log. "Admin" is **per scheme**: a platform key with the `write` scope is
  the admin of the scheme that platform owns, and nothing else.
- **AI recommendation**: on any request, "Get AI recommendation" checks duplicates, definition quality
  (circular, missing genus), source presence, list values and conflicts, and answers
  approve / needs changes / reject with reasons. Advisory only, stored with the request; a person
  always decides.

### D8b. Import matching: AI or manual, always editable
The import wizard keeps one selector per column. "Auto-match with AI" fills every selector with a
confidence badge; "Normalize with AI" proposes list values for free-text cells. The user can change
any selector by hand or skip AI entirely; with AI disabled the buttons are hidden and the wizard is
fully manual.

### D5c. Platforms integrate with their CLARISA API key
- Consuming platforms (PRMS, MELIAF Hub, others) authenticate with the **existing CLARISA API keys**
  (per platform, with scopes, environment and expiry; usage already logged). New scopes:
  `global-concepts:read`, `global-concepts:request`, `global-concepts:write`, `global-concepts:review`,
  enforced with the existing `@RequireApiKeyScope` + `CompositeAuthGuard`, as Partner Requests does
  (`partner-requests:create`).
- **Concept groups per platform**: a scheme can be owned by a platform (`gc_schemes.owner_platform`,
  text code, e.g. `prms`), with its own URIs (`/concepts/prms/{term_id}`), releases and governance.
  The global `meliaf` scheme is owned by MELIAF admins; **no platform writes to it directly** — it
  only submits requests. `write` and `review` scopes apply only to schemes the platform owns.
- Requests carry `origin_platform`, `acting_user_email` (the person behind the token),
  `external_request_id` (idempotency: a retry returns the same request) and an optional
  `callback_url` for the outcome (signed, retried). A `promote` request type moves a platform
  concept into the global scheme; the old one is mapped or deprecated pointing to it.
- Decoupling trade-off: this **reads** `api_keys` and **writes** `api_key_usage_logs` through the
  existing guard — no foreign key, but a contact point. Platform identity is stored as text, so no
  module table relates to `api_keys` or `mis`. Alternative (own tokens table) rejected as duplication.
- Rate limit per key on write/request endpoints; tokens are server-to-server only (never in a browser).
- Open: visibility of platform-owned schemes (public or owner + admins only); whether MELIAF also
  approves platform schemes; what happens to open requests when a key is revoked (they stay; callbacks
  stop).

### D6. Exports
`json` (API shape), `csv` (RFC 4180, BOM, formula guard), `skos` Turtle and `jsonld`, for the whole
scheme or a release. SKOS mapping: `skos:ConceptScheme`, `skos:Concept`, `prefLabel`/`altLabel`/
`hiddenLabel` with language tags, `definition`, `scopeNote`, `example` (the internal `notes` field is **never** exported), `broader`/`narrower`/`related`, `exactMatch`/`closeMatch`/…, `dcterms:source`,
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

### D15. Real columns for the schema, one JSON column for the long tail
Every scalar field of the schema template is a real column of `gc_concepts` (see D2); fields defined
**after** the schema is agreed live in a JSON `extra` column driven by a field-definition list, so
"add fields without rebuilding" holds without an EAV model.

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

## Validation pass (2026-09-25, Fable 5.1) — integrity rules the implementation MUST follow

A second, independent reading of the model looking for bugs, bad relations and flows that cannot
work. Each item is a rule the code enforces (and a test to write).

**Identity and uniqueness**
- V1. Unique keys: `gc_schemes(code)`, `gc_concepts(scheme_id, term_id)`, `gc_labels(concept_id,
  language, label)`, `gc_relations(concept_id, related_concept_id, kind)`, `gc_mappings(concept_id,
  target_uri, match)`, `gc_collection_members(collection_id, concept_id)`, `gc_lists(list_code, value)`,
  `gc_releases(scheme_id, version)`, `gc_proposals(origin_platform, external_request_id)`. Indexes on
  `gc_history(concept_id)`, `gc_proposal_events(proposal_id)`, `gc_concepts(scheme_id, status)`,
  `gc_labels(label)`.
- V2. `term_id` is unique **per scheme**, not globally (PRMS and MELIAF may both have 2374). Every
  internal reference between module tables (`replaced_by`, relations, mappings to another scheme's
  concept, collection members) uses the internal `gc_concepts.id`; `term_id` and the URI appear only
  at the API/export boundary. The schema field `replaced_by` is therefore rendered from the internal
  id at export time.
- V3. New `term_id`s are assigned from a per-scheme counter read and written under a row lock on
  `gc_schemes` inside the import transaction, never from `MAX(term_id)+1` without a lock.

**Labels**
- V4. `gc_concepts.preferred_label` is the preferred label in the scheme's default language and is
  the only place it lives; `gc_labels(kind = pref)` is allowed only for other languages. A `pref`
  row in the default language is rejected (otherwise S14 is violated inside one concept).
- V5. `gc_labels.kind ∈ {alt, hidden, acronym}` and `status ∈ {active, discouraged}`; `discouraged`
  is a status, not a kind (the two were redundant).
- V6. A concept has exactly one editorial `status`; there is **no** `is_active` flag (a second
  on/off switch next to draft/approved/deprecated is ambiguous). Retracting a published concept is
  `deprecated`; a mistake published too early is corrected by an edit, and the history says so.

**Relations**
- V7. Both concepts of a `gc_relations` row belong to the **same scheme**; a link to a concept of
  another scheme is a `gc_mappings` row (`broadMatch`/`narrowMatch`/`relatedMatch`). This keeps
  cycle checks and per-scheme exports self-contained.
- V8. `related` is symmetric: stored once with `concept_id < related_concept_id` and queried in
  both directions. `broader` is directed; `narrower` is never stored.
- V9. Checked **at write time**, not only at release: no self-relation, no `broader` cycle
  (walk ancestors before insert), no `related` between a concept and one of its ancestors or
  descendants (S27).
- V10. Deprecating a concept keeps its relations; the quality report warns about approved concepts
  whose every `broader` is deprecated, and the public hierarchy hides deprecated parents.

**Deprecation and merge**
- V11. `replaced_by` must point to an `approved` concept at write time and must not create a chain
  cycle (walk the replacement chain before insert). Readers follow the chain to the current concept.
- V12. Merging B into A: labels of B become `alt` labels of A **after** deduplicating against A's
  labels case-insensitively per language (S13/S14); relations of B move to A dropping self-relations
  and duplicates; mappings move with deduplication; B becomes `deprecated` with `replaced_by = A`.
  All in one transaction, all logged for both concepts.
- V13. `promote` keeps the platform concept `approved` with an `exactMatch` mapping to the new global
  concept by default (the platform keeps its own URI); deprecating it with `replaced_by` is a choice
  made in the request, not the default.

**Requests**
- V14. One person field: `requester_email` (the human), plus `origin` and `origin_platform`. The
  earlier `proposer_email` / `acting_user_email` pair is gone.
- V15. Idempotency: a retry with the same `(origin_platform, external_request_id)` returns the same
  request; the same id with a **different** payload answers 409.
- V16. `edit` requests store `base_version` of the concept; if the concept changed before approval,
  approving is refused with 409 and the request goes back to `in_review` with a note. Payloads are
  validated against the lists at submission **and** at approval (lists may have changed).
- V17. The public form creates the request only after the email link is used; the draft lives in
  `gc_email_verifications` until then (expires in 24 h). Rate limit per email and per IP.
- V18. Callbacks need a shared secret to sign, and CLARISA only stores the **hash** of an API key, so
  the key cannot sign. For Rabat the outcome is **polled** (`GET …/requests/{id}` with the key) and
  emailed; signed callbacks come after Rabat with a per-platform secret stored encrypted in a module
  table (`gc_platform_settings`).
- V19. Platform identity on a key is the MIS acronym (`ApiKeyAuthContext.mis.acronym`);
  `gc_schemes.owner_platform` stores it lower-cased as text. Renaming a MIS breaks ownership until an
  admin updates the scheme; when MIS is retired in favour of key-only identity, the code moves to a
  key attribute. Documented, not hidden.
- V20. Step permissions are path prefixes the substring guard can tell apart:
  `/api/global-concepts/admin` (full), `/api/global-concepts/admin/requests/review`,
  `/api/global-concepts/admin/requests/validate`. A holder of the full prefix matches every step.

**Found by DeepSeek (judge) and confirmed against the model**
- V26. The state machine has a `validation` step with a restartable no-objection window (a validator
  is configured per scheme; absent → skipped).
- V27. Every decision is `UPDATE gc_proposals SET state=? WHERE id=? AND state=?`; zero affected rows
  → 409. Two admins cannot both decide the same request.
- V28. `merge` and `promote` carry explicit `concept_id` (source), `target_concept_id` and, for
  promote, `target_scheme_id`; approvers are authorised against **both** schemes involved.
- V29. A public requester gets a per-request access token in the verification email: it reads the
  status and resubmits after `changes_requested`. Without it the public form would be write-only.
- V30. Emails (and later callbacks) go through `gc_outbox`, written in the decision transaction and
  delivered afterwards with retries — a crash between commit and email cannot lose the outcome.
- V31. `gc_history` rows carry `tx_id`, `proposal_id?` and `release_id?`, so a merge can be
  reconstructed and a request can be traced to the release that shipped it (brief §5 "citable
  reference"). The change feed cursor is `gc_history.id`, never a timestamp (two rows can share a
  second).
- V32. `previous_release_id` lives on `gc_releases`, not on the scheme; `release_uri` is stored once
  and never recomputed; `gc_schemes.code` is immutable because it is part of every URI; the concept
  URI is derived from `uri_base + term_id` at read time, never stored (a stored copy goes stale).
- V33. `gc_schemes.default_language` exists (V4 depends on it). `gc_collections` and `gc_lists` are
  scoped by scheme (`scheme_id`; a null list scope means shared), and a collection only holds
  concepts of its own scheme.
- V34. SKOS export maps `acronym` labels to `skos:altLabel` and `discouraged` labels to
  `skos:hiddenLabel`; nothing stored is silently dropped.
- V35. `get_concept` by exact label returns **every** match (two schemes, or two concepts, may share a
  label); by `term_id` it requires the `scheme` argument. `list_releases(scheme)` likewise.
- V36. Deprecating a concept that is the `replaced_by` of others requires giving it a replacement
  itself, so no chain ends on a deprecated concept without continuation.
- V37. AI provenance is per field: `origin` is the concept's primary source; `ai_generated_fields`
  (JSON list) marks which fields a model drafted. Writing an AI scope note never rewrites the
  concept's `origin`.
- V38. `acting_user_email` sent by a platform is stored as **asserted**, shown as "PRMS on behalf of
  x (asserted by PRMS)", and never treated as an authenticated CLARISA identity.
- V39. A release snapshot is built inside one consistent-read transaction (InnoDB REPEATABLE READ),
  so an approval committed mid-way cannot leave a concept with new fields but old labels.
- V40. License is per scheme (`dcterms:license`) for original text; external definitions carry their
  own `dcterms:rights` from `rights_note` and are stored as citation + link, not text (D12).
- V41. Merge also moves collection memberships (deduplicated) and icons to the survivor, and re-points
  open requests of the merged concept to it; source preferred labels become `alt` labels.
- V42. Live reads are the default (PRMS wants the current definition); a consumer that must match a
  citation pins `?version=`. Stated, not hidden.
- V43. "No retention of user text" is precise: the alignment endpoint stores nothing; phrases the user
  explicitly ticks as "suggest as new terms" become requests and are stored as such.

**Implementation notes (2026-09-25)**
- V44. No new dependencies. The MCP endpoint is a hand-written stateless JSON-RPC handler (initialize,
  ping, tools/list, tools/call; notifications answered 202; GET/DELETE 405), and the OpenAI client is
  one `fetch` to Chat Completions with a strict JSON schema. Four read-only tools and three advisory
  calls do not justify `@modelcontextprotocol/sdk` or `openai` in a lockfile shared with the rest of
  CLARISA. Revisit if the MCP grows prompts, resources or sessions.
- V45. AI spend cap lives in `gc_ai_usage` (one row per UTC month, atomic upsert), checked before every
  call; `GLOBAL_CONCEPTS_AI_MONTHLY_CAP_USD` defaults to 10. Unknown models are priced at the most
  expensive known rate so the cap errs on the safe side. AI is on only when
  `GLOBAL_CONCEPTS_AI_ENABLED=true` **and** `OPENAI_API_KEY` is set; otherwise every AI route is 404.
- V46. Column matching resolves exact headers without the model and filters the model's answer to
  known fields, one column per field; list normalization accepts only values of the list. The
  request recommendation writes only `ai_recommendation` and never sends the requester's email.
- V47. Only platforms assert `requester_email` / `external_request_id`; the public form and signed-in
  users are always their verified identity (adversarial review of phase 2).

**Lists, versions, reads**
- V21. List values are immutable once used (add a new value and deactivate the old); only labels and
  order change. Concepts reference values by text, so a renamed value would orphan them.
- V22. Two version numbers, two meanings: `gc_concepts.version` (record revision, `owl:versionInfo`
  on the concept) and `gc_releases.version` (scheme release, `owl:versionInfo` on the scheme). New
  concepts start at 1.0; any approved change to a published field — labels in any language,
  definition, notes, relations, mappings, status — bumps the minor.
- V23. `?version=` pinning applies to get, list and export (served from the release snapshot); search
  and the change feed are live only.
- V24. `suggest_concepts_for_text` and the MCP tool are **POST** with the text in the body: the
  request-logging interceptor logs the URL, so a `GET ?text=` would retain user text in the logs.
- V25. Search is `LIKE`-based over preferred, alternative and hidden labels (500 terms; MySQL FULLTEXT
  ignores tokens under 3 characters such as "IA"); semantic search is the optional AI layer.

## Risks / Trade-offs

- **Time**: 6 working days to production including review (25-sep → 5-oct). → MVP cut below; the rest is released
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
2. URI domain: `api.clarisa.cgiar.org/concepts/…` (+ `w3id.org` alias) vs the template's `taxonomy.cgiar.org/meliaf/…`.
3. License of the published scheme (CC BY 4.0 proposed).
4. Who holds each governance step in production (decided in Rabat), and the length of the no-objection window.
5. Whether the existing glossary later becomes a scheme inside Global Concepts.
6. Languages beyond English (FR/ES) and who approves translations.
7. Whether to register the scheme in BARTOC and AgroPortal once released.
