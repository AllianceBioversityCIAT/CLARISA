## Why

A glossary term can mean different things in different CGIAR portfolios: `Impact` is defined one
way for the 2022-2024 portfolio and another for 2025-2030. The data model already allows it — one
row per definition, each tagged with the portfolios it applies to — but the admin panel forbids it:
`create()` rejects any title that already exists (`findByTitle`, case-insensitive, **not** scoped by
portfolio and **not** filtered by `is_active`), so the only way to register a portfolio-specific
definition today is to write it straight into the database, which is what has been happening in
clarisatest.

Editing a shared term makes it worse: the panel overwrites the single row, so a correction meant for
2025-2030 silently rewrites what 2022-2024 readers see. There is also no way to see, from outside
the database, which rows were written by hand — the public endpoint exposes neither ids nor audit
fields.

## What Changes

- A term may exist **once per portfolio**. Uniqueness stops being "one row per title" and becomes
  "no two active rows share a title *and* a portfolio". Terms whose definition is the same across
  portfolios stay as one row with several portfolio tags — nothing is duplicated for its own sake.
- The admin panel can create a new version of an existing term for a portfolio that does not have
  one yet, instead of answering `409 Conflict`.
- Editing the definition of a term that spans several portfolios offers to **split** it: the edited
  portfolio(s) move to a new row with the new definition, the remaining ones keep the row and the
  definition they had. Applying the edit to every portfolio stays possible and stays the default.
- Bulk import stops collapsing same-titled rows into one arbitrary winner: rows are matched by
  title **and** portfolio.
- **BREAKING (public read):** `GET api/glossary` may return the same `term` more than once — one
  entry per portfolio version. Consumers that look a term up by name (PRMS tooltips) get more than
  one hit and must pick by `portfolios[]`. Terms that are not versioned keep returning exactly one
  entry, so today's payload only changes for terms someone deliberately versions.
- A read-only diagnostics endpoint on the admin surface lists the rows that need a human eye:
  duplicated titles, terms with no active portfolio, active terms whose portfolio links are all
  inactive, and the audit trail (`created_by/at`, `updated_by/at`, `modification_justification`) of
  each. It exists so the glossary can be audited and repaired from the panel, without a VPN or a
  database client.

## Capabilities

### New Capabilities
- `glossary-portfolio-versioning`: how a term carries one definition per portfolio — uniqueness
  rules, creating a version, splitting a shared term on edit, and what the public read returns.
- `glossary-diagnostics`: the admin-only, read-only view over glossary rows that were written
  outside the panel or left inconsistent.

### Modified Capabilities
<!-- None: no existing spec in openspec/specs/ covers the glossary. -->

## Impact

- **Back (`clarisa-back`)**
  - `api/glossary/glossary-admin.service.ts`: `findByTitle` (scope by portfolio), `create`,
    `update` (split), `buildBulkPlan` (`existingByKey` keyed by title+portfolio).
  - `api/glossary/glossary-admin.controller.ts` + `dto/glossary-admin.dto.ts`: the split flag and
    the diagnostics response.
  - `api/glossary/glossary.service.ts`: public read unchanged in shape; documented as possibly
    returning repeated terms.
  - **No migration.** The schema (`glossary` + `glossary_portfolios`) already supports one row per
    version; only the guards change.
- **Front (`clarisa-front`)**
  - `clarisa-panel/manage/pages/glossary-admin`: versions of the same term shown together, the
    "add version for portfolio X" action, and the split prompt on edit.
  - `landing-page/pages/glossary`: two cards with the same title are legitimate — each one shows
    its portfolio; the portfolio filter already separates them.
- **Consumers**: PRMS/MEL/MARLO read `GET api/glossary`. The repeated-term case has to be announced
  before any versioned term reaches production.
- **Data**: the rows already written by hand in clarisatest are corrected from the panel once this
  ships; the diagnostics endpoint is what lists them.
