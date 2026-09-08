# Proposal: glossary-portfolio-relation

## Why

Glossary terms are currently global: the `glossary` table has no notion of which CGIAR portfolio (2016-2021, 2022-2024, 2025-2030, general) each term/definition belongs to. With the new 2025-2030 portfolio introducing its own terminology, consumers (CLARISA panel, PRMS, dashboards) need to know which portfolio(s) a term applies to — and a single term may apply to more than one portfolio at once.

## What Changes

- New join table `glossary_portfolios` (`glossary_id`, `portfolio_id`) establishing a many-to-many relation between `glossary` and `portfolios`.
- New TypeORM entity `GlossaryPortfolio` + relations wired into the existing `Glossary` and `Portfolio` entities.
- Hand-written TypeORM migration that:
  1. Creates `glossary_portfolios` with FKs to `glossary.id` and `portfolios.id`.
  2. Backfills every existing `glossary` row with `portfolio_id = 2` (CGIAR portfolio 2022-2024).
  3. Provides a correct `down()` that drops the table (no data loss outside the new table).
- `GET /api/glossary` (and `/dashboard`, `get/:id`) responses expose the portfolios of each term.
- **Constraint (operational):** the migration is NEVER executed locally — it only runs in the cloud as part of deployment. Locally it is only written and audited.

## Capabilities

### New Capabilities
- `glossary-portfolio-association`: a glossary term can be associated with one or more CGIAR portfolios; associations are stored in `glossary_portfolios`, backfilled to portfolio 2 for pre-existing terms, and exposed through the glossary API responses.

### Modified Capabilities

_None — no existing specs in `openspec/specs/` cover glossary behavior yet._

## Impact

- **DB:** new table `glossary_portfolios`; no changes to existing `glossary` / `portfolios` columns or data.
- **Back (`clarisa-back`):** `src/api/glossary/` (entity, module, service, controller responses), new entity file for the join table, `migrations/` (one new migration).
- **API consumers:** additive change — existing fields of the glossary response are untouched; a new `portfolios` field is added. Non-breaking.
- **Front:** out of scope for this change (badge/filter in the Glossary modal would be a follow-up).
