/** Path only: no query string, no trailing slash (except the root). */
export function normalizeEndpoint(endpoint: string | null | undefined): string {
  const path = (endpoint ?? '').trim().split('?')[0];
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * Returns true when the endpoint is allowed. Empty allowlist means no
 * restriction, the same rule as `allowed_ips`, so keys created before the
 * column existed keep working until someone sets their list.
 *
 * Exact match on purpose: `/api/qa/results` does not cover
 * `/api/qa/results/intake`; each route is granted on its own.
 */
export function isEndpointAllowed(
  endpoint: string | null | undefined,
  allowedEndpoints: string[] | null | undefined,
): boolean {
  if (!allowedEndpoints?.length) {
    return true;
  }

  const path = normalizeEndpoint(endpoint);
  if (!path) {
    return false;
  }

  return allowedEndpoints.some((rule) => normalizeEndpoint(rule) === path);
}
