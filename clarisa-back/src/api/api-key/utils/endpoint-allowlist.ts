/** Path only: no query string, no trailing slash (except the root). */
export function normalizeEndpoint(endpoint: string | null | undefined): string {
  const path = (endpoint ?? '').trim().split('?')[0];
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * Returns true when the key is granted the endpoint. A grant is explicit: a
 * key without a list is granted nothing. It never makes the key invalid; the
 * calling service decides which of its routes require the grant.
 *
 * Exact match on purpose: `/api/qa/results` does not cover
 * `/api/qa/results/intake`; each route is granted on its own.
 */
export function isEndpointGranted(
  endpoint: string | null | undefined,
  allowedEndpoints: string[] | null | undefined,
): boolean {
  const path = normalizeEndpoint(endpoint);
  if (!path || !allowedEndpoints?.length) {
    return false;
  }

  return allowedEndpoints.some((rule) => normalizeEndpoint(rule) === path);
}
