# CLARISA API Key — Guide for Microservices

> **Audience:** satellite microservices (email-ms, toc-ms, etc.) and agents implementing their authentication.  
> **Your responsibility:** receive the client's API key, validate it against CLARISA, and only then process the request.  
> **Extended reference:** [API-KEY-AUTH-STRATEGY.md](../../../../API-KEY-AUTH-STRATEGY.md), [API-KEY-INTEGRATION-GUIDE.md](../../../../API-KEY-INTEGRATION-GUIDE.md)

---

## What you must do (summary)

1. Require the **client** to send their API key in the **`X-API-Key`** header.
2. On **every protected request**, call CLARISA to validate that key.
3. If CLARISA responds with `valid: true`, process the request.
4. Otherwise, return **401 Unauthorized** to the client.

**Do not validate the key locally.** CLARISA is the single source of truth (hash, revocation, scopes, IP, expiration).

**Do not use the legacy AppSecret flow** (`/app-secrets/validate` + JWT login). That is deprecated.

---

## What the client sends to your microservice

The client calls **your** API and must include:

```http
POST https://your-microservice.example/api/email/send
X-API-Key: cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m
Content-Type: application/json

{ "to": "user@example.com", "subject": "Hello", "body": "..." }
```

| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes (on protected routes) | API key issued by CLARISA. Format: `cl_{env}_{40_chars}` |
| `Content-Type` | Per your API | Usually `application/json` |

**Rules:**

- The key goes in **`X-API-Key`**, not in `Authorization: Bearer` (that header is reserved for human users with JWT).
- If the header is missing → respond **401** immediately; do not call CLARISA.
- Do not accept the key in query params or in the client's request body.

---

## Where to validate: CLARISA endpoint

```
POST {CLARISA_BASE_URL}/api/auth/validate-api-key
```

| Environment | `CLARISA_BASE_URL` (example — confirm with ops) |
|-------------|------------------------------------------------|
| DEV | `https://clarisa-dev.example.com` |
| TEST | `https://clarisa-test.example.com` |
| PROD | `https://clarisa.example.com` |

- **Method:** `POST`
- **Auth toward CLARISA:** none (do not send JWT or Basic Auth)
- **Content-Type:** `application/json`
- **Rate limit:** 100 requests/minute per caller IP (your MS). If you receive **429**, retry with backoff or respond 503 to the client.

Configure in your MS:

```env
CLARISA_BASE_URL=https://clarisa.example.com
MICROSERVICE_NAME=email-ms
```

`MICROSERVICE_NAME` must be **constant** per deployment (used in CLARISA metrics and logs).

---

## What YOU send to CLARISA (JSON body)

On each validation, make a `POST` with this body:

```json
{
  "api_key": "cl_prod_9f8d7e6c5b4a3b2a1c0d9e8f7g6h5i4j3k2l1m",
  "required_scope": "email:send",
  "microservice_name": "email-ms",
  "endpoint_accessed": "/api/email/send",
  "ip_address": "203.0.113.42"
}
```

### Body fields

| Field | Required | What to send |
|-------|----------|--------------|
| `api_key` | **Yes** | Exact value of the client's `X-API-Key` header (full string) |
| `microservice_name` | **Yes** | Your MS name, e.g. `email-ms`. Use the environment variable; do not change per request |
| `endpoint_accessed` | **Yes** | **Your** API route the client invoked, e.g. `/api/email/send`. No query string |
| `required_scope` | Recommended | Scope required by **this** MS endpoint (see table below). CLARISA rejects if the key does not have it |
| `ip_address` | Recommended | **End client** IP (not yours). Forward `X-Forwarded-For` or `req.ip`. Required if the key has an IP whitelist |

### Scopes for microservices

Use the scope that matches the endpoint you protect:

| Your MS endpoint (example) | `required_scope` |
|----------------------------|------------------|
| Send email | `email:send` |
| Query email status | `email:status` |
| (any MS that validates keys) | optional: `auth:validate-key` on the MS key if applicable |

