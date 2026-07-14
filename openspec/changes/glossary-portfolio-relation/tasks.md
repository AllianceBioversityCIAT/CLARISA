# Tasks: glossary-portfolio-relation

## 1. Data model (clarisa-back)

- [x] 1.1 Create `GlossaryPortfolio` entity (`src/api/glossary/entities/glossary-portfolio.entity.ts`, table `glossary_portfolios`) following the `CountryRegion` pattern: `id`, `glossary_id`, `portfolio_id`, `ManyToOne` objects, embedded `AuditableEntity`
- [x] 1.2 Add `@OneToMany` `glossary_portfolio_array` to `Glossary` and the mirror relation to `Portfolio`
- [x] 1.3 Verify entity discovery only — no module wiring needed: `GlossaryModule` uses a custom `GlossaryRepository(DataSource)` provider (no `forFeature`), and entities load via the `ormconfig.ts` glob + `autoLoadEntities` in `app.module.ts`

## 2. Migration (ORM API, cloud-only — NEVER run locally)

- [x] 2.1 Write migration `AddGlossaryPortfoliosTable` in `migrations/` using the TypeORM schema-builder API (`queryRunner.createTable(new Table({...}))` + `createForeignKeys`): auditable columns, indexes on both FKs, `UNIQUE (glossary_id, portfolio_id)`, FKs (`glossary_id` → `glossary.id` ON DELETE CASCADE; `portfolio_id` → `portfolios.id`); set `engine: 'InnoDB'` explicitly and mirror the sibling tables' timestamp(6)/tinyint(1) defaults exactly
- [x] 2.2 Add backfill in the same `up()` (single allowed raw query — TypeORM has no native INSERT…SELECT): `INSERT … SELECT g.id, 2, g.is_active, COALESCE(g.created_by, 3043) FROM glossary g`
- [x] 2.3 Write `down()` with `queryRunner.dropTable('glossary_portfolios')`
- [x] 2.4 Audit the migration statement-by-statement against the real `glossary`/`portfolios` schemas and the auditable-columns pattern (do NOT execute it — cloud-only rule)

## 3. API exposure

- [x] 3.1 Load the portfolio relation in `GlossaryService.findAll` and `findOne` — `findOne` switches from `findOneBy({ id })` to `findOne({ where: { id }, relations: … })` (`findOneBy` does not accept relations)
- [x] 3.2 Expose `portfolios: [{ id, name, acronym }]` in the serialized glossary response, filtering to active associations at serialization time, keeping the raw relation `@Exclude`d and all existing fields unchanged; verify the serialized output does NOT leak the full `Portfolio` entity or its relation arrays
- [x] 3.3 ~~Update Swagger decorators/description of the glossary endpoints~~ DROPPED: the branch base (`staging`) has no Swagger decorators on this controller (they exist only on dev-v2); re-add when the feature reaches a base with Swagger

## 4. Validation & quality gate

- [x] 4.1 Update/extend `glossary.service.spec.ts` and `glossary.controller.spec.ts` to cover the `portfolios` exposure (multi-portfolio term, term with no associations)
- [x] 4.2 Run `npm test`, `npm run build` and lint in `clarisa-back` — all green
- [x] 4.3 Final self-audit against the spec scenarios (multi-portfolio, unique constraint, backfill mirrors `is_active`, non-breaking response) before marking the change ready
