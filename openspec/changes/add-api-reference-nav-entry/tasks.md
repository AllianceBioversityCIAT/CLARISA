## 1. Routing cleanup

- [x] 1.1 In `clarisa-panel/clarisa-panel-routing.module.ts`, remove the `// PROPUESTA: ...` comment from the `api-reference` route, keeping the lazy `loadChildren` for `ApiReferenceModule` intact.

## 2. Landing-page navbar (Services dropdown)

- [x] 2.1 In `landing-page/components/navigation-bar/navigation-bar.component.html`, add an **API Reference** `<li>` inside the **Services** dropdown, immediately after the `Introduction` item and above `One CGIAR Control List`, using `routerLink="/clarisa-panel/api-reference"` and the same `<li><a>` markup as its siblings.

## 3. Clarisa-panel documentation menu

- [x] 3.1 In `clarisa-panel/documentation/components/horizontal-menu/horizontal-menu.component.html`, add an **API Reference** `dropdown-item` anchor pointing to `/clarisa-panel/api-reference`, placed within the same documentation group (next to `One CGIAR Control Lists` / `One CGIAR Operation`), using `routerLink`.

## 4. Clarisa-panel manage menu

- [x] 4.1 In `clarisa-panel/manage/components/horizontal-menu/horizontal-menu.component.html`, add the same **API Reference** entry mirroring the documentation links, using `routerLink="/clarisa-panel/api-reference"`.

## 5. Verification (local)

- [x] 5.1 Confirm the legacy `One CGIAR Control List` and `One CGIAR Operation` links remain present and unchanged in all three templates (coexistence).
- [x] 5.2 Build the front locally (`npm run build` in `clarisa-front`) and confirm it compiles with no new errors.
- [x] 5.3 Run the app locally and visually verify: the **API Reference** item appears in each of the three menus, is styled consistently with siblings, and navigating it loads `/clarisa-panel/api-reference` (the Scalar view). Capture a screenshot of the Services dropdown for the change record.