Full list of valid scopes: see [API-KEY-AUTH-STRATEGY.md §6.2.1](../../../../API-KEY-AUTH-STRATEGY.md) or ask the admin for the catalog via `GET /api/api-keys/scopes`.

**Important:** scopes are **permissions**, not MIS names. Consumer identity comes in the response (`mis`).

---

## CLARISA responses and what to do

### Success — HTTP 200

```json
{
  "valid": true,
  "mis": {
    "id": 5,
    "name": "Reporting Tool",
    "acronym": "PRMS"
  },
  "environment": "PROD",
  "scopes": ["email:send", "email:status"]
}
```

**Action:** process the client's request. Optionally use:

- `mis.acronym` / `mis.id` — know which product consumes your service (audit, per-MIS rate limits)
- `environment` — ensure the key is for the correct tier (`PROD`, `DEV`, etc.)
- `scopes` — full key scopes (required scope already validated if you sent `required_scope`)

### Failure — HTTP 401

```json
{
  "valid": false,
  "error": "Invalid API key"
}
```

**Action:** respond **401** to the client. Do not expose internal details; a generic message is enough:

```json
{ "message": "Unauthorized" }
```

| `error` value | Meaning |
|---------------|---------|
| `Invalid API key` | Key does not exist or is incorrect |
| `API key is revoked` | Key revoked by admin |
| `API key has expired` | Key expired |
| `IP address is not allowed for this key` | Client IP not allowed |
| `Missing required scope: email:send` | Valid key but missing permission for this operation |
| `Invalid API key format` | Malformed key |

### Rate limit — HTTP 429

**Action:** do not cache the key as valid. Retry validation with short backoff or respond 503/429 to the client.

---

## Full flow (step by step)

```
Client                           Your microservice                    CLARISA
   │                                    │                              │
   │  POST /api/email/send              │                              │
   │  X-API-Key: cl_prod_abc...         │                              │
   │ ─────────────────────────────────► │                              │
   │                                    │                              │
   │                                    │  X-API-Key header present?   │
   │                                    │  No → 401                    │
   │                                    │                              │
   │                                    │  POST /api/auth/validate-api-key
   │                                    │  { api_key, required_scope,  │
   │                                    │    microservice_name,        │
   │                                    │    endpoint_accessed,        │
   │                                    │    ip_address }              │
   │                                    │ ────────────────────────────►│
   │                                    │                              │
   │                                    │  200 { valid: true, mis... }│
   │                                    │ ◄────────────────────────────│
   │                                    │                              │
   │                                    │  Execute business logic      │
   │  200 { ... result ... }            │                              │
   │ ◄───────────────────────────────── │                              │
```

---

## Implementation examples

### cURL (what your MS runs internally)

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

### TypeScript (reusable function)

```typescript
const CLARISA_BASE_URL = process.env.CLARISA_BASE_URL!;
const MICROSERVICE_NAME = process.env.MICROSERVICE_NAME!;

interface ValidationResult {
  valid: true;
  mis?: { id: number; name: string; acronym: string };
  environment?: string;
  scopes?: string[];
}

export async function validateClientApiKey(
  apiKey: string,
  endpointAccessed: string,
  requiredScope: string,
  clientIp?: string,
): Promise<ValidationResult> {
  const res = await fetch(`${CLARISA_BASE_URL}/api/auth/validate-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey.trim(),
      required_scope: requiredScope,
      microservice_name: MICROSERVICE_NAME,
      endpoint_accessed: endpointAccessed,
      ip_address: clientIp,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (res.status === 429) {
    throw new ServiceUnavailableError('CLARISA validation rate limited');
  }

  const body = await res.json();

  if (!res.ok || !body.valid) {
    throw new UnauthorizedError(body.error ?? 'Invalid API key');
  }

  return body;
}
```

### Express — example middleware

```typescript
import { Request, Response, NextFunction } from 'express';

