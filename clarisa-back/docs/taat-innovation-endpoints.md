# TAAT Innovation Endpoints

`GET /integration/taat/innovation/{development|use|package|all|all/flat|all/unified}`

Exports PRMS innovation results for the TAAT eCatalogs. Each endpoint reads a view in the PRMS reporting database that already returns one JSON document per result; CLARISA only parses and returns it.

| Endpoint | Source view | PRMS result type |
|---|---|---|
| `/development` | `taat_innovation_development_view` | 7 — Innovation Development |
| `/use` | `taat_innovation_use_view` | 2 — Innovation Use |
| `/package` | `taat_innovation_package_view` | 10 — Innovation Package (IPSR) |
| `/all` | the three views | grouped by type, with counts |
| `/all/flat`, `/all/unified` | the three views | one array, each item with `innovation_type` |

---

## Environments

| Environment | Base URL |
|---|---|
| **Test** | `https://clarisatest-back.ciat.cgiar.org` |
| **Production** | `https://api.clarisa.cgiar.org` |

---

## What is exported

- Only active results with status **Quality Assessed** (`status_id = 2`). Results still in editing or submission — e.g. the current reporting cycle before QA — do not appear.
- **All geographies**: global, regional, multi-national and national results. `where_has_the_technology.regions` and `.countries` list every region and country reported in PRMS.
- **No readiness-level filter.** Consumers that only want mature innovations filter on their side, using `scalling_readiness_reference.level` (development and package).

---

## Versions, identifiers and PDF links

PRMS creates a new record of a result in every reporting phase it is reported in.

| Field | Meaning |
|---|---|
| `result_code` | Stable identifier of the innovation across phases. Use it to track an innovation over the years. |
| `id` | PRMS result ID of this specific version. Changes every phase. |
| `result_year` | Phase year of this version. |
| `pdf_link` | PDF report of this exact version. |

The same `result_code` can therefore appear more than once, one record per phase. To get the current state of an innovation, keep the record with the highest `result_year` per `result_code`.

### PDF link format

```
development, use:  https://reporting.cgiar.org/reports/result-details/{result_code}?phase={version_id}
package:           https://reporting.cgiar.org/reports/ipsr-details/{result_code}?phase={version_id}
```

The `phase` parameter is the PRMS version (phase) ID, not the year. A link built from `result_code` alone does not select a phase and may open a different version or fail. Always use `pdf_link` as returned: it points to the PDF of the same version as the record.
