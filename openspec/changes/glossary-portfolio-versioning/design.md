## Context

`glossary` holds one row per definition; `glossary_portfolios` tags each row with the portfolios it
applies to. The shape already supports two definitions of the same term — the 2023 glossary
replacement left exactly that (`Impact` lives as a 2022-era row plus a current one) — but every
write path assumes a title belongs to a single row:

- `findByTitle` matches `LOWER(TRIM(title))` with no portfolio scope and no `is_active` filter, so
  `create()` answers `409` even when the colliding row was deactivated years ago.
- `update()` rewrites the one row for every portfolio it is tagged with.
- `buildBulkPlan` indexes existing terms in a `Map` keyed by title; with two same-titled rows the
  last one read wins and the other is never touched.

The consequence is operational: portfolio-specific definitions are being written directly into the
database, outside the panel and outside the audit trail. Nobody can see those rows without a VPN and
a database client.

Stakeholders: Nicoleta and Santi (content), Ángel (PRMS consumption), Yeck (delivery).

## Goals / Non-Goals

**Goals:**
- A term carries one definition per portfolio, and only when the definition actually differs.
- Every portfolio-specific definition is created and edited from the admin panel, with an audit
  trail.
- The glossary can be inspected and repaired from the panel, without database access.

**Non-Goals:**
- Historical versioning (who changed what, when, with rollback). A "version" here is *per
  portfolio*, not per date.
- Per-portfolio translations or per-portfolio `show_in_dashboard`.
- Changing what a consumer of `GET api/glossary` receives for a term that is **not** versioned.
- Migrating or deduplicating the legacy inactive rows.

## Decisions

### D1. One row per version — no new table, no migration

A version is a `glossary` row with its own `glossary_portfolios` tags. Nothing is added to the
schema.

*Alternative rejected:* a nullable `definition` override on `glossary_portfolios`. It looks cheaper
until provenance is considered — `source`, `source_url` and `reference_date` are per definition, so
they would have to be duplicated onto the join table too, and the admin panel would have to edit a
term in two places. It also contradicts the shape the data is already in.

*Alternative rejected:* a `glossary_definitions` table. Same result as D1 with a migration of 69
terms and a rewrite of every read path, for no behaviour the row-per-version does not already give.

### D2. Uniqueness becomes (title, portfolio), enforced in the service

No database constraint can express it: the title lives in `glossary` and the portfolio in
`glossary_portfolios`. The guard runs inside the existing write transaction.

- A write is rejected when another **active** row with the same normalized title already holds one
  of the requested portfolios.
- An **inactive** row no longer reserves a title. Today a row deactivated in 2023 blocks the name
  forever, which is one of the reasons content is written by hand.
- A row with **no** portfolio is allowed (it is what "not assigned yet" looks like) but the
  diagnostics endpoint reports it, because such a term is invisible under every portfolio filter.

### D3. Splitting is its own endpoint, not a flag on `PATCH`

`POST api/glossary/admin/terms/:id/versions` with `{ portfolio_ids, definition, source?,
source_url?, reference_date? }`.

In one transaction: the listed portfolios are deactivated on the source row and a new row is created
with the same title, the new definition and those portfolios. The response returns both rows.

`PATCH` keeps exactly the meaning it has today — *edit this row, for all the portfolios it covers* —
so no existing call changes behaviour. `portfolio_ids` must be a strict subset of the source row's
active portfolios: a split that takes all of them is an edit, and a split onto a portfolio the term
never had is a new version, which the create path already does.

*Alternative rejected:* `PATCH ... { split: true }`. The same request would mean two different
things depending on a boolean, and a client that forgets the flag silently rewrites both portfolios
— the exact failure this change exists to remove.

### D4. The public read keeps its shape

`GET api/glossary` is not deduplicated, not paginated and gains no query parameter. A versioned term
appears once per version, each entry distinguishable by its `portfolios[]`. Terms that are not
versioned return exactly as they do today.

### D5. Diagnostics reads the audit trail, and `updated_by IS NULL` is the fingerprint

`GET api/glossary/admin/diagnostics`, behind `JwtAuthGuard` + `PermissionGuard` like the rest of the
admin surface, read-only. It groups rows into:

- `duplicated_titles` — every row sharing a normalized title, with its portfolios, so a legitimate
  version is told apart from an accident.
- `without_active_portfolio` — active terms invisible under every portfolio filter.
- `portfolio_conflicts` — two active rows with the same title claiming the same portfolio.
- `written_outside_panel` — rows whose `updated_at` moved while `updated_by` stayed `NULL`. The
  panel always writes `updated_by`; direct SQL and the legacy `PATCH api/glossary/update` do not, so
  this is what a hand-written row looks like from the outside.

Every entry carries `id`, `title`, `is_active`, both active and inactive portfolio links, and
`created_at/by`, `updated_at/by`, `modification_justification`.

### D6. The panel shows versions grouped under one term

The terms table groups rows by normalized title: one line per term, expandable into its versions,
each with its portfolio chips. Two actions: *Add version for a portfolio* (create path) and, when
editing a term that spans several portfolios, a choice between *apply to all portfolios* (default,
today's behaviour) and *apply only to …* (split path).

## Risks / Trade-offs

- **A consumer that looks a term up by name now gets more than one hit** → the repeated-term case
  must be announced to Ángel and Santi before the first versioned term reaches production. Nothing
  in production is versioned on the day this ships, so the payload is unchanged until content is
  deliberately split.
- **`GET api/glossary/dashboard` inherits the same repetition** → out of scope here; flagged as an
  open question rather than silently resolved.
- **The guard is in the service, so a direct SQL write can still break the invariant** → that is
  precisely what `portfolio_conflicts` in the diagnostics endpoint reports.
- **Two cards with the same title under "All portfolios" on the public page** → intended; each card
  carries its portfolio chip, and every portfolio filter shows exactly one.
- **A split cannot be undone with one click** → both rows keep the same title, the split writes a
  `modification_justification`, and merging back is "edit one row, delete the other" from the panel.

## Migration Plan

No database migration. Back and front ship together — the panel is the only client of the new
endpoints.

Branch `glossary-portfolio-versioning`, born from `staging`. Order: → `dev-v2` (clarisatest, the only
environment with a database) → verify against the real data → back to `staging` → `main`.

Rollback: revert the two commits. No schema or data change is left behind; rows created as versions
stay valid data under the old code, which would simply refuse to create more of them.

## Open Questions

- `GET api/glossary/dashboard` (`show_in_dashboard`) with a versioned term: does PRMS want every
  version or the one of the current portfolio? Needs Ángel.
- Should the panel offer to *merge* two versions back into one row, or is deleting the redundant one
  enough?
- The rows already written by hand in clarisatest (see diagnostics) are corrected after this ships;
  whether the same correction is needed in production depends on what Santi ran there.
