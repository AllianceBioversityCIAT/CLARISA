/**
 * Extracts a readable message out of a CLARISA API error.
 *
 * The back wraps exceptions twice (`ExceptionsFilter` + `ResponseFormattingInterceptor`),
 * so a validation failure arrives as:
 *
 * ```json
 * { "response": { "response": { "message": ["The term is required"] } },
 *   "message": "Bad Request Exception" }
 * ```
 *
 * Reading only the top-level `message` would surface the useless
 * "Bad Request Exception", so the innermost message wins and arrays are joined.
 */
export function apiErrorMessage(error: any, fallback = 'Request failed'): string {
  const candidates = [error?.error?.response?.response?.message, error?.error?.response?.message, error?.error?.message, error?.message];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) {
      return candidate.join(' · ');
    }
    // "Bad Request Exception" is the generic wrapper; keep looking for a real one.
    if (typeof candidate === 'string' && candidate.trim() && !/^[A-Za-z ]+Exception$/.test(candidate.trim())) {
      return candidate.trim();
    }
  }

  return fallback;
}