const SCOPE_BY_ROUTE: Record<string, string> = {
  'POST /api/email/send': 'email:send',
  'GET /api/email/status': 'email:status',
};

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('X-API-Key')?.trim();
  if (!apiKey) {
    return res.status(401).json({ message: 'Missing X-API-Key header' });
  }

  const routeKey = `${req.method} ${req.path}`;
  const requiredScope = SCOPE_BY_ROUTE[routeKey];
  const clientIp =
    (req.header('X-Forwarded-For') ?? '').split(',')[0].trim() || req.ip;

  validateClientApiKey(apiKey, req.path, requiredScope, clientIp)
    .then((auth) => {
      (req as any).clarisaAuth = auth; // mis, environment, scopes
      next();
    })
    .catch(() => res.status(401).json({ message: 'Unauthorized' }));
}
```

### NestJS — example guard

```typescript
@Injectable()
export class ClarisaApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const requiredScope = this.reflector.get<string>(
      'REQUIRED_SCOPE',
      context.getHandler(),
    );

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip;

    const auth = await validateClientApiKey(
      apiKey,
      req.path,
      requiredScope,
      clientIp,
    );

    (req as any).clarisaAuth = auth;
    return true;
  }
}

// In the handler:
@Post('send')
@UseGuards(ClarisaApiKeyGuard)
@SetMetadata('REQUIRED_SCOPE', 'email:send')
async send(@Req() req) {
  const consumer = req.clarisaAuth.mis?.acronym; // e.g. "PRMS"
  // ...
}
```

---

## Per-endpoint mapping for your MS

Define a table like this in your code or config:

| Method | Route on your MS | `required_scope` | `endpoint_accessed` (value to send) |
|--------|------------------|------------------|-------------------------------------|
| `POST` | `/api/email/send` | `email:send` | `/api/email/send` |
| `GET` | `/api/email/status/:id` | `email:status` | `/api/email/status` |

Rules:

- A distinct scope per distinct operation.
- `endpoint_accessed` must be stable (ideally the handler route, not dynamic URLs with IDs).

---

## Integration checklist

- [ ] Client sends `X-API-Key` on protected routes.
- [ ] MS calls `POST {CLARISA_BASE_URL}/api/auth/validate-api-key` before processing.
- [ ] Body includes the 3 required fields: `api_key`, `microservice_name`, `endpoint_accessed`.
- [ ] Body includes `required_scope` matching the endpoint.
- [ ] Body includes client `ip_address` if the key may have a whitelist.
- [ ] `microservice_name` is constant (environment variable).
- [ ] 401 to client if CLARISA returns `valid: false`.
- [ ] Do not log the full key (at most the first 16 chars: `cl_prod_9f8d7e6c`).
- [ ] 2–5 s timeout toward CLARISA; do not retry on 401.
- [ ] Optional 30–60 s cache per key+scope; invalidate on any 401.

---

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| Always 401 `Invalid API key` | Key from wrong environment (DEV vs PROD) | Use key with correct prefix (`cl_prod_` vs `cl_dev_`) |
| 401 `Missing required scope` | Key missing endpoint permission | Admin must add scope when creating/editing the key |
| 401 `IP address is not allowed` | Client `ip_address` not sent | Forward real client IP in the body |
| 429 from CLARISA | Too many validations | Short cache or reduce redundant calls |
| Local validation with regex | Anti-pattern | Always call CLARISA |

---

## Obtaining an API key (not your responsibility, but you should know)

A CLARISA admin creates the key with:

```http
POST /api/api-keys/create
Authorization: Bearer {jwt-admin}
```

Example body for consuming your email MS:

```json
{
  "name": "PRMS - Email PROD",
  "environment": "PROD",
  "mis_id": 12,
  "scopes": ["email:send", "email:status"]
}
```

The response includes `"key": "cl_prod_..."` **only once**. The consumer team configures that value in their client; you only receive and validate it.
