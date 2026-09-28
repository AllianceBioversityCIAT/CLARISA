# Contract v2 — checklist gaps (2026-09-27)

Closes the MELIAF checklist rows that were still open after the first build. All routes live under
`api/global-concepts`. Admin routes sit behind the existing admin guards; public routes are anonymous.
Nothing here adds a foreign key to a table outside the module.

## 1. Icons (checklist rows 1 and 13)

Table `gc_icons` already exists (created in `1790500000000-CreateGlobalConcepts`). One concept, zero or
more icons; the term stays the primary record and the icon is attached to it.

- `GET    admin/:scheme/concepts/:termId/icons` → `AdminIcon[]`
- `POST   admin/:scheme/concepts/:termId/icons` body `IconDto` → `AdminIcon`
- `PATCH  admin/:scheme/icons/:id` body `Partial<IconDto>` → `AdminIcon`
- `DELETE admin/:scheme/icons/:id` → `{ deleted: id }`

`IconDto`: `icon_code?` (≤50), `icon_status` (value of list `icon_status`: final|draft|placeholder|not_yet_designed),
`file_format?` (value of list `icon_format`), `file_name?`, `designer?`, `designer_country?`, `year_created?` (int),
`rights_and_licence?`, `alt_text?` (≤500; **required when `icon_status` = `final`**), `file_link_primary?` and
`file_link_backup?` (http/https only), `date_added?` (YYYY-MM-DD).

`AdminIcon` = every column + `id`. Every icon write logs `GcHistoryAction.ICONS` on the concept and bumps the
minor version when the concept is published.

Public concept shape gains `icons: PublicIcon[]` = `{ icon_code, status, format, alt_text, url, rights_and_licence, designer }`
where `url` is `file_link_primary` only when it is http(s), else null. Exports: CSV column `icons` (urls joined by ` | `),
SKOS `foaf:depiction <url>` per icon with `url`, JSON as in the public shape.

## 2. Custom fields (checklist row 2: "define our own metadata fields … add or change fields later without rebuilding")

New table `gc_fields` (in the same create migration; nothing is deployed yet):
`id, scheme_id, code (slug, unique per scheme), label, type, list_code NULL, required tinyint, is_public tinyint,
sort int, is_active tinyint, help text NULL, created_at`.
`type` ∈ `text | long_text | multi_text | list | multi_list | term_link | url | date | number`.

- `GET   admin/:scheme/fields` → all (active and inactive)
- `POST  admin/:scheme/fields` body `{ code, label, type, list_code?, required?, is_public?, sort?, help? }`
- `PATCH admin/:scheme/fields/:id` body `{ label?, help?, required?, is_public?, sort?, is_active? }` — `code` and
  `type` are immutable once created (values already stored depend on them).
- `GET   :scheme/fields` (public) → active + public fields `{ code, label, type, list_code, help }`

Values live in `gc_concepts.extra` (already a JSON column) keyed by field `code`.
- Create/Update concept DTO gains `extra?: Record<string, unknown>`. The service validates against the ACTIVE field
  definitions: unknown key → 400; type check; `list`/`multi_list` values must be active values of `list_code`
  (label accepted, stored as value); `term_link` = array of term_ids of the same scheme (resolved, unknown → 400);
  `url` http(s); `date` YYYY-MM-DD; `required` enforced on create and when the key is sent on update.
  `''` / `null` / `[]` clears a key. Keys not sent are kept (merge, never replace the whole object).
- Public shape gains `custom_fields: { code, label, type, value }[]` with only active + public fields, in `sort` order;
  `term_link` values become `{ term_id, preferred_label, uri }[]`. The raw `extra` stays admin-only.
- Import: row keys `x:<code>` map to custom fields (multi types split on `;` or `|`). The import-fields list shown in the
  wizard = built-in fields + `x:<code>` for each active field (`GET admin/:scheme/import-fields`).
- Exports: CSV one column per public field (`x:<code>`); JSON as the public shape.

## 3. Usage analytics (checklist row 10: "which terms are searched for and used")

New table `gc_usage_daily`: `day date, scheme_id bigint, kind varchar(20), item varchar(191), count int,
PRIMARY KEY (day, scheme_id, kind, item)`, written with an atomic `INSERT … ON DUPLICATE KEY UPDATE count = count + 1`,
fire-and-forget (a failure never breaks the read).

Recorded kinds and items:
- `search` — normalised `q` (trim, lower-case, collapsed spaces, ≤100 chars) of the public list; plus `zero_search`
  with the same item when the answer is empty (candidate new terms).
- `view` — `term_id` on public concept GET and on persistent-URI hits.
- `export` — the format.  `mcp` — the tool name.  `suggest` — item `text` (NEVER the text).
- `api` — `list` for the public list without `q`.

- `GET admin/:scheme/usage?days=30` → `{ days, totals: { search, zero_search, view, export, mcp, suggest },
  by_day: { day, search, view }[], top_searches: { item, count }[] (20), zero_result_searches: { item, count }[] (20),
  top_viewed: { term_id, preferred_label, count }[] (20) }`.

Privacy note in the admin screen: what a person types in the public search box is stored, normalised and aggregated
per day; texts sent to "Check a text" and to MCP are never stored.

## 4. AI drafts (makes AI useful for editors)

- `POST admin/:scheme/ai/draft` (AI guard) body `{ preferred_label, definition, fields: ('short_definition'|'scope_note'|'example_of_use')[] }`
  → `{ short_definition?, scope_note?, example_of_use? }`. Advisory: nothing is saved.
- Concept DTO gains `ai_generated_fields?: string[]` (subset of the writable field names): the form sends it when the
  editor accepts an AI draft, so the public page and exports say which fields came from AI (brief: every term keeps its
  original source).

## 5. Already there (front only needs to use them)

- Labels: `PUT admin/:scheme/concepts/:termId/labels` body `{ labels: { label, language?, kind: alt|hidden|acronym|pref, status?: active|discouraged }[] }` (replaces the set).
- Relations: `POST admin/:scheme/concepts/:termId/relations` `{ kind: broader|related, target_term_id }`; remove with
  `POST …/relations/remove` same body.
- Mappings: `POST admin/:scheme/concepts/:termId/mappings` `{ target_scheme, target_uri, target_label?, match_type?: exact|close|broad|narrow|related, justification?, confidence? }`;
  `DELETE admin/:scheme/concepts/:termId/mappings/:mappingId`.
- Collections: `GET|POST admin/:scheme/collections`, `PATCH|DELETE admin/:scheme/collections/:code`,
  `PUT admin/:scheme/collections/:code/members { term_ids }`.
- Lists: `GET|POST admin/:scheme/lists`, `PATCH admin/:scheme/lists/:id`.
- Semantic search: `POST admin/:scheme/ai/semantic-search { text, limit? }`; index refresh `POST admin/:scheme/ai/embeddings/refresh`.
- Quality report: `GET admin/:scheme/quality`. Releases: `POST admin/:scheme/releases { version, notes? }`.
