## Why

The new dynamic API documentation view (`api-reference`, rendering the filtered OpenAPI spec via Scalar) already exists and works in `clarisa-front`, but it has **no entry point in the UI**: it is only reachable by typing `/clarisa-panel/api-reference` by hand and is still flagged as `// PROPUESTA` in the routing. As a result, neither regular users nor external reviewers (e.g. Marie Angelique's FAIR review) can discover it through normal navigation. Making it discoverable is the missing step that turns the OpenAPI work into something stakeholders can actually reach and evaluate.

## What Changes

- Add a discoverable, well-presented navigation entry (label: **API Reference**) that links to `/clarisa-panel/api-reference` from the existing documentation/Services menus.
- Target menus, consistent with where the current documentation links live:
  - Landing-page navbar **"Services"** dropdown (alongside `Introduction`, `One CGIAR Control List`, `One CGIAR Operation`, `Institution Request`).
  - `clarisa-panel` documentation horizontal menu (and the manage horizontal menu, which mirrors the same documentation links).
- Match the existing menu styling, markup pattern, and label conventions — no bespoke component, reuse the existing `<li>` / `dropdown-item` patterns.
- Remove the `// PROPUESTA` framing from the route so it reads as a first-class view.
- The new entry **coexists** with the old documentation links (`/clarisa-panel/documentation/...`); the legacy docs are NOT removed.

## Capabilities

### New Capabilities
- `api-reference-navigation`: discoverability of the dynamic OpenAPI documentation view through the front-end navigation menus — which menus expose it, the label/placement, and the routing target.

### Modified Capabilities
<!-- None. No existing OpenSpec capability spec governs the navigation menus today. -->

## Impact

- **Scope:** front-only (`clarisa-front`), navigation/templates. No backend changes — the OpenAPI filtering/exposure is already implemented and merged.
- **Files (expected):**
  - `landing-page/components/navigation-bar/navigation-bar.component.html` (Services dropdown)
  - `clarisa-panel/documentation/components/horizontal-menu/horizontal-menu.component.html`
  - `clarisa-panel/manage/components/horizontal-menu/horizontal-menu.component.html`
  - `clarisa-panel/clarisa-panel-routing.module.ts` (drop the `PROPUESTA` comment)
- **No new dependencies.** Reuses existing Angular routing and template patterns.
- **Out of scope:** commit, push, deploy (handled by Yeck); any backend or OpenAPI spec changes; removing the legacy documentation views.
