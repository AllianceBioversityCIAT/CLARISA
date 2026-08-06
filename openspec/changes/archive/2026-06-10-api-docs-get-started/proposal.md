## Why

The custom API documentation (the Scalar replacement that lives in `clarisa-front/src/assets/api-reference/index.html`) explains the control-list endpoints but says nothing about **authentication**. After the P2-2982 API Security work (Juan D. Guzmán), the API now accepts a valid **API token** via the `X-API-Key` header, coexisting with the legacy JWT (hybrid, backward-compatible). External consumers landing on the docs have no in-page guidance on how to authenticate or how to obtain a token, so they cannot self-serve and end up opening support tickets blind.

## What Changes

- Add a **"Get Started"** entry as the **first item in the sidebar**, above the catalog groups.
- Add a `renderGetStarted()` view in the docs SPA that explains:
  - The hybrid auth model (JWT legacy + API token going forward).
  - How to **request a token by email** to **CLARISASupport@cgiar.org** and **PRMSTechsupport@cgiar.org** (no public self-service yet), and what to include in the request.
  - How to **use the token** with the `X-API-Key` header (curl + JavaScript fetch examples).
  - A note that public control-list endpoints are **read-only**.
- Wire the entry into the existing sidebar render and active-state highlighting so it behaves like the other navigation items.

No backend changes. No change to the auth implementation itself — this is documentation surfacing existing behavior.

## Capabilities

### New Capabilities
- `api-docs-get-started`: The "Get Started" / authentication onboarding section of the public API documentation page — its sidebar entry, its content (token request flow, header usage, read-only notice), and how it integrates with the existing docs navigation.

### Modified Capabilities
<!-- None: the docs page has no existing OpenSpec capability spec; this is the first one for it. -->

## Impact

- **File:** `clarisa-front/src/assets/api-reference/index.html` (static vanilla-JS docs page rendered inside an iframe).
- **No backend, no Angular component changes.** Self-contained in the iframe asset.
- **Contacts surfaced publicly:** CLARISASupport@cgiar.org, PRMSTechsupport@cgiar.org.
- **Environment:** the front currently points to the PR test back (`https://clarisatest-back.ciat.cgiar.org/`); examples use the live API base injected via `?api=`.
