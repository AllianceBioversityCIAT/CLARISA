## 0. Panel — find the terms with no portfolio (shipped first, front only)

- [x] 0.1 Count the terms with no portfolio linked and state how many are active
- [x] 0.2 Replace the empty portfolio cell with a warning chip explaining the term is invisible under
      every portfolio filter of the public page
- [x] 0.3 Add the "No portfolio linked" filter, listing active and inactive terms alike, with the
      sentinel kept out of the edit dialog's options
- [x] 0.4 Correct the dialog hint, which claimed a term with no portfolio still shows in the glossary
- [x] 0.5 Tests for the count, the filter and the sentinel

## 1. Back — grouping and uniqueness per portfolio

- [ ] 1.0a Migration: nullable `group_id` on `glossary` with its index — `NULL` means the row is its
      own group, so no existing row is touched
- [ ] 1.0b `POST terms/:id/group` (relate to another term) and `DELETE terms/:id/group` (unrelate),
      rejecting a group where an active member already holds one of the requested portfolios
- [ ] 1.0c Expose `groupId` (`COALESCE(group_id, id)`) in the public read and in the admin DTO
- [ ] 1.0d The split assigns the source row's group to the new row
- [ ] 1.0e Tests: relate, unrelate, conflict rejected, split inherits the group, a row with no group
      behaves as today

- [ ] 1.1 Replace `findByTitle` with a lookup that returns every row sharing the normalized title,
      each with its active portfolio ids
- [ ] 1.2 Add the guard used by every write path: reject with `409` when another **active** row with
      the same title already holds one of the requested portfolios, naming term and portfolio
- [ ] 1.3 Stop inactive rows from reserving a title in `create()`
- [ ] 1.4 Apply the guard in `update()` when `portfolio_ids` or `term` change
- [ ] 1.5 Tests: version created for a free portfolio, conflict on an occupied one, inactive row
      does not block, term with no portfolio accepted

## 2. Back — split endpoint

- [ ] 2.1 Add `SplitGlossaryTermDto` (`portfolio_ids` required and non-empty, plus definition and
      the three provenance fields) to `dto/glossary-admin.dto.ts`, reusing `GlossaryTermFieldsDto`
- [ ] 2.2 Implement `splitVersion(id, dto, userData)` in `GlossaryAdminService`: one transaction,
      deactivate the listed links on the source row, create the new row with the same title, return
      both
- [ ] 2.3 Reject with `400` when the portfolios are not a strict subset of the source row's active
      portfolios
- [ ] 2.4 Write the modification justification on the new row stating the source term id
- [ ] 2.5 Expose `POST terms/:id/versions` in `GlossaryAdminController`
- [ ] 2.6 Tests: successful split, non-subset rejected, full-set rejected, audit fields written,
      nothing written on rejection
- [ ] 2.7 Implement `merge(id, intoId, userData)`: move the active portfolio links of one row onto
      the other and deactivate the emptied row — never delete it
- [ ] 2.8 Reject a merge between rows with different titles, and refuse to leave the target with two
      links to the same portfolio
- [ ] 2.9 Expose `POST terms/:id/merge` and test both directions (merge, then reactivate to undo)

## 3. Back — bulk import

- [ ] 3.1 Key the existing-terms index by title **and** portfolio instead of title alone
- [ ] 3.2 Mark a row invalid when its term exists in several versions and the file carries no
      portfolio for it, naming the candidates
- [ ] 3.3 Tests: file updates only the version of the mapped portfolio; ambiguous row refuses the
      whole import

## 4. Back — diagnostics endpoint

- [ ] 4.1 Add the response DTOs for the four findings and the totals
- [ ] 4.2 Implement `diagnostics()` as a read over `glossary` + `glossary_portfolios` + `portfolios`,
      including inactive links and the audit fields
- [ ] 4.3 Expose `GET terms/diagnostics` behind the admin guards
- [ ] 4.4 Tests: each finding detected in isolation, healthy glossary returns empty groups, the call
      writes nothing

## 5. Back — public read

- [ ] 5.1 Document in the `@ApiOperation` of `GET api/glossary` that a term may appear once per
      portfolio version, and how to tell the entries apart
- [ ] 5.2 Test: two versions of the same term are both returned, with unchanged keys

## 6. Front — admin panel

- [ ] 6.1 Group the terms table by normalized title, expandable into its versions with their
      portfolio chips
- [ ] 6.2 "Add version for a portfolio" action, offering only the portfolios the term does not cover
- [ ] 6.3 On editing a term that spans several portfolios, ask whether the change applies to all of
      them (default) or only to one — the second calls the split endpoint
- [ ] 6.4 Surface the `409`/`400` messages of the new guards in the dialog, naming the portfolio
- [ ] 6.5 Diagnostics view inside the glossary module, each finding linking to the term it reports
- [ ] 6.6 "Link portfolios" action on a term reported with none, from the same row that reports it
- [ ] 6.7 "Merge into…" action between two versions of the same term, stating which definition
      survives before applying
- [ ] 6.8 Front tests for the grouping, the split prompt, the link and merge actions and the
      diagnostics view

## 7. Front — public page

- [ ] 7.1 Render one card per group: the selected portfolio's definition when a filter is active,
      and every version labelled by its portfolio under "All portfolios"
- [ ] 7.2 Keep the letter index and the search consistent when a title appears more than once

## 8. Verification

- [ ] 8.1 `npm test` green in back and front (`--maxWorkers=2` locally)
- [ ] 8.2 Build and linters clean in back; build clean in front
- [ ] 8.3 Against the clarisatest database: split a term into two versions, check both the public
      payload and the public page per portfolio, then revert the test data
- [ ] 8.4 Run the diagnostics endpoint against clarisatest and confirm it lists the rows written by
      hand
