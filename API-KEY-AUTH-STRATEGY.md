# API Key Authentication Strategy for CLARISA

> **Status:** Proposal  
> **Last Updated:** 2026-05-14  
> **Authors:** CLARISA Engineering Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture & Pain Points](#2-current-architecture--pain-points)
3. [Proposed Architecture](#3-proposed-architecture)
4. [Data Model](#4-data-model)
5. [API Key Format](#5-api-key-format)
6. [API Endpoints](#6-api-endpoints)
7. [Authentication Flow](#7-authentication-flow)
8. [Usage Tracking & Observability](#8-usage-tracking--observability)
9. [Error Handling](#9-error-handling)
10. [Security Considerations](#10-security-considerations)
11. [Migration Strategy](#11-migration-strategy)
12. [Comparison: Current vs Proposed](#12-comparison-current-vs-proposed)
13. [Appendix: Example Use Cases](#13-appendix-example-use-cases)

---

## 1. Executive Summary

CLARISA currently uses a complex multi-step authentication flow for microservice-to-microservice communication, involving MIS entities, environments, and AppSecrets with a sender-receiver model. This proposal introduces a **simplified API Key-based authentication system** that:

- Reduces setup from multiple steps to a single API call
- Provides built-in usage tracking and observability
- Enables instant revocation
- Follows industry-standard `X-API-Key` header patterns
- Integrates asynchronously with CLARISA's existing RBAC and environment scoping

---

## 2. Current Architecture & Pain Points

### 2.1 Current Flow

```
Admin creates MIS
       │
       ▼
Admin creates Environment (dev/staging/prod)
       │
       ▼
Admin creates AppSecret (links sender MIS → receiver MIS)
       │
       ▼
Microservice authenticates with:
  1. Login to CLARISA (JWT via Basic Auth)
  2. Call /app-secrets/validate with client_id + secret
```

### 2.2 Identified Pain Points

| Issue | Impact |
|---|---|
| **Multi-step setup** | Creating MIS + Environment + AppSecret requires 3+ separate operations |
| **Two-step validation** | Microservice must first get a JWT (user-level login), then validate the AppSecret |
| **No usage metrics** | Impossible to know which MIS consumed what, when, and how often |
| **Complex secrets** | UUID + 32-char random password with symbols — cumbersome to manage |
| **Tight MIS coupling** | An AppSecret requires both a sender and receiver MIS; no standalone key possible |
| **Non-standard auth header** | Uses custom `auth` JSON header instead of industry patterns |
| **No self-service** | No API for MS teams to create/rotate their own keys |

---

## 3. Proposed Architecture

### 3.1 High-Level Design

```
┌────────────────────────────────────────────────────────┐
│                     CLARISA                             │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │  Admin   │───▶│  API Key     │───▶│  api_keys     │ │
│  │  UI/API  │    │  Service     │    │  (table)      │ │
│  └──────────┘    └──────────────┘    └───────────────┘ │
│                        │                    │          │
│                        ▼                    ▼          │
│                 ┌──────────────┐    ┌───────────────┐  │
│                 │  Event       │───▶│  api_key_     │  │
│                 │  Emitter     │    │  usage_logs   │  │
│                 │  (async)     │    │  (table)      │  │
│                 └──────────────┘    └───────────────┘  │
│                        │                               │
│                        ▼                               │
│                 ┌──────────────┐                       │
│                 │  Dashboard   │                       │
│                 │  (Metrics)   │                       │
│                 └──────────────┘                       │
└────────────────────────────────────────────────────────┘
         ▲                               │
         │ POST /api/auth/validate-api-key│
         │                               ▼
┌────────────────────────────────────────────────────────┐
│              Microservice (e.g., Email MS)              │
│                                                         │
│  Incoming Request → ApiKeyGuard → /validate-api-key    │
│                                                         │
│  Headers: X-API-Key: cl_live_a1b2c3d4...              │
└────────────────────────────────────────────────────────┘
```

### 3.2 Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Header format** | `X-API-Key` | Avoids conflict with `Authorization: Bearer <JWT>` for human users |
| **Validation model** | Centralized (CLARISA validates) | Single source of truth; MS doesn't need local key storage |
| **Logging** | Async via EventEmitter | Prevents latency penalty on the critical auth path |
| **Key prefix** | Stored in plain text | Enables UI display and key identification without exposing the full secret |
| **Key hash** | BCrypt | Consistent with existing CLARISA password hashing |
| **Scopes** | JSON array | Flexible, extensible permission model |

---

## 4. Data Model

### 4.1 `api_keys` Table

Stores the API key configuration and the hashed secret.

```sql
CREATE TABLE api_keys (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    mis_id          BIGINT          NULL,
    name            VARCHAR(255)    NOT NULL,
    key_prefix      VARCHAR(16)     NOT NULL,
    key_hash        VARCHAR(255)    NOT NULL,
    scopes          JSON            NULL,
    environment_id  BIGINT          NULL,
    allowed_ips     JSON            NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    expires_at      TIMESTAMP       NULL,
    last_used_at    TIMESTAMP       NULL,
    usage_count     BIGINT          NOT NULL DEFAULT 0,
    created_by      BIGINT          NOT NULL,
    created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      TIMESTAMP(6)    NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_by      BIGINT          NOT NULL,
    updated_by      BIGINT          NULL,
    modification_justification TEXT NULL,

    PRIMARY KEY (id),
    INDEX idx_key_prefix (key_prefix),
    INDEX idx_is_active (is_active),
    INDEX idx_mis_id (mis_id),
    INDEX idx_environment_id (environment_id),

    CONSTRAINT fk_api_keys_mis_id
        FOREIGN KEY (mis_id) REFERENCES mises(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_api_keys_environment_id
        FOREIGN KEY (environment_id) REFERENCES environments(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_api_keys_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 4.2 `api_key_usage_logs` Table

Stores granular usage records for observability and billing.

```sql
CREATE TABLE api_key_usage_logs (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    api_key_id          BIGINT          NOT NULL,
    microservice_name   VARCHAR(255)    NOT NULL,
    endpoint_accessed   VARCHAR(500)    NOT NULL,
    http_method         VARCHAR(10)     NULL,
    status_code         INT             NULL,
    ip_address          VARCHAR(45)     NULL,
    user_agent          VARCHAR(500)    NULL,
    response_time_ms    INT             NULL,
    created_at          TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    INDEX idx_api_key_id (api_key_id),
    INDEX idx_created_at (created_at),
    INDEX idx_microservice (microservice_name),
    INDEX idx_status_code (status_code),

    CONSTRAINT fk_usage_logs_api_key_id
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
        ON DELETE CASCADE
);
```

### 4.3 Entity Relationships (TypeORM)

Basic TypeORM entity sketch for reference:

```typescript
// api-keys.entity.ts
@Entity('api_keys')
export class ApiKey {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: true })
    misId: number;

    @ManyToOne(() => Mis, { nullable: true })
    @JoinColumn({ name: 'mis_id' })
    mis: Mis;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 16 })
    keyPrefix: string;

    @Column({ type: 'varchar', length: 255, select: false })
    keyHash: string;

    @Column({ type: 'json', nullable: true })
    scopes: string[];

    @Column({ type: 'bigint', nullable: true })
    environmentId: number;

    @ManyToOne(() => Environment, { nullable: true })
    @JoinColumn({ name: 'environment_id' })
    environment: Environment;

    @Column({ type: 'json', nullable: true })
    allowedIps: string[];

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastUsedAt: Date;

    @Column({ type: 'bigint', default: 0 })
    usageCount: number;

    @Column(() => AuditableEntity)
    auditableFields: AuditableEntity;
}
```

```typescript
// api-key-usage-log.entity.ts
@Entity('api_key_usage_logs')
export class ApiKeyUsageLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint' })
    apiKeyId: number;

    @ManyToOne(() => ApiKey)
    @JoinColumn({ name: 'api_key_id' })
    apiKey: ApiKey;

    @Column({ type: 'varchar', length: 255 })
    microserviceName: string;

    @Column({ type: 'varchar', length: 500 })
    endpointAccessed: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    httpMethod: string;

    @Column({ type: 'int', nullable: true })
    statusCode: number;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    userAgent: string;

    @Column({ type: 'int', nullable: true })
    responseTimeMs: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
}
```

---

## 5. API Key Format

### 5.1 Structure

```
cl_[env]_[random_base62]

Where:
  cl        = CLARISA prefix (identifies the issuer)
  [env]     = environment code (live, dev, stag)
  [random]  = cryptographically random 40-char base62 string

Example: cl_live_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m
```

### 5.2 Key Prefix

The `key_prefix` column stores the first 16 characters for UI identification:

| Full Key | Prefix Stored |
|---|---|
| `cl_live_9f8d7e6c5b4a3b2a1c0d...` | `cl_live_9f8d7e` |
| `cl_dev_a1b2c3d4e5f6g7h8i9j0...` | `cl_dev_a1b2c3d` |

### 5.3 Generation Algorithm

```
function generateApiKey(environment: string): { plainKey: string, prefix: string, hash: string } {
    const prefix = `cl_${environment}_`;
    const randomPart = crypto.randomBytes(30)       // 30 bytes → 240 bits of entropy
                          .toString('base64url')     // base64url (40 chars)
                          .replace(/[^a-zA-Z0-9]/g, '')
                          .slice(0, 40);
    const plainKey = prefix + randomPart;
    const hash = BCryptPasswordEncoder.encode(plainKey);
    const keyPrefix = plainKey.slice(0, 16);

    return { plainKey, prefix: keyPrefix, hash };
}
```

> **Security:** 240 bits of entropy exceeds industry standards (AWS Secret Keys use 128 bits, Stripe uses 256 bits).

---

## 6. API Endpoints

### 6.1 Key Management Endpoints (Admin)

All protected by `JwtAuthGuard` + `PermissionGuard` (admin role required).

| Method | Path | Description | Request | Response |
|---|---|---|---|---|
| `POST` | `/api/api-keys/create` | Create a new API key | `CreateApiKeyDto` | `{ key: "cl_live_...", key_prefix: "cl_live_...", id }` |
| `GET` | `/api/api-keys` | List all keys | Query: `?show=active\|all\|inactive` | `ApiKeyDto[]` (no hash) |
| `GET` | `/api/api-keys/:id` | Get key details | — | `ApiKeyDto` (no hash) |
| `PATCH` | `/api/api-keys/:id/revoke` | Revoke (soft-delete) | — | `{ success: true }` |
| `DELETE` | `/api/api-keys/:id` | Hard delete | — | `{ success: true }` |
| `PATCH` | `/api/api-keys/:id/rotate` | Rotate key (revoke old + create new) | — | `{ key: "cl_live_...", key_prefix: "...", id }` |
| `GET` | `/api/api-keys/:id/usage` | Get usage metrics | Query: `?from=&to=&granularity=day\|month` | `UsageStatsDto` |
| `GET` | `/api/api-keys/usage/summary` | Global usage summary | Query: `?from=&to=` | `UsageSummaryDto[]` |

### 6.2 `CreateApiKeyDto`

```typescript
export class CreateApiKeyDto {
    name: string;                     // Required. Human-readable name
    mis_id?: number;                  // Optional. Link to existing MIS
    scopes?: string[];               // Optional. e.g. ["email:send", "toc:read"]
    environment?: string;            // Optional. "live", "dev", "stag"
    allowed_ips?: string[];          // Optional. IP whitelist
    expires_at?: string;             // Optional. ISO 8601 date
}
```

### 6.3 `ValidateApiKeyDto` (the Microservice Validation Contract)

```typescript
export class ValidateApiKeyDto {
    api_key: string;                  // The full API key
    required_scope?: string;         // Optional. Scope to check, e.g. "email:send"
    microservice_name: string;       // Required. Which MS is calling, e.g. "email-ms"
    endpoint_accessed: string;       // Required. e.g. "/api/email/send"
    ip_address?: string;             // Optional. Source IP for logging
}
```

### 6.4 `ValidateApiKeyResponseDto`

```typescript
export class ValidateApiKeyResponseDto {
    valid: boolean;
    mis?: {                           // Present only if valid
        id: number;
        name: string;
        acronym: string;
    };
    environment?: string;
    scopes?: string[];
    error?: string;                   // Present only if invalid
}
```

### 6.5 Validation Endpoint (Public, Rate-Limited)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/validate-api-key` | Rate-limited (no JWT required) | Validates an API key and logs usage |

This endpoint is **deliberately public** (no JWT) because microservices need to call it with just their API key. It must be protected by:
- Rate limiting (e.g., 100 req/min per IP)
- Request size limits
- Monitoring for abuse

---

## 7. Authentication Flow

### 7.1 Key Creation Flow (Admin)

```
Admin (via UI or API)
    │
    ▼
POST /api/api-keys/create  { name, scopes, environment, mis_id }
    │
    ▼
ApiKeyService.create()
    │
    ├── 1. Validate input
    ├── 2. Generate key pair (plainKey + hash)
    ├── 3. Store { key_prefix, key_hash, ... } in DB
    │
    ▼
Response: { id, name, key: "cl_live_9f8d7e...", key_prefix: "cl_live_9f8d" }
// ⚠️ key is only returned ONCE. User must save it immediately.
```

### 7.2 Runtime Validation Flow (Microservice → CLARISA)

```
Microservice receives request
    │
    ▼
Extract X-API-Key header
    │
    ▼
POST /api/auth/validate-api-key  { api_key, required_scope, microservice_name, endpoint_accessed }
    │
    ▼
ApiKeyService.validate()
    │
    ├── 1. Hash the provided key
    ├── 2. SELECT * FROM api_keys WHERE key_hash = ?
    ├── 3. Check is_active = true
    ├── 4. Check expires_at (if set)
    ├── 5. Check environment match (if environment_id is set)
    ├── 6. Check required_scope (if provided)
    ├── 7. Check allowed_ips (if configured)
    │
    ├── [If invalid] → 401 { valid: false, error: "..." }
    │
    └── [If valid]
        ├── Update last_used_at, usage_count++ (sync or async)
        ├── Emit async event → ApiKeyUsageLogHandler
        │     └── INSERT INTO api_key_usage_logs (api_key_id, microservice_name, ...)
        │
        └── Response: 200 { valid: true, mis: { id, name, acronym }, environment, scopes }

Microservice receives response
    ├── If valid → process request
    └── If invalid → return 401 to client
```

### 7.3 Revocation Flow

```
Admin clicks "Revoke" on API key
    │
    ▼
PATCH /api/api-keys/:id/revoke
    │
    ▼
ApiKeyService.revoke()
    ├── UPDATE api_keys SET is_active = false WHERE id = ?
    │
    ▼
Response: { success: true }
// ⚠️ Effect is IMMEDIATE. All in-flight validations will fail.
```

---

## 8. Usage Tracking & Observability

### 8.1 Async Logging Architecture

To avoid adding latency to the validation path, usage logging is **asynchronous**:

```
Validation request
    │
    ▼
[Sync path]            [Async path]
    │                        │
    ├─ Check key             └─ EventEmitter.emit('api_key.used', {
    ├─ Return 200/401             apiKeyId, microservice, endpoint,
    │                              statusCode, ip, responseTimeMs
    └─ Done                   })
                                   │
                                   ▼
                              ApiKeyUsageLogHandler
                                   │
                                   ├─ INSERT INTO api_key_usage_logs
                                   └─ Done (fire & forget)
```

### 8.2 NestJS EventEmitter Implementation Sketch

```typescript
// ApiKeyService
@Injectable()
export class ApiKeyService {
    constructor(
        private eventEmitter: EventEmitter2,
        private apiKeyRepository: ApiKeyRepository,
    ) {}

    async validate(dto: ValidateApiKeyDto): Promise<ValidateApiKeyResponseDto> {
        const startTime = Date.now();

        // Sync validation
        const key = await this.apiKeyRepository.findOne({
            where: { keyHash: hash(dto.api_key), isActive: true }
        });
        if (!key) return { valid: false, error: 'Invalid API key' };

        // ... more validation ...

        // Async logging (fire & forget)
        this.eventEmitter.emit('api_key.used', {
            apiKeyId: key.id,
            microserviceName: dto.microservice_name,
            endpointAccessed: dto.endpoint_accessed,
            statusCode: 200,
            ipAddress: dto.ip_address,
            responseTimeMs: Date.now() - startTime,
        });

        return { valid: true, mis: key.mis, environment: key.environment, scopes: key.scopes };
    }
}

// ApiKeyUsageLogHandler (listener)
@Injectable()
export class ApiKeyUsageLogHandler {
    @OnEvent('api_key.used')
    async handle(payload: UsageLogPayload) {
        await this.usageLogRepository.insert(payload);
        // Optionally batch inserts for high-throughput scenarios
    }
}
```

### 8.3 Dashboard Metrics Queries

**Usage per API key (last 30 days):**
```sql
SELECT
    ak.id,
    ak.name,
    ak.key_prefix,
    COUNT(l.id) AS total_requests,
    COUNT(DISTINCT DATE(l.created_at)) AS active_days,
    MAX(l.created_at) AS last_used,
    AVG(l.response_time_ms) AS avg_response_ms,
    SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END) AS error_count
FROM api_keys ak
LEFT JOIN api_key_usage_logs l ON l.api_key_id = ak.id
    AND l.created_at >= NOW() - INTERVAL 30 DAY
WHERE ak.id = ?
GROUP BY ak.id;
```

**Usage per MIS (monthly aggregation):**
```sql
SELECT
    m.acronym,
    m.name,
    DATE_FORMAT(l.created_at, '%Y-%m') AS month,
    COUNT(l.id) AS total_requests,
    COUNT(DISTINCT l.microservice_name) AS microservices_used,
    SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END) AS errors
FROM api_key_usage_logs l
JOIN api_keys ak ON ak.id = l.api_key_id
JOIN mises m ON m.id = ak.mis_id
WHERE l.created_at >= NOW() - INTERVAL 6 MONTH
GROUP BY m.acronym, m.name, DATE_FORMAT(l.created_at, '%Y-%m')
ORDER BY month DESC, total_requests DESC;
```

**Active keys vs revoked:**
```sql
SELECT
    COUNT(CASE WHEN is_active = 1 THEN 1 END) AS active_keys,
    COUNT(CASE WHEN is_active = 0 THEN 1 END) AS revoked_keys,
    COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) AS expired_keys
FROM api_keys;
```

### 8.4 Sample Dashboard View

```
API Key Dashboard
═══════════════════════════════════════════════════════════════

 Key: cl_live_9f8d7e  →  Email Service PROD       ● Active
─────────────────────────────────────────────────────────────
 Created:    10 May 2026 by admin@cgiar.org
 Last Used:  14 May 2026 15:32:01 (from 192.168.1.50)
 Total:      1,247 requests
 Status:     ● Active    Expires: Never

 Usage (Last 7 Days)
 ─────────────────────────────────────────────────
 Wed   ████████░░░░░░░░  342 requests
 Thu   ██████████░░░░░░  421 requests
 Fri   ████████░░░░░░░░  389 requests
 Sat   ██░░░░░░░░░░░░░░   45 requests
 Sun   █░░░░░░░░░░░░░░░   12 requests
 Mon   █████████░░░░░░░  198 requests
 Tue   ███████░░░░░░░░░  287 requests

 Top Endpoints
 ─────────────────────────────────────────────────
 /api/email/send        892  (71.5%)
 /api/email/status      355  (28.5%)

 Error Rate: 0.9% (12 errors)
 Avg Response: 142ms
```

---

## 9. Error Handling

### 9.1 Validation Error Codes

| HTTP Status | `error` field | Meaning |
|---|---|---|
| `401` | `INVALID_API_KEY` | The key does not exist or hash doesn't match |
| `401` | `KEY_REVOKED` | The key exists but `is_active = false` |
| `401` | `KEY_EXPIRED` | The key is past its `expires_at` date |
| `401` | `SCOPE_MISMATCH` | The key is valid but does not have the required scope |
| `401` | `ENVIRONMENT_MISMATCH` | The key's environment does not match the request context |
| `401` | `IP_NOT_ALLOWED` | The request IP is not in the key's `allowed_ips` |
| `429` | `RATE_LIMITED` | Too many validation requests |

### 9.2 Validation Response Examples

```json
// Success
{
    "valid": true,
    "mis": { "id": 5, "name": "Email Microservice", "acronym": "EMAIL" },
    "environment": "live",
    "scopes": ["email:send", "email:status"]
}

// Failure
{
    "valid": false,
    "error": "SCOPE_MISMATCH",
    "message": "API key does not have the required scope: 'email:admin'"
}

// Revoked key
{
    "valid": false,
    "error": "KEY_REVOKED",
    "message": "This API key was revoked on 2026-05-13T10:00:00Z"
}
```

---

## 10. Security Considerations

### 10.1 Secret Storage

- **BCrypt hashing** — the full key is BCrypt-hashed before storage (consistent with existing CLARISA password encoding)
- **`select: false`** — the `key_hash` column is excluded from SELECT queries by default (must be explicitly selected)
- **Plain key is never stored** — only shown once at creation time

### 10.2 Key Entropy

- **240 bits** of random entropy per key (30 bytes → base64url → 40 chars)
- Exceeds AWS Secret Keys (128 bits), comparable to Stripe (256 bits)
- Generated using `crypto.randomBytes()` (Node.js CSPRNG)

### 10.3 Rate Limiting

The `/validate-api-key` endpoint must be rate-limited:
- **Per IP:** 100 requests/minute
- **Per key:** 1000 requests/minute (prevents brute force)
- Implemented via `@nestjs/throttler` or a custom rate limiter

### 10.4 IP Whitelisting

Optional `allowed_ips` field allows restricting a key to specific source IPs/CIDR ranges:
```json
{
    "allowed_ips": ["10.0.0.0/8", "172.16.0.0/12"]
}
```

### 10.5 Key Rotation

- Keys can be rotated via `PATCH /api/api-keys/:id/rotate`
- Rotate creates a new key and revokes the old one atomically
- Allows zero-downtime rotation (MS can update their config while old key still works briefly)

### 10.6 Audit Trail

All key lifecycle events are logged via the existing `AuditableEntity`:
- `created_by` — who created the key
- `created_at` — when it was created
- `updated_by` — who modified/revoked it
- `modification_justification` — reason for revocation

---

## 11. Migration Strategy

### 11.1 Phase 1: Foundation (Week 1)

- [ ] Create `api_keys` table and `api_key_usage_logs` table (migration)
- [ ] Create TypeORM entities (`ApiKey`, `ApiKeyUsageLog`)
- [ ] Create `ApiKeyModule` with basic CRUD service
- [ ] Create `ApiKeyController` with admin endpoints

### 11.2 Phase 2: Validation Engine (Week 2)

- [ ] Implement `ApiKeyService.validate()` with all checks (hash, active, scope, env, IP)
- [ ] Implement `ApiKeyGuard` — a NestJS guard that can be used on endpoints
- [ ] Create `/api/auth/validate-api-key` public endpoint
- [ ] Add rate limiting to the validation endpoint
- [ ] Implement async usage logging via EventEmitter

### 11.3 Phase 3: Integration (Week 3)

- [ ] Add `ApiKeyGuard` alongside `JwtAuthGuard` on target endpoints
- [ ] Add `X-API-Key` header detection to existing middleware
- [ ] Update microservice configurations to use API keys
- [ ] Create migration script to generate API keys for existing AppSecret relationships

### 11.4 Phase 4: Observability & Dashboard (Week 4)

- [ ] Build dashboard UI components (usage charts, key list, metrics)
- [ ] Implement usage summary aggregation endpoints
- [ ] Set up alerts for key expiration and anomaly detection
- [ ] Create downloadable usage reports (CSV)

### 11.5 Phase 5: Deprecation (Week 5+)

- [ ] Mark AppSecret endpoints as deprecated
- [ ] Add migration guides for existing consumers
- [ ] Monitor old vs new auth usage
- [ ] Remove AppSecret module (optional, backward compat can be maintained)

### 11.6 Backward Compatibility

During migration, both systems can coexist:

```typescript
// Guard that accepts both authentication methods
@Injectable()
export class CompositeAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (apiKey) {
            return this.apiKeyGuard.validate(apiKey);
        }

        // Fall back to JWT (existing flow)
        return this.jwtAuthGuard.canActivate(context);
    }
}
```

---

## 12. Comparison: Current vs Proposed

| Aspect | Current (AppSecret) | Proposed (API Key) |
|---|---|---|
| **Setup steps** | 3+ (MIS → Environment → AppSecret) | 1 (`POST /api/api-keys/create`) |
| **Validation** | JWT + 2-step (login → validate) | 1-step (`X-API-Key` header → validate) |
| **Key format** | UUID + 32-char random password | `cl_[env]_[base62]` (standard prefix) |
| **Secret storage** | BCrypt hash | BCrypt hash (same) |
| **Scope model** | Implicit (sender → receiver MIS) | Explicit (JSON scopes array) |
| **Environment binding** | Implicit (via MIS + Environment) | Explicit `environment_id` |
| **Revocation** | Delete entire AppSecret | `PATCH /revoke` (instant) |
| **Rotation** | Recreate from scratch | `PATCH /rotate` (atomic) |
| **Usage tracking** | ❌ None | ✅ Full logging + metrics |
| **Error reporting** | ❌ None | ✅ Structured error codes |
| **IP whitelisting** | ❌ None | ✅ Optional `allowed_ips` |
| **Expiration** | ❌ None | ✅ Optional `expires_at` |
| **Self-service** | ❌ Admin only | ✅ Admin API + future self-service |
| **Auth header** | Custom `auth` JSON header | Standard `X-API-Key` |
| **Key identification** | ❌ No way to identify key in UI | ✅ `key_prefix` for UI display |
| **Deployment risk** | High (tight coupling) | Low (decoupled, testable) |

---

## 13. Appendix: Example Use Cases

### 13.1 Email Microservice Integration

**Setup:**
```
POST /api/api-keys/create
{
    "name": "Email MS - Production",
    "mis_id": 5,
    "scopes": ["email:send", "email:status"],
    "environment": "live"
}

Response:
{
    "id": 42,
    "name": "Email MS - Production",
    "key": "cl_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "key_prefix": "cl_live_a1b2c3d"
}
```

**Runtime (email service calls Email MS):**
```
POST /api/email/send
X-API-Key: cl_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
Content-Type: application/json

{ "to": "user@example.com", "subject": "Hello", "body": "..." }
```

**Email MS validates with CLARISA:**
```
POST /api/auth/validate-api-key
{
    "api_key": "cl_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "required_scope": "email:send",
    "microservice_name": "email-ms",
    "endpoint_accessed": "/api/email/send",
    "ip_address": "10.0.1.50"
}

Response:
{
    "valid": true,
    "mis": { "id": 5, "name": "Email Microservice", "acronym": "EMAIL" },
    "environment": "live",
    "scopes": ["email:send", "email:status"]
}
```

### 13.2 Incident Response (Leaked Key)

**Situation:** A developer accidentally commits an API key to a public GitHub repo.

**Response time:** ~5 seconds.

1. Admin navigates to CLARISA Dashboard → API Keys
2. Searches for the key by prefix (`cl_live_a1b2c3d`)
3. Clicks **Revoke**
4. Done. All downstream validation immediately fails.

**Post-incident:**
1. Admin creates a new key via `POST /api/api-keys/create`
2. Updates the microservice configuration with the new key
3. Adds the old key's prefix to a blocklist watch

### 13.3 Billing / Chargeback Report

An operations manager wants to know how much each product team is using the email service:

```sql
SELECT
    m.name AS mis_name,
    m.acronym,
    COUNT(l.id) AS email_count,
    COUNT(DISTINCT DATE(l.created_at)) AS days_active
FROM api_key_usage_logs l
JOIN api_keys ak ON ak.id = l.api_key_id
JOIN mises m ON m.id = ak.mis_id
WHERE l.microservice_name = 'email-ms'
  AND l.created_at >= '2026-01-01'
  AND l.created_at < '2026-04-01'
  AND l.status_code = 200
GROUP BY m.name, m.acronym
ORDER BY email_count DESC;

Result:
┌──────────────────────┬─────────┬─────────────┬─────────────┐
│ mis_name             │ acronym │ email_count │ days_active │
├──────────────────────┼─────────┼─────────────┼─────────────┤
│ Reporting Tool       │ PRMS    │      45,231 │          89 │
│ Theory of Change     │ TOC     │      12,004 │          72 │
│ Online Submission    │ OST     │       8,923 │          67 │
│ Innovation Packages  │ IPSR    │       3,112 │          34 │
└──────────────────────┴─────────┴─────────────┴─────────────┘
```

---

*End of Document*
