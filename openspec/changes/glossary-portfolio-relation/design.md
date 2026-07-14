# Design: glossary-portfolio-relation

## Context

- `glossary` (`src/api/glossary/`) holds terms/definitions with no portfolio dimension. Entity uses class-transformer (`@Expose`/`@Exclude`) directly — no mapper class.
- `portfolios` (`src/api/portfolio/`) already exists with rows: 1 = CGIAR portfolio 2016-2021 (inactive), 2 = CGIAR portfolio 2022-2024, 3 = CGIAR portfolio 2025-2030, 4 = CGIAR general.
- The codebase already has an established join-table pattern: `country_regions` (`CountryRegion` entity) and `project_countries` (hand-written SQL migration `1759156284377-AddBilateralTable.ts`), both with explicit FK columns + `AuditableEntity` embedded fields + unique composite index.
- Operational constraint: **migrations are never executed from a local machine; they run only in the cloud during deployment.** Locally the migration file is only written and audited (the local DB is empty, so `migration:generate` diffing is not reliable anyway — the migration is written by hand).

## Goals / Non-Goals

**Goals:**
- A glossary term can belong to 1..N portfolios (many-to-many).
- Existing terms are backfilled to portfolio **id 2** (CGIAR portfolio 2022-2024) by the migration itself, atomically with the table creation.
- Glossary API responses additionally expose each term's portfolios without breaking existing consumers.

**Non-Goals:**
- No front-end changes (Glossary modal badge/filter is a follow-up change).
- No write API for managing associations (terms are managed via existing `PATCH /update`; association CRUD can come later when the panel needs it).
- No changes to `portfolios` data or schema.

## Decisions

1. **Join table with explicit entity (`GlossaryPortfolio`, table `glossary_portfolios`) instead of TypeORM `@ManyToMany`.**
   Rationale: matches the repo's existing pattern (`CountryRegion`), keeps auditable fields (`created_at`, `is_active`, `created_by`, …) on the association itself, and allows soft-delete of a single association. `@ManyToMany` with implicit table would not carry auditable fields.
   - Columns: `id` (bigint PK AI), `glossary_id` (bigint NOT NULL, FK → `glossary.id`, ON DELETE CASCADE), `portfolio_id` (bigint NOT NULL, FK → `portfolios.id`, ON DELETE NO ACTION), auditable fields.
   - `UNIQUE (glossary_id, portfolio_id)` + individual indexes on both FKs — same shape as `project_countries`.

2. **Migration written manually but using the TypeORM schema-builder API (ORM-only, per team recommendation — Juanda, 2026-07-14), not raw SQL DDL.**
   The file must be written by hand because `migration:generate` requires diffing against a DB with the real schema and the local DB is empty — but its *content* uses the ORM API: `queryRunner.createTable(new Table({...}))`, `queryRunner.createForeignKeys`, with the unique constraint and indexes declared in the `Table` definition.
   ⚠️ Note: all 28 existing migrations use raw generated SQL — this is the first ORM-API migration in the repo (accepted trade-off, team preference). To keep the table identical in shape to its siblings, the `Table` definition MUST set `engine: 'InnoDB'` explicitly and mirror the auditable column defaults exactly: `created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP(6)`, `updated_at timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`, `is_active tinyint(1) DEFAULT 1`.
   - `up`: create table via ORM API → FKs via ORM API → backfill. The backfill is the single raw query in the migration — `INSERT INTO glossary_portfolios (glossary_id, portfolio_id, is_active, created_by) SELECT g.id, 2, g.is_active, COALESCE(g.created_by, 3043) FROM glossary g;` — because TypeORM has no ORM-native cross-table `INSERT … SELECT`; this is standard practice for data backfills even in ORM-only codebases.
   - Backfill covers **all** existing glossary rows (active and inactive); the association mirrors each term's `is_active` so inactive terms do not gain active associations.
   - `created_by` is NOT NULL both in the auditable pattern and in the real `glossary` DDL (`FirstMigration`), so the `COALESCE(g.created_by, 3043)` fallback is purely defensive (kept in case prod data predates the constraint); `3043` is the system/admin user that owns the `portfolios` seed rows.
   - The FK to `portfolios.id` makes the backfill fail loudly if portfolio 2 does not exist in the target DB — intentional guard, no silent orphans.
   - `down`: `queryRunner.dropTable('glossary_portfolios')` (ORM API drops FKs/indexes with the table). No other table is touched, so rollback loses only the associations (acceptable: they are derivable/backfillable).

3. **Response exposure via relation load + class-transformer, no new mapper.**
   - `Glossary` gains `@OneToMany` `glossary_portfolio_array`; `Portfolio` gains the mirror `@OneToMany`.
   - `GlossaryService.findAll/findOne` load `glossary_portfolio_array.portfolio_object`. `findOne` must switch from `findOneBy({ id })` to `findOne({ where: { id }, relations: … })` — `findOneBy` does not accept relations.
   - The `is_active` filter on associations happens **post-load, at serialization** (the exposed `portfolios` field maps only active association rows): TypeORM `find()` where-conditions on relations filter parent rows, not loaded children. Table is tiny, so loading all associations and filtering in memory is fine.
   - The entity exposes a `portfolios` field in the JSON — array of `{ id, name, acronym }` — while the raw relation array stays `@Exclude`d. Additive and non-breaking: `term`, `definition` and existing fields are untouched.

4. **Branch/target:** work happens on `glossary-portfolio-relation`, created from `staging` (Yeck's convention: feature branches are ALWAYS created from `staging`, never from dev/dev-v2). Integration follows Yeck's flow from `staging`. Note: the base has no Swagger wiring, so the Swagger-decorator update was dropped (it only exists on dev-v2).

## Risks / Trade-offs

- [Backfill assumes portfolio id 2 is the correct owner for every existing term] → Confirmed against prod data by Yeck (2026-07-14); FK guard aborts the migration if id 2 is missing in another environment.
- [Terms created after deploy have no association unless the write path sets one] → Documented limitation of this change; association management UI/API is an explicit follow-up. Terms without associations still serialize `portfolios: []`.
- [Relation loading could slow `GET /glossary`] → Table is small (tens of rows); indexed FKs; acceptable.
- [Migration is never run locally] → Mitigated by a mandatory SQL audit task (up/down reviewed statement-by-statement against MySQL 8 syntax and the real schema) before the change is merged.

## Migration Plan

1. Merge to `dev-v2` → cloud deploy pipeline runs `npm run migration:execute` in the cloud environment.
2. Verify post-deploy: `glossary_portfolios` row count equals `glossary` row count; every row has `portfolio_id = 2`; `GET /api/glossary` returns `portfolios` for each term.
3. Rollback: `migration:revert` in the cloud (drops only the new table).

## Open Questions

- None blocking. (Front-end badge/filter and association-management endpoints intentionally deferred.)
