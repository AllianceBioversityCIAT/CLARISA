# Innovations Overview Endpoint

`GET /results-overview`

Returns a paginated list of PRMS innovation results with their associated science programs, centers, phase, and status. The endpoint is backed by `vw_results_innovations_overview` and is scoped exclusively to innovation result types (Innovation Use, Innovation Development, Innovation Use IPSR).

---

## Environments

| Environment | Base URL |
|---|---|
| **Test** | `https://clarisatest-back.ciat.cgiar.org` |
| **Production** | `https://api.clarisa.cgiar.org` |

**Full URL:**
```
GET {base}/results-overview
```

---

## Query Parameters

All parameters are optional.

| Parameter | Type | Description |
|---|---|---|
| `version_id` | `integer` | Filter by reporting phase/version ID. |
| `status_id` | `integer[]` | Filter by one or more result status IDs. Repeatable: `status_id=1&status_id=2`. |
| `result_type_id` | `integer[]` | Filter by one or more result type IDs. Repeatable. See type reference below. |
| `initiative_id` | `integer` | Filter by science program ID. Matches both lead and contributing programs. |
| `center_code` | `string` | Filter by center code (e.g. `CIP`, `CIMMYT`). Matches both lead and contributing centers. |
| `search` | `string` | Partial text match on result title and description. |
| `page` | `integer` | Page number, 1-based. Default: `1`. |
| `limit` | `integer` | Records per page. Default: `25`. Maximum: `100`. |

### Result type reference

The view exposes only innovation types:

| ID | Name |
|---|---|
| 2 | Innovation Use |
| 7 | Innovation Development |
| 10 | Innovation Use IPSR |

### Status ID reference

| ID | Name |
|---|---|
| 1 | Editing |
| 2 | Quality Assessed |
| 3 | Submitted |
| 4 | Discontinued |
| 5 | Pending Review |
| 6 | Approved |
| 7 | Rejected |

---

## Filtering behavior

- **`version_id`** — exact match on the phase. Use the `/versioning` endpoint to discover available phase IDs.
- **`status_id`** — IN clause; pass the parameter multiple times for OR logic.
- **`result_type_id`** — IN clause; pass multiple times to include more than one type.
- **`initiative_id`** — matches a result if the given initiative is either the **lead** program (`initiative_role_id = 1`) or a **contributing** program (`initiative_role_id = 2`). Resolved via a direct subquery on `results_by_inititiative`.
- **`center_code`** — matches a result if the given center is either the **lead center** (`is_leading_result = true`) or a contributing center. Resolved via a direct subquery on `results_center`.
- **`search`** — `LIKE %term%` applied to both `result_title` and `result_description`. Case-insensitive.
- All active filters are combined with **AND**.

---

## Response structure

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "total_pages": 6
  }
}
```

### Result object

| Field | Type | Description |
|---|---|---|
| `result_id` | `integer` | Internal result ID. |
| `result_code` | `integer` | Human-readable result code. |
| `result_title` | `string` | Result title. |
| `result_description` | `string \| null` | Result description. |
| `result_type_id` | `integer` | Result type ID (2, 7, or 10). |
| `result_type` | `string` | Result type name. |
| `version_id` | `integer` | Reporting phase ID. |
| `phase_name` | `string` | Reporting phase name. |
| `phase_year` | `integer \| null` | Reporting phase year. |
| `status_id` | `integer` | Status ID. |
| `status_name` | `string` | Status label. |
| `lead_initiative_program_id` | `integer \| null` | ID of the lead science program. |
| `lead_initiative_program_official_code` | `string \| null` | Official code of the lead science program. |
| `lead_initiative_program_short_name` | `string \| null` | Short name of the lead science program. |
| `contributing_initiative_program_official_codes` | `string \| null` | Semicolon-separated official codes of contributing science programs (e.g. `INIT-5;INIT-8`). |
| `contributing_initiative_program_short_names` | `string \| null` | Semicolon-separated short names of contributing science programs. |
| `lead_center_code` | `string \| null` | Code of the lead center (e.g. `CIP`). |
| `lead_center_acronym` | `string \| null` | Acronym of the lead center. |
| `contributing_center_codes` | `string \| null` | Semicolon-separated codes of contributing centers. |
| `contributing_center_acronyms` | `string \| null` | Semicolon-separated acronyms of contributing centers. |

---

## Examples

### All innovations for a phase

```
GET /results-overview?version_id=3
```

### Only Innovation Development results

```
GET /results-overview?result_type_id=7
```

### Innovation Use and Innovation Development combined

```
GET /results-overview?result_type_id=2&result_type_id=7
```

### Results by status (multiple)

```
GET /results-overview?status_id=2&status_id=3
```

### Results for a specific science program (lead or contributing)

```
GET /results-overview?initiative_id=12
```

### Results where a center is involved (lead or contributing)

```
GET /results-overview?center_code=CIP
```

### Full-text search with pagination

```
GET /results-overview?search=maize&page=2&limit=10
```

### Combined filters

```
GET /results-overview?version_id=3&result_type_id=7&status_id=2&center_code=CIP&page=1&limit=50
```

### cURL (test environment)

```bash
curl -X GET \
  "https://clarisatest-back.ciat.cgiar.org/results-overview?version_id=3&result_type_id=7&status_id=2&limit=10" \
  -H "Accept: application/json"
```

### cURL (production)

```bash
curl -X GET \
  "https://api.clarisa.cgiar.org/results-overview?version_id=3&result_type_id=7&status_id=2&limit=10" \
  -H "Accept: application/json"
```

---

## Example response

```json
{
  "data": [
    {
      "result_id": 1284,
      "result_code": 542,
      "result_title": "Improved drought-tolerant maize varieties adopted in East Africa",
      "result_description": "Describes the adoption of varieties...",
      "result_type_id": 7,
      "result_type": "Innovation Development",
      "version_id": 3,
      "phase_name": "Reporting 2024",
      "phase_year": 2024,
      "status_id": 2,
      "status_name": "Quality Assessed",
      "lead_initiative_program_id": 12,
      "lead_initiative_program_official_code": "INIT-12",
      "lead_initiative_program_short_name": "Excellence in Agronomy",
      "contributing_initiative_program_official_codes": "INIT-5;INIT-8",
      "contributing_initiative_program_short_names": "Food Systems;Nutrition Innovation",
      "lead_center_code": "CIMMYT",
      "lead_center_acronym": "CIMMYT",
      "contributing_center_codes": "CIP;ICRAF",
      "contributing_center_acronyms": "CIP;ICRAF"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 142,
    "total_pages": 15
  }
}
```

---

## Error responses

| HTTP Status | Description |
|---|---|
| `400 Bad Request` | Invalid parameter type or value out of allowed range. |
| `500 Internal Server Error` | Unexpected server-side error. |

---

## Notes

- Results with `is_active = false` are excluded from all responses.
- The view is scoped to innovation result types only (`result_type_id IN (2, 7, 10)`). Other result types are not returned regardless of filters.
- Multi-value fields (`contributing_*`) use `;` as separator. Split on `;` to get individual values.
- `initiative_id` and `center_code` filters query the source tables directly (not the view columns), so they correctly match both lead and contributing associations.
- The `version_id` parameter is strongly recommended in production to avoid full-table scans across all phases.
- Swagger UI is available at `{base}/api` for interactive exploration.
