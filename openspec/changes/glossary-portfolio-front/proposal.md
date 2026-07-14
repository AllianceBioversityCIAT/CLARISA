# Proposal: glossary-portfolio-front

## Why

The CLARISA backend now exposes, for every glossary term, the CGIAR portfolios it belongs to (`portfolios: [{ id, name, acronym }]`, live in dev). The front end does not show this anywhere yet: the panel's Glossary table only renders Term/Definition, and there is no public-facing page for the glossary. Users need to see and filter terms by portfolio (Epic P2-3143).

## What Changes

1. **Panel — Glossary table gains a Portfolios chips column + portfolio filter (client-side).**
   - New column rendering each term's portfolios as chips (using portfolio `name`).
   - A portfolio filter above the table (options from `GET api/portfolios`), filtering rows in the front by portfolio `id` — no backend query param needed for now.
   - Excel/PDF export includes the portfolio names.
2. **Landing — new public page presenting the glossary "nicely".**
   - New lazy route under the public landing (`/glossary`) that consumes `GET api/glossary` (public, no token) and presents terms in a polished, searchable layout with portfolio chips and portfolio filter.

## Capabilities

### New Capabilities
- `glossary-portfolio-chips-panel`: the admin-panel Glossary table shows a Portfolios chips column and supports client-side filtering by portfolio.
- `glossary-public-page`: a public landing page lists glossary terms with search and portfolio filtering, in a visually polished presentation.

### Modified Capabilities

_None — no existing front specs in `openspec/specs/`._

## Impact

- **clarisa-front only** (Angular 14). No backend changes: consumes the already-deployed `portfolios` field and existing `api/portfolios` endpoint.
- Panel: `clarisa-panel/documentation` (metadata `endpoints-information.ts`, `content.component.*`).
- Landing: new `landing-page/pages/glossary/` module + route registration (+ optional nav link).
- Branch: `glossary-portfolio-relation` (same as the backend work, per Yeck).
