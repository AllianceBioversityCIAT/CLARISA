## 1. Navigation state

- [x] 1.1 Add `nav: 'home'` to the `state` object in `index.html`
- [x] 1.2 Set `state.nav = 'home'` inside `goHome()` and `state.nav = 'endpoint'` inside `selectEndpoint()`

## 2. Sidebar entry

- [x] 2.1 In `renderSidebar()`, prepend a "Get Started" button (id `getStartedBtn`) above the catalog groups loop, calling `renderGetStarted()`
- [x] 2.2 Style the button with existing Tailwind/clarisa classes so it reads as the first nav item
- [x] 2.3 Ensure the button is rendered outside the endpoint search filter (always visible)

## 3. Get Started view

- [x] 3.1 Implement `renderGetStarted()` that sets `state.current = null`, `state.nav = 'get-started'`, calls `highlightActive()`, and fills `#main`
- [x] 3.2 Add hybrid-auth explanation (X-API-Key header + legacy JWT backward compatibility)
- [x] 3.3 Add token-request block: email both CLARISASupport@cgiar.org and PRMSTechsupport@cgiar.org, what to include, token format `cl_[env]_[random]`
- [x] 3.4 Add curl + JavaScript fetch examples using `API_BASE` and the `X-API-Key` header
- [x] 3.5 Add a read-only notice for public control-list endpoints
- [x] 3.6 Match styling to the existing home/endpoint cards (clarisa/leaf palette, rounded cards, shadow-card)

## 4. Active highlighting

- [x] 4.1 Extend `highlightActive()` to toggle the active style on `#getStartedBtn` when `state.nav === 'get-started'` and clear it otherwise

## 5. Verify

- [x] 5.1 Reload the docs page in the browser, confirm "Get Started" appears first and renders the auth content
- [x] 5.2 Confirm active highlight switches correctly between Get Started, Home, and endpoints
- [x] 5.3 Confirm curl/fetch examples show the correct API base and `X-API-Key` header
