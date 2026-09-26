## Why

CGIAR is deciding **where the MELIAF taxonomy will live**. Group 4 of the MELIAF Project ("Bringing
the MELIAF taxonomy to life") builds it at the Rabat buildshop, 6–8 October 2026, and Marissa Van
Epp is comparing three hosts with a capability checklist: Acquia DAM, Microsoft Fabric and CLARISA
(email *"Rabat Convening prep: Tool capability checklist for Taxonomy hosting"*, 2026-09-24; answer
requested by 2026-09-30).

The stakes for CLARISA are explicit. The glossary CLARISA publishes today is, in CGIAR's own words,
*"a pragmatic interim solution … Once the Lexicon MELIAF glossary becomes operational, it will
replace this interim glossary"* (Nicoleta Trifa, 2026-08-04, SR-159053). If the taxonomy is hosted
elsewhere, CLARISA loses the topic; if CLARISA hosts it, the taxonomy becomes the reference that
PRMS, the MELIAF Hub and CGIAR's AI assistants read from.

The existing glossary cannot simply grow into it. It is PRMS's glossary: 81 performance-management
terms versioned by portfolio, consumed as-is by PRMS and by the public glossary page. The MELIAF
taxonomy is a different object — ~500 terms, a 28-field SKOS-aligned schema, an icon register,
broader/narrower/related relations, editorial status, a change log, a governance workflow and
mappings to AGROVOC and the IPCC glossary (Build Brief Topic 4 v1, 2026-09-25; data schema template
v0.1; use cases v0; capability checklist v3). Bending the glossary to that shape would change what
PRMS reads today and mix two vocabularies with different owners and rules.

## What Changes

- A new, **fully decoupled** CLARISA module, **Global Concepts**, that implements the MELIAF term
  register as specified by Group 4:
  - its own tables — concepts, labels, relations, external mappings, icons, change log, change
    proposals, released versions and its own controlled lists — with **no foreign key to any
    existing table** and no read of portfolios, glossary or any PRMS data;
  - contact points with existing CLARISA are listed in design.md (*Audit corrections*, item 3): the
    admin permission rows, the optional use of platform API keys (read `api_keys`, write
    `api_key_usage_logs`, four new scopes), the generalised Excel parser and the email service — no
    foreign key in any direction.
- **Public read**, anonymous and cacheable: list, search (label, alternative labels, partial words),
  one concept, its history, released versions, and exports in **JSON, CSV, SKOS Turtle and
  JSON-LD**. Every concept has a persistent URI that resolves to a human page or to RDF by content
  negotiation.
- **Admin panel section "Global Concepts"**: create, edit, deprecate (never delete), editorial
  status draft → in review → approved → deprecated with `replaced_by`, relations and external
  mappings editor, controlled lists, bulk import reusing the CLARISA Excel wizard, and a queue of
  change proposals.
- **Change proposals**: anyone signed in can propose a new concept, an edit, a merge or a
  deprecation; the proposal carries its own lifecycle (submitted → screening → validation → published
  | rejected) so the governance model agreed in Rabat can be shown working end to end.
- **Released versions**: publishing a version freezes a snapshot of the scheme (version number,
  date, change log since the previous one, license), so a citation points to a specific version.
- **MCP endpoint** served by the same back end (Streamable HTTP) with read tools — search, get,
  suggest terms for a text — so AI assistants answer with the official definition.
- **AI assistance (OpenAI)**, off by default and behind a server-side key: import column mapping,
  near-duplicate detection, semantic search, draft scope notes/examples for editors to review, and
  alignment suggestions to AGROVOC. AI output is always a suggestion an editor accepts; nothing is
  published by a model.
- **Public page "Global Concepts"** on the CLARISA landing site, with search, filters by MELIAF
  function/phase/type, the concept page and download links.
- **Three doors for requests**: a public request form (email + verification link), platforms with
  their CLARISA API key (scopes read / request / write / review, write and review limited to the
  concept group the platform owns), and signed-in CLARISA users. Requests follow the Partner
  Requests pattern and carry an advisory AI recommendation.
- **Reversible by design**: a feature switch hides the section and its routes; a single migration
  `down` drops every table of the module and the permission rows.

Nothing in the existing glossary, its endpoints or its page changes. **No breaking change.**

## Capabilities

### New Capabilities
- `global-concepts-register`: the concept data model (the 28 fields of the schema template),
  controlled lists, persistent identifiers and the public read API.
- `global-concepts-editorial`: editorial status, deprecation with replacement, change log and
  released versions.
- `global-concepts-governance`: change proposals and their lifecycle.
- `global-concepts-exchange`: exports (JSON, CSV, SKOS Turtle, JSON-LD), content negotiation,
  external mappings and bulk import.
- `global-concepts-ai`: the MCP endpoint and the opt-in AI assistance.

### Modified Capabilities
<!-- None. The glossary and every existing capability stay untouched. -->

## Impact

- **Back (`clarisa-back`)**: new `src/api/global-concepts/**` module (entities, repositories,
  services, public + admin controllers, MCP controller), registered in `src/api/api.routes.ts` and
  `src/api/api.module.ts`; new public paths added to `src/shared/swagger/public-endpoints.ts`; new
  migrations creating the module tables and seeding the `/api/global-concepts/admin` permission.
- **Dependencies**: `@modelcontextprotocol/sdk` (MCP) and `openai` (AI assistance) —
  `package.json` **and** `package-lock.json` updated together (a lock out of sync broke `npm ci`
  before).
- **Config**: `OPENAI_API_KEY`, `GLOBAL_CONCEPTS_ENABLED`, `GLOBAL_CONCEPTS_AI_ENABLED` in
  `.env.example` and `app-config.ts`. The key never reaches the browser.
- **Front (`clarisa-front`)**: new admin page under `clarisa-panel/manage/global-concepts`, a menu
  entry in `admin-nav.ts`, a public page under `landing-page/global-concepts` and a root redirect
  for concept URIs; the Excel parser is generalised so both the glossary and the new module use it.
- **Docs**: a "Global Concepts" group in `assets/api-reference/catalog.json`.
- **Data**: new tables only. Production gets empty tables plus a seed of controlled lists; content
  is loaded by the MELIAF team.
- **Out of scope**: migrating or replacing the existing glossary, syncing with PRMS or portfolios,
  term-by-term content work (Group 4 does it after Rabat), usage analytics per viewer, the PDF
  highlighter and the web pop-up widget (possible consumers, not part of this change).
