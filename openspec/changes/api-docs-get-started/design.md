## Context

The docs page is a single self-contained `index.html` (vanilla JS + Tailwind CDN) rendered inside an iframe by `ApiReferenceComponent`. Navigation is built by `renderSidebar()` from `catalog.json` (groups → categories → endpoints). The main area is driven by `goHome()`, `selectEndpoint()`, and per-tab renderers. `state.current` holds the active endpoint; `highlightActive()` toggles the active style on `.ep-btn` elements by matching `state.current.endpoint.route`.

There is no concept of a "static page" in the nav today — every sidebar item maps to an endpoint route.

## Goals / Non-Goals

**Goals:**
- Add a "Get Started" item at the very top of the sidebar that opens an authentication onboarding view.
- Keep it fully inside `index.html` (no Angular, no backend, no new asset files).
- Reuse existing Tailwind classes and the clarisa/leaf palette for visual consistency.
- Make active-state highlighting work for this non-endpoint item alongside the existing endpoint items.

**Non-Goals:**
- No changes to the auth backend or guards (P2-2982 already shipped that).
- No public self-service token generation UI — request stays email-based.
- No i18n; copy is English like the rest of the page.

## Decisions

1. **Represent the page as a special nav target, not an endpoint.** Add `renderGetStarted()` that sets `state.current = null` and a new flag `state.view = 'get-started'` so `highlightActive()` can distinguish home vs get-started vs endpoint. Simplest: track active nav via a small `state.nav` string (`'home' | 'get-started' | 'endpoint'`).

2. **Render the entry in `renderSidebar()` before the group loop.** A single button at the top, styled like a category summary but standalone, calling `renderGetStarted()`. It is injected into the sidebar HTML string before the `state.catalog.groups.forEach(...)` output so it always sits first.

3. **Keep it out of the endpoint search filter.** The global search filters endpoints; the Get Started button is prepended outside the filtered group HTML so it is always present (it is navigation chrome, not searchable data).

4. **Content sourced from agy draft + the real auth strategy.** Header is `X-API-Key`; token format `cl_[env]_[random]`; request flow = email both support addresses. curl + fetch examples use `API_BASE` (the `?api=` injected base) so they match the active environment.

5. **Active highlight.** Extend `highlightActive()` to also toggle an active class on the `#getStartedBtn` element based on `state.nav === 'get-started'`, and clear endpoint highlights when the nav target is Get Started.

## Risks / Trade-offs

- **Minimal state addition.** Introducing `state.nav` touches `goHome()`, `selectEndpoint()`, and `highlightActive()`. Low risk — localized to navigation, no data flow changes.
- **Email addresses are public.** Surfacing CLARISASupport@cgiar.org and PRMSTechsupport@cgiar.org on a public page is intended (per Yeck) but worth noting for support-load awareness.
- **Example URLs.** Using `API_BASE` means examples reflect whatever environment the front points to (currently the PR test back). Acceptable for docs; production deploy will inject the prod base.
