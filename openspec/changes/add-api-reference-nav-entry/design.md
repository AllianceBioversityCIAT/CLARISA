## Context

The `api-reference` view (dynamic OpenAPI docs via Scalar, in an isolating iframe) is already implemented in `clarisa-front` and lazy-loaded at `/clarisa-panel/api-reference`, but it is undiscoverable: no menu links to it and the route is annotated `// PROPUESTA`. The existing documentation links live in three navigation templates that share the same Bootstrap-style dropdown markup:

- `landing-page/components/navigation-bar/navigation-bar.component.html` — the public **"Services"** dropdown (`<li><a routerLink=...>` items).
- `clarisa-panel/documentation/components/horizontal-menu/horizontal-menu.component.html` — `dropdown-item` anchors.
- `clarisa-panel/manage/components/horizontal-menu/horizontal-menu.component.html` — mirrors the same documentation links.

Constraint: front-only, no new dependencies, no bespoke component, keep the legacy docs in place. Audience includes external FAIR reviewers, so the entry must read clearly and look native.

## Goals / Non-Goals

**Goals:**
- Make the API Reference view reachable in one click from every menu that already lists documentation.
- Keep markup/styling identical to sibling items (no visual special-casing).
- Drop the `PROPUESTA` framing so the route is first-class.

**Non-Goals:**
- Redesigning the navigation menus or their structure.
- Removing or migrating the legacy `documentation` views.
- Any backend / OpenAPI spec change.
- Commit, push, deploy (Yeck's responsibility).

## Decisions

**1. Reuse existing item markup, no new component.**
Each menu already renders documentation links as plain `<li><a>` / `<a class="dropdown-item">`. The API Reference entry copies that exact pattern with `routerLink="/clarisa-panel/api-reference"`. Rationale: zero styling drift, minimal diff, native look. Alternative considered — a highlighted CTA/button — rejected: inconsistent with the menu and risks looking like an ad.

**2. Label: "API Reference".**
Distinct from the legacy "One CGIAR Control List / Operation" docs and from "Introduction". Communicates "machine-readable API docs" without jargon. Alternatives ("API Docs", "OpenAPI", "Developers") rejected as either redundant or too technical for the mixed audience.

**3. Placement: immediately after "Introduction", above the legacy doc links.**
It is the modern, canonical API documentation, so it leads the documentation group while the legacy links remain below it. Rationale: surfaces the FAIR-relevant view first without removing anything.

**4. Use `routerLink` (SPA navigation), not `href`.**
Some legacy entries use raw `href="/clarisa-panel/documentation/..."` (full reload). The new entry uses Angular `routerLink` to stay within the SPA, consistent with the other `routerLink` items in the same menus.

**5. Remove `// PROPUESTA` comment from the route.**
Cosmetic but aligns the code with the view now being a supported, linked destination.

## Risks / Trade-offs

- [Mixed `href` vs `routerLink` in the same menu] → Use `routerLink` for the new item (the correct SPA pattern); leaving legacy `href` items untouched is acceptable and out of scope.
- [View only renders correctly when the back's `/api-docs-json` is reachable in the target environment] → Out of scope here (deploy-time concern); the menu entry is inert HTML and safe to merge regardless. Verification is local build + visual check.
- [Three templates drift over time] → Documented allowlist of the three files in tasks.md; a follow-up could centralize nav items, but that is a larger refactor and out of scope.
