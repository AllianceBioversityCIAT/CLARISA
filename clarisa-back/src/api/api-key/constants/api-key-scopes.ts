export interface ApiKeyScopeDefinition {
  value: string;
  label: string;
  description: string;
  group: 'CLARISA API' | 'Microservices';
}

/**
 * Canonical API key scopes. Permissions for CLARISA internal endpoints and
 * capabilities exposed by satellite microservices (validated via validate-api-key).
 * Not MIS identifiers — use mis_id for consumer identity.
 */
export const API_KEY_SCOPE_CATALOG: ApiKeyScopeDefinition[] = [
  {
    value: 'institutions:read',
    label: 'Institutions — read',
    description: 'Read institutions and related reference data',
    group: 'CLARISA API',
  },
  {
    value: 'partner-requests:read',
    label: 'Partner requests — read',
    description: 'List and view partner institution requests',
    group: 'CLARISA API',
  },
  {
    value: 'partner-requests:create',
    label: 'Partner requests — create',
    description: 'Create or update partner institution requests',
    group: 'CLARISA API',
  },
  {
    value: 'mises:read',
    label: 'MIS registry — read',
    description: 'Read MIS registry entries',
    group: 'CLARISA API',
  },
  {
    value: 'environments:read',
    label: 'Environments — read',
    description: 'Read environment catalog (DEV, PROD, etc.)',
    group: 'CLARISA API',
  },
  {
    value: 'toc:read',
    label: 'Theory of Change — read',
    description: 'Read ToC results and related data',
    group: 'CLARISA API',
  },
  {
    value: 'toc:write',
    label: 'Theory of Change — write',
    description: 'Create or update ToC-related resources',
    group: 'CLARISA API',
  },
  {
    value: 'email:send',
    label: 'Email service — send',
    description: 'Send email via the email microservice flow',
    group: 'Microservices',
  },
  {
    value: 'email:status',
    label: 'Email service — status',
    description: 'Query email delivery status',
    group: 'Microservices',
  },
  {
    value: 'auth:validate-key',
    label: 'Auth — validate API keys',
    description: 'Allow microservices to validate API keys against CLARISA',
    group: 'Microservices',
  },
];

export const API_KEY_SCOPE_VALUES = API_KEY_SCOPE_CATALOG.map((s) => s.value);

export function isKnownApiKeyScope(scope: string): boolean {
  return API_KEY_SCOPE_VALUES.includes(scope);
}

export function assertKnownApiKeyScopes(scopes?: string[]): void {
  if (!scopes?.length) {
    return;
  }
  const unknown = scopes.filter((s) => !isKnownApiKeyScope(s));
  if (unknown.length) {
    throw new Error(
      `Unknown scope(s): ${unknown.join(', ')}. Use GET /api/api-keys/scopes for allowed values.`,
    );
  }
}
