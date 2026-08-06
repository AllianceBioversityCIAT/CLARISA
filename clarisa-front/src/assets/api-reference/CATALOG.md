# API documentation catalog — maintenance guide

This folder powers the **API documentation** view rendered at the `/api-reference`
route (inside an isolated iframe). It has three pieces:

| File | Role |
|---|---|
| `index.html` | The custom documentation app (table + export + JSON/Schema/Code). |
| `catalog.json` | **The grouping/filtering source** — which endpoints are shown and under which category. |
| `CATALOG.md` | This guide. |

The app pulls **data** and **schema** from the back's `api-docs-json` (the
zero-leak OpenAPI spec — only public, read-only control lists, no business
logic). It pulls the **grouping** (how endpoints are organized into categories)
from `catalog.json`. The spec has no notion of CLARISA's business categories, so
the grouping has to live here.

---

## `catalog.json` shape

```jsonc
{
  "groups": [
    {
      "group": "One CGIAR Control List",          // top-level group
      "categories": [
        {
          "name": "General Control List",         // category (the visible grouping)
          "description": "…",                      // shown under the category
          "endpoints": [
            { "name": "Countries", "route": "api/countries", "method": "get" }
          ]
        }
      ]
    }
  ]
}
```

- **group** → top section in the sidebar (currently a single group: `One CGIAR Control List`).
- **category** → the specific grouping the public sees, mirroring the current public docs:
  `General Control List` (7), `Institutions` (3), `Research Strategy 2030` (12),
  `Innovation Catalog` (13) — 35 endpoints total.
- **endpoint** → `name` (display label), `route` (the API path, no leading slash), `method` (`get`).

### An endpoint can live in several categories

The same `route` may appear under more than one category — the app supports it
(multi-category) and shows the endpoint under each category it belongs to.
Currently no endpoint is duplicated, but it's a valid setup if a future group
(e.g. an operational view) needs to re-list an existing control list.

---

## How to expose a NEW endpoint in the documentation

Exposing an endpoint is a **two-step** change — one in the back, one in the front.
Both are required: the back step makes it public in the spec; the front step makes
it appear (and decides its category).

### Step 1 — Back: add it to the public allowlist

File: `clarisa-back/src/shared/swagger/public-endpoints.ts` →
`PUBLIC_OPENAPI_PATHS`.

Add the exact path **with the `/api` prefix**, e.g.:

```ts
export const PUBLIC_OPENAPI_PATHS: string[] = [
  // …
  '/api/my-new-control-list',
];
```

Only the `GET` method of each path is kept. If the path is not in this list, it
will **not** appear in `api-docs-json` (it stays protected/undocumented), and the
docs' Schema tab would mark it as "not in public spec".

### Step 2 — Front: add it to a category in `catalog.json`

Pick the group + category where it belongs and add the endpoint (no leading slash
on `route`):

```jsonc
{
  "name": "My New Control List",
  "route": "api/my-new-control-list",
  "method": "get"
}
```

To add a **new category**, append a new object to a group's `categories` array
with `name`, `description`, and `endpoints`. To add a **new group**, append to
`groups`.

> Which category? Match the data's domain: general reference lists →
> `General Control List`; institutions → `Institutions`; research-strategy
> structures (action/impact areas, SDGs, initiatives) → `Research Strategy 2030`;
> innovation control lists → `Innovation Catalog`. If none fits, add a new
> category (or group) instead of forcing it into the wrong one.

---

## Keep three sources in sync

When you expose, rename, or remove an endpoint, update all three:

1. **Back allowlist** — `clarisa-back/src/shared/swagger/public-endpoints.ts` (what the spec exposes).
2. **Front catalog** — `clarisa-front/src/assets/api-reference/catalog.json` (what the docs show + category).
3. **Wiki map** — `~/Desktop/clarisa/context/documentation-endpoints-map.md` (the verified reference of the public surface).

If the three drift, the docs and the spec disagree (an endpoint shows in the
sidebar but has no schema, or is public in the spec but invisible in the docs).
