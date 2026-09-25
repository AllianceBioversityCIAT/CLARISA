## 0. Decisions before code (Yeck + Héctor)

- [ ] 0.1 Go / no-go for building the module (this proposal) — Héctor's OK; Idea in CLAR + Epic in CLR.
- [ ] 0.2 URI domain and path (`clarisa.cgiar.org/concepts/meliaf/{term_id}` proposed).
- [ ] 0.3 Public or signed-in read for the pilot (public proposed).
- [ ] 0.4 License of the published scheme (CC BY 4.0 proposed).
- [ ] 0.5 OpenAI key ownership, monthly cap and where it is stored (server env only).
- [ ] 0.6 Rabat demo script and who plays each governance role in the rehearsal.

## 1. Rabat core — back (`clarisa-back/src/api/global-concepts`)

- [ ] 1.1 Migration: all `gc_` tables (schemes, concepts, labels, relations, collections, mappings,
      icons, lists, history, proposals, releases), idempotent, no foreign keys outside the module;
      seed of controlled lists and the `meliaf` scheme.
- [ ] 1.2 Migration: `/api/global-concepts/admin` permission copied from the glossary admin grant.
- [ ] 1.3 Entities, repositories, module registered in `api.routes.ts` / `api.module.ts`; feature
      switch `GLOBAL_CONCEPTS_ENABLED`.
- [ ] 1.4 Public read: list/filter/search/get, history, releases, change feed; only approved +
      deprecated.
- [ ] 1.5 Admin: CRUD, labels, relations (polyhierarchy), mappings, collections, editorial status
      with replacement, lists.
- [ ] 1.6 Change log written in the same transaction as every write.
- [ ] 1.7 Proposals: submit (any signed-in user), move steps, publish applies payload, reject.
- [ ] 1.8 Exports JSON / CSV / Turtle / JSON-LD (reuse the helpers from the glossary export) and
      content negotiation on the concept endpoint.
- [ ] 1.9 Quality gate (S13, S14, S27, cycles, required definition) + releases as immutable files.
- [ ] 1.10 Bulk import preview/import (generic version of the glossary plan builder) with the
      data-quality report.
- [ ] 1.11 Swagger: public paths in `PUBLIC_OPENAPI_PATHS`; group in the API reference catalog.
- [ ] 1.12 Unit tests per service + DTO validation specs through the real `ValidationPipe`.

## 2. Rabat core — front (`clarisa-front`)

- [ ] 2.1 Admin section "Global Concepts": table with filters and sorting, concept form (core fields
      first, advanced fields collapsed), relations and mappings editors, status actions.
- [ ] 2.2 Proposals queue with step actions and decision notes; "Propose a concept" for any
      signed-in user.
- [ ] 2.3 Import wizard: generalise the glossary parser (`HEADER_WORDS`/`detectColumns` as
      parameters) and reuse the 4-step wizard.
- [ ] 2.4 Public page "Global Concepts": search, facets, concept page with URI, history, relations,
      mappings, downloads; root route `concepts/:scheme/:termId`.
- [ ] 2.5 Menu entries (admin-nav, landing navbar/footer); revamp tokens only, phone + desktop.
- [ ] 2.6 Unit tests; screenshots phone/desktop with self-critique.

## 3. Rabat core — MCP and AI

- [ ] 3.1 MCP endpoint (stateless Streamable HTTP): `search_concepts`, `get_concept`,
      `suggest_concepts_for_text`, `list_releases`; `package.json` + lock updated together.
- [ ] 3.2 AI switch + server-side OpenAI client with a spend cap.
- [ ] 3.3 AI import column mapping (headers + 5 rows → field + confidence), editor confirms.
- [ ] 3.4 Embeddings for semantic search and duplicate detection on proposals and import.
- [ ] 3.5 Demo: an AI assistant (Claude/ChatGPT) connected to the MCP answering with official terms.

## 4. Release and rehearsal

- [ ] 4.1 `global-concepts → dev-v2`; run migrations on clarisatest; import the Lexicon file as test
      data; fix quality-report findings with the MELIAF team.
- [ ] 4.2 Second pass antibugs (adversarial review of the diff) + full gate (back, front, build).
- [ ] 4.3 Rehearse the demo end to end on clarisatest.
- [ ] 4.4 `global-concepts → staging → main` (PR, merge commit), production migrations, smoke test
      against `api.clarisa.cgiar.org`; publish release 1.0.0 once content is approved.
- [ ] 4.5 Jira: Idea (CLAR) + Epic/Stories (CLR) documented per `docs-jira-pr.md`.

## 5. After Rabat (same design)

- [ ] 5.1 Icon register UI + alt text (store files in DAM, keep reference/rights here).
- [ ] 5.2 AGROVOC alignment suggestions with SSSOM provenance; local mirror of used AGROVOC concepts.
- [ ] 5.3 Webhooks on the change feed; embeddable pop-up widget; text-alignment endpoint for PRMS.
- [ ] 5.4 FR/ES labels (reuse-first, machine translation flagged for review).
- [ ] 5.5 Usage analytics (searches, zero-result searches as candidate terms).
- [ ] 5.6 Registration in BARTOC / AgroPortal; DOI per release.
- [ ] 5.7 Decide whether the PRMS glossary becomes a scheme inside Global Concepts.
