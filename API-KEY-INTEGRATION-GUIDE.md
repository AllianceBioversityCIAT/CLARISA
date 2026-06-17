# CLARISA API Keys — Technical Integration Guide

> **Audience:** product teams, satellite microservices, and CLARISA API consumers.  
> **Last updated:** 2026-06-04  
> **Related documents:** [API-KEY-AUTH-STRATEGY.md](./API-KEY-AUTH-STRATEGY.md) (internal architecture), [clarisa-back/src/api/api-key/AGENTS.md](./clarisa-back/src/api/api-key/AGENTS.md) (quick reference for MS teams)

---

## Table of contents

1. [Overview](#1-overview)
2. [Key concepts](#2-key-concepts)
3. [API Key format](#3-api-key-format)
4. [Two authentication modes](#4-two-authentication-modes)
5. [Mode A — Validation between microservices (MIS → MS → CLARISA)](#5-mode-a--validation-between-microservices-mis--ms--clarisa)
6. [Mode B — Direct consumption of native CLARISA services](#6-mode-b--direct-consumption-of-native-clarisa-services)
7. [Scope catalog](#7-scope-catalog)
8. [What CLARISA validates on each request](#8-what-clarisa-validates-on-each-request)
9. [Observability and metrics](#9-observability-and-metrics)
10. [Errors and HTTP status codes](#10-errors-and-http-status-codes)
11. [Security best practices](#11-security-best-practices)
12. [Integration checklist](#12-integration-checklist)
13. [Frequently asked questions](#13-frequently-asked-questions)

---

## 1. Overview

CLARISA issues **API Keys** to authenticate machine-to-machine consumers (MIS, platforms, microservices). The same key can be used in **two distinct scenarios**:

| Scenario | Who calls | How the key is sent | Purpose |
|----------|-----------|---------------------|---------|
| **A — MS validation** | A satellite microservice (email-ms, reports, etc.) | JSON body on `POST /api/auth/validate-api-key` | The MS validates the **client's** key before processing the request |
| **B — Native CLARISA APIs** | The consumer directly | HTTP header `X-API-Key` | Call CLARISA REST endpoints (institutions, partner requests, ToC, etc.) |

In both cases, CLARISA is the **single source of truth**: BCrypt hash, revocation, scopes, IP allowlist, and expiration are all resolved on the CLARISA server. **Do not validate keys locally** (regex, permanent cache without invalidation, etc.).

---

## 2. Key concepts

Before integrating, distinguish three fields that are often confused:

### `mis_id` — Consumer identity

- Links the key to a **MIS** registered in CLARISA (e.g. PRMS, AICCRA, TOC).
- Used for **audit**, metrics, and administration.
- **Does not replace** the key's permissions.

### `scopes` — Permissions / capabilities

- A list of strings defining **what the key can do**.
- Examples: `institutions:read`, `email:send`, `partner-requests:create`.
- **These are not MIS names.** The legacy AppSecret model (sender → receiver MIS) no longer applies.

### `environment` — Deployment tier

- Comes from CLARISA's `environments` catalog (`DEV`, `TEST`, `PROD`, …).
- Reflected in the key prefix: `cl_dev_`, `cl_test_`, `cl_prod_`.
- A DEV key **must not** be used against CLARISA PROD.

### Relationship diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        API Key                               │
│  cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m            │
├─────────────────────────────────────────────────────────────┤
│  mis_id      →  PRMS (identity / chargeback / audit)        │
│  scopes      →  [email:send, email:status]  (permissions)   │
│  environment →  PROD                                        │
│  allowed_ips →  optional (whitelist)                        │
│  expires_at  →  optional                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API Key format

### Structure

```
cl_{env}_{random_40_chars}
```

| Segment | Description | Example |
|---------|-------------|---------|
| `cl` | Fixed prefix (CLARISA issuer) | `cl` |
| `{env}` | Lowercase environment acronym | `prod`, `dev`, `test` |
| `{random}` | 40 alphanumeric characters (high entropy) | `9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m` |

**Full example:**

```
cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m
```

### UI identification

CLARISA stores the first **16 characters** as `key_prefix` (e.g. `cl_prod_9f8d7e6c`) for display in the admin panel without exposing the full secret.

### Obtaining a key

A CLARISA administrator creates the key via the panel or admin API (`POST /api/api-keys/create` with JWT). The response includes the `key` value **only once**; it must be saved immediately in a secrets manager.

---

## 4. Two authentication modes

```
                    ┌──────────────────────────────────────┐
                    │            CLARISA                    │
                    │                                       │
   Mode A           │   POST /api/auth/validate-api-key    │
   (MS validates)──►│   Body: { api_key, ... }             │
                    │                                       │
   Mode B           │   GET/POST /api/...                  │
   (direct API)  ───►│   Header: X-API-Key: cl_prod_...    │
                    │                                       │
                    └──────────────────────────────────────┘
```

| | Mode A — Between microservices | Mode B — Native CLARISA APIs |
|---|---|---|
| **Caller** | Satellite microservice | Consumer (app, script, another MS) |
| **Key transport** | `api_key` field in JSON body | `X-API-Key` header |
| **Auth toward CLARISA** | None (public endpoint with rate limit) | None (no JWT, no Basic Auth) |
| **Scope check** | Optional `required_scope` field in body | `@RequireApiKeyScope` on the endpoint (when enabled) |
| **Typical use** | Client → email-ms → CLARISA validates | Client → CLARISA `/api/institutions/...` |

> **Deployment note:** Mode B (hybrid guards on CLARISA controllers) is enabled **progressively** per module/endpoint. During migration, JWT (panel users), AppSecret (legacy), and API Key coexist. See rollout status in [API-KEY-AUTH-STRATEGY.md §11.3.1](./API-KEY-AUTH-STRATEGY.md).

---

## 5. Mode A — Validation between microservices (MIS → MS → CLARISA)

This is the flow when a **satellite microservice** (email-ms, reports-ms, toc-ms, etc.) receives requests from a consumer and must verify the API Key is valid **before** executing business logic.

### 5.1 Full flow

```
Consumer (MIS/app)          Satellite microservice              CLARISA
        │                              │                            │
        │  POST /api/email/send        │                            │
        │  X-API-Key: cl_prod_abc...   │                            │
        │ ───────────────────────────► │                            │
        │                              │  Header present?           │
        │                              │  No → 401 to consumer      │
        │                              │                            │
        │                              │  POST /api/auth/validate-api-key
        │                              │  { api_key, required_scope,│
        │                              │    microservice_name,      │
        │                              │    endpoint_accessed,      │
        │                              │    ip_address }            │
        │                              │ ──────────────────────────►│
        │                              │                            │
        │                              │  200 { valid:true, mis... }│
        │                              │ ◄──────────────────────────│
        │                              │                            │
        │                              │  Process request           │
        │  200 { result }              │                            │
        │ ◄─────────────────────────── │                            │
```

### 5.2 What the consumer sends to the microservice

The consumer (another MIS, platform, or integration) calls the **microservice**, not CLARISA directly for validation:

```http
POST https://email-ms.example.com/api/email/send
X-API-Key: cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Hello",
  "body": "..."
}
```

| Rule | Detail |
|------|--------|
| Required header | `X-API-Key` on protected MS routes |
| Do not use `Authorization: Bearer` | That header is reserved for human users with JWT |
| Do not send the key in query params or request body | Header `X-API-Key` only |
| If header is missing | MS responds **401** without calling CLARISA |

### 5.3 What the microservice sends to CLARISA (validation)

**Endpoint:**

```
POST {CLARISA_BASE_URL}/api/auth/validate-api-key
```

| Property | Value |
|----------|-------|
| Method | `POST` |
| Content-Type | `application/json` |
| Authentication toward CLARISA | **None** (no JWT, no Basic Auth, no `X-API-Key` on this request) |
| Rate limit | 100 requests/minute per IP (configurable via env) |

**JSON body:**

```json
{
  "api_key": "cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m",
  "required_scope": "email:send",
  "microservice_name": "email-ms",
  "endpoint_accessed": "/api/email/send",
  "ip_address": "203.0.113.42"
}
```

#### Body fields

| Field | Required | Description |
|-------|----------|-------------|
| `api_key` | **Yes** | Exact value of the `X-API-Key` header received from the consumer |
| `microservice_name` | **Yes** | Stable name of the validating MS (e.g. `email-ms`, `reports`). Use an environment variable; **do not change per request** |
| `endpoint_accessed` | **Yes** | MS route the consumer invoked. Audit label — can be the real route (`/api/email/send`) or an action alias (`pdf.reports`) |
| `required_scope` | Recommended | Scope required by **this** MS endpoint. CLARISA rejects if the key does not include it |
| `ip_address` | Recommended | **End consumer** IP (not the MS IP). Required if the key has an IP whitelist |

> **Important:** on the validation endpoint, the key goes in the **body** (`api_key`), not in the `X-API-Key` header. The `X-API-Key` header is for direct CLARISA API calls (Mode B) or for the consumer to identify itself to an MS (Mode A, step 1).

### 5.4 Success response (HTTP 200)

```json
{
  "valid": true,
  "mis": {
    "id": 12,
    "name": "Reporting Tool",
    "acronym": "PRMS"
  },
  "environment": "PROD",
  "scopes": ["email:send", "email:status"]
}
```

**MS action:** process the request. Useful fields:

- `mis.acronym` / `mis.id` — identify which product is consuming the service
- `environment` — confirm the key matches the expected tier
- `scopes` — full key permissions (required scope already validated if `required_scope` was sent)

### 5.5 Failure response (HTTP 401)

```json
{
  "valid": false,
  "error": "Missing required scope: email:send"
}
```

**MS action:** respond **401** to the consumer with a generic message. Do not expose internal CLARISA details.

### 5.6 Recommended environment variables for the MS

```env
CLARISA_BASE_URL=https://clarisa.example.com
MICROSERVICE_NAME=email-ms
```

### 5.7 cURL example (what the MS runs internally)

```bash
curl -X POST "${CLARISA_BASE_URL}/api/auth/validate-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m",
    "required_scope": "email:send",
    "microservice_name": "email-ms",
    "endpoint_accessed": "/api/email/send",
    "ip_address": "203.0.113.42"
  }'
```

### 5.8 MS endpoint → scope mapping

Each MS operation must require the correct scope:

| Method | MS route | `required_scope` | `endpoint_accessed` |
|--------|----------|------------------|---------------------|
| `POST` | `/api/email/send` | `email:send` | `/api/email/send` |
| `GET` | `/api/email/status/:id` | `email:status` | `/api/email/status` |
| `POST` | `/api/reports/pdf` | per MS contract | `pdf.reports` or `/api/reports/pdf` |

---

## 6. Mode B — Direct consumption of native CLARISA services

This is the flow when a consumer calls CLARISA REST endpoints **directly** (institutions, partner requests, ToC, etc.) without going through an intermediate microservice.

### 6.1 Flow

```
Consumer                         CLARISA API
     │                                  │
     │  POST /api/partner-requests/create
     │  X-API-Key: cl_prod_abc...       │
     │  Content-Type: application/json  │
     │ ────────────────────────────────►│
     │                                  │  CompositeAuthGuard
     │                                  │    → detects X-API-Key
     │                                  │    → ApiKeyGuard validates
     │                                  │    → checks endpoint scope
     │                                  │  HybridAuthorizationGuard
     │                                  │    → API key: OK (scope already checked)
     │                                  │    → JWT: PermissionGuard (if no key)
     │                                  │
     │  200 / 401 / 403                 │
     │ ◄────────────────────────────────│
```

### 6.2 What the consumer sends

The key goes **only in the HTTP header**:

```http
POST https://clarisa.example.com/api/partner-requests/create
X-API-Key: cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m
Content-Type: application/json

{
  "institution_id": 1234,
  "request_type": "new"
}
```

| Rule | Detail |
|------|--------|
| Header | `X-API-Key` (case-insensitive; CLARISA reads `x-api-key`) |
| No JWT | Do not send `Authorization: Bearer` alongside API Key; if `X-API-Key` is present, it **takes precedence** over JWT |
| No validation body | Do not include `api_key` in the resource request body |
| Required scope | The key must include the endpoint scope (e.g. `partner-requests:create`). CLARISA validates this internally |

### 6.3 Example — read institutions

```http
GET https://clarisa.example.com/api/institutions/get/1234
X-API-Key: cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m
```

Required scope on the key: `institutions:read` (when the endpoint is protected with hybrid auth).

### 6.4 Example — partner request (write)

```http
POST https://clarisa.example.com/api/partner-requests/create
X-API-Key: cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m
Content-Type: application/json

{ "...": "partner request payload" }
```

Required scope: `partner-requests:create`.

### 6.5 Coexistence with JWT (panel users)

Endpoints with `CompositeAuthGuard` accept **two paths**:

```
Incoming request
  │
  ├─ X-API-Key header present?
  │     YES → ApiKeyGuard (validates hash, scope, IP, expiration)
  │           → HybridAuthorizationGuard skips JWT PermissionGuard
  │
  └─ NO → JwtAuthGuard (current panel flow)
           → HybridAuthorizationGuard → PermissionGuard (user permissions)
```

Machine-to-machine consumers use `X-API-Key`. Human panel users continue using JWT as today.

### 6.6 Endpoints excluded from API Key

**Panel administration** routes remain **JWT only**:

- API key management (`/api/api-keys/*`)
- Users, roles, admin permissions
- Human-only administration operations

### 6.7 Current rollout status

Hybrid infrastructure (`CompositeAuthGuard`, `HybridAuthorizationGuard`, `@RequireApiKeyScope`) is implemented. Endpoint-by-endpoint enablement is **progressive**. Before integrating a specific endpoint, confirm with the CLARISA team whether it already accepts `X-API-Key` or still requires JWT/AppSecret.

---

## 7. Scope catalog

Source of truth: `clarisa-back/src/api/api-key/constants/api-key-scopes.ts`  
Runtime catalog: `GET /api/api-keys/scopes` (requires admin JWT).

### Scopes for native CLARISA APIs

| Scope | Purpose |
|-------|---------|
| `institutions:read` | Read institutions and reference data |
| `partner-requests:read` | List / view partner requests |
| `partner-requests:create` | Create or update partner requests |
| `mises:read` | Read MIS registry |
| `environments:read` | Read environment catalog |
| `toc:read` | Read ToC results |
| `toc:write` | Write ToC resources |

### Scopes for satellite microservices

| Scope | Purpose |
|-------|---------|
| `email:send` | Send email via email-ms |
| `email:status` | Query email delivery status |
| `auth:validate-key` | Allow the MS to call `validate-api-key` (if explicitly required on the key) |

When creating a key, the admin assigns only the scopes the consumer needs (**principle of least privilege**).

---

## 8. What CLARISA validates on each request

Both `POST /api/auth/validate-api-key` and `ApiKeyGuard` (via `X-API-Key` header) run the same core logic in `ApiKeyService.validate()`:

| Step | Validation | On failure |
|------|------------|------------|
| 1 | Key not empty, minimum format (16-char prefix) | `Invalid API key format` |
| 2 | Prefix matches and BCrypt hash is correct | `Invalid API key` |
| 3 | `is_active = true` | `API key is revoked` |
| 4 | `expires_at` not passed (if set) | `API key has expired` |
| 5 | Client IP in `allowed_ips` (if configured) | `IP address is not allowed for this key` |
| 6 | `required_scope` present in key `scopes` (if provided) | `Missing required scope: {scope}` |

After successful validation:

- `last_used_at` and `usage_count` on the key are updated
- An async event is recorded in `api_key_usage_logs`

---

## 9. Observability and metrics

Each validation or authenticated call generates a usage record with:

| Field | Mode A (validate-api-key) | Mode B (direct API) |
|-------|---------------------------|---------------------|
| `microservice_name` | `microservice_name` from body (e.g. `reports`) | `clarisa-api` (fixed) |
| `endpoint_accessed` | `endpoint_accessed` from body | Actual request path (e.g. `/api/partner-requests/create`) |
| `http_method` | `POST` | Actual method (`GET`, `POST`, …) |
| `ip_address` | `ip_address` from body or caller IP | Request IP |
| `status_code` | `200` on success | HTTP response code |

The admin **Usage & Analytics** panel (microservices-admin) shows:

- KPIs by period
- MIS × microservice matrix
- Per-key drill-down
- CSV export of activity log

This enables auditing which MIS consumes which service, detecting anomalies, and planning AppSecret deprecation.

---

## 10. Errors and HTTP status codes

### `validate-api-key` endpoint

| HTTP | Situation | `error` field (examples) |
|------|-----------|--------------------------|
| `200` | Valid key | — (`valid: true`) |
| `401` | Invalid, revoked, expired key, scope or IP mismatch | See table below |
| `429` | Rate limit exceeded | Message: `Too many validation requests...` |

| `error` | Likely cause |
|---------|--------------|
| `Invalid API key` | Wrong key or wrong environment |
| `Invalid API key format` | String too short or malformed |
| `API key is revoked` | Admin revoked the key |
| `API key has expired` | Past `expires_at` |
| `IP address is not allowed for this key` | Missing client `ip_address` or IP not in whitelist |
| `Missing required scope: {scope}` | Valid key but missing permission for the operation |
| `Missing api_key` | Body missing the field |

### Native CLARISA APIs (Mode B)

| HTTP | Situation |
|------|-----------|
| `401` | Missing `X-API-Key`, invalid or revoked key |
| `403` | Valid key but missing scope (when endpoint requires `@RequireApiKeyScope`) |

---

## 11. Security best practices

1. **Store the key in a secrets manager** — never in repositories, logs, or public frontends.
2. **One key per consumer and environment** — do not reuse the same key across DEV and PROD.
3. **Minimum scopes** — request only the permissions needed from the CLARISA admin.
4. **Do not log the full key** — at most the first 16 characters (`key_prefix`).
5. **Timeout toward CLARISA** — 2–5 seconds on validations; do not retry on `401`.
6. **Optional short cache** — 30–60 s per `key + scope` combination; invalidate on any `401`.
7. **Rotation** — use `PATCH /api/api-keys/:id/rotate` (admin); update consumer secrets.
8. **Immediate revocation** — on leakage, revoke in the panel; effect is instant across all validations.

---

## 12. Integration checklist

### Satellite microservice (Mode A)

- [ ] Consumer sends `X-API-Key` on protected MS routes
- [ ] MS calls `POST {CLARISA_BASE_URL}/api/auth/validate-api-key` **before** processing
- [ ] Body includes `api_key`, `microservice_name`, `endpoint_accessed`
- [ ] Body includes `required_scope` matching the MS endpoint
- [ ] Body includes consumer `ip_address` if the key may have a whitelist
- [ ] `microservice_name` is constant (environment variable)
- [ ] `401` to consumer if CLARISA returns `valid: false`
- [ ] Consumer key is **not** forwarded as `X-API-Key` header to CLARISA on validate — it goes in the body

### CLARISA API consumer (Mode B)

- [ ] `X-API-Key` sent on every CLARISA endpoint request
- [ ] Key has the scopes required by that endpoint
- [ ] Key matches the deployment environment (`cl_prod_` in PROD)
- [ ] JWT and API Key are not mixed on the same request (key takes precedence)
- [ ] Confirmed the endpoint accepts hybrid auth (progressive rollout)

### Administration

- [ ] Key created with correct `mis_id`, `environment`, and `scopes`
- [ ] `key` value saved in secrets manager at creation time
- [ ] Usage verified in Usage & Analytics dashboard

---

## 13. Frequently asked questions

### Can I send the API Key in `Authorization: Bearer`?

No. Use `X-API-Key`. `Authorization: Bearer` is reserved for human user JWTs.

### Does the microservice need its own API Key to call `validate-api-key`?

No. The validation endpoint is public (rate-limited). The MS sends the **consumer's** key in the body. The MS identifies itself via `microservice_name`.

### What is the difference between `endpoint_accessed` and the real route?

`endpoint_accessed` is **audit metadata**. It can be the actual HTTP route (`/api/email/send`) or an action label (`pdf.reports`) when the route is not stable. Keep it consistent so metrics remain useful.

### Are scopes MIS names?

No. MIS are identified via `mis_id` / `mis.acronym` in the response. Scopes are permissions (`email:send`, `institutions:read`, etc.).

### Can I still use AppSecret?

During migration, yes. AppSecret and API Key coexist. AppSecret will be deprecated progressively; new integrations should use API Key.

### Can the same consumer use one key for both Mode A and Mode B?

Yes. A key can have scopes from both groups (e.g. `institutions:read` + `email:send`). CLARISA validates the relevant scope in each context.

---

## Quick reference

| Action | Method | URL | How to send the key |
|--------|--------|-----|---------------------|
| Validate key (from MS) | `POST` | `/api/auth/validate-api-key` | Body: `"api_key": "cl_prod_..."` |
| Consume CLARISA API | `GET`/`POST`/… | `/api/{resource}/...` | Header: `X-API-Key: cl_prod_...` |
| Create key (admin) | `POST` | `/api/api-keys/create` | Admin JWT (not API Key) |
| View scope catalog (admin) | `GET` | `/api/api-keys/scopes` | Admin JWT |

---

*End of document*
