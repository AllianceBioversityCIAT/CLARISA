import { TimeoutError } from 'rxjs';

export const GENERIC_ERROR = 'Could not complete the request. Try again.';
export const TIMEOUT_ERROR = 'The server is taking too long to answer.';
export const UNAVAILABLE_ERROR = 'Control lists are temporarily unavailable. Try again in a moment.';

export interface ApiErrorInfo {
  status: number;
  /** What to show next to the form. */
  message: string;
  /** Only the retype 409 carries it: the number of records the change would alter. */
  affected: number | null;
  /**
   * The write may or may not have been applied (network failure, 5xx, or a 409
   * while another change settles): what is on screen must be read again.
   */
  unsettled: boolean;
}

function asText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const joined = value.filter(v => typeof v === 'string' && v.trim()).join(' · ');
    return joined || null;
  }
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * Reads a failed call. The back answers `{ message, status, path }`, and the
 * retype 409 nests `{ message: { message, affected } }`; the same body can also
 * sit one level down under `response`. 4xx shows what the back said; a network
 * failure or a 5xx shows a generic line, and a call that never answered says so. A 503 the back wrote itself keeps its
 * text: it says the result is confirmed on its own and when to look again.
 */
export function readApiError(err: unknown): ApiErrorInfo {
  // The service gives up on a call after `REQUEST_TIMEOUT_MS`: for a write the outcome is unknown.
  if (err instanceof TimeoutError || (err as { name?: string } | null)?.name === 'TimeoutError') {
    return { status: 0, message: TIMEOUT_ERROR, affected: null, unsettled: true };
  }
  const e = err as { status?: number; error?: unknown } | null;
  const status = typeof e?.status === 'number' ? e.status : 0;
  const body = e?.error as Record<string, unknown> | string | null | undefined;
  if (status === 503) {
    const said = body && typeof body === 'object' ? asText(body['message']) : null;
    return { status, message: said ?? UNAVAILABLE_ERROR, affected: null, unsettled: true };
  }
  if (status < 400 || status >= 500) return { status, message: GENERIC_ERROR, affected: null, unsettled: true };

  const levels: Record<string, unknown>[] = [];
  if (body && typeof body === 'object') {
    levels.push(body);
    const inner = (body as Record<string, unknown>)['response'];
    if (inner && typeof inner === 'object') levels.push(inner as Record<string, unknown>);
  }

  let message: string | null = typeof body === 'string' ? asText(body) : null;
  let affected: number | null = null;
  for (const level of levels) {
    const raw = level['message'];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const nested = raw as Record<string, unknown>;
      message = message ?? asText(nested['message']);
      affected = affected ?? asNumber(nested['affected']);
    } else {
      message = message ?? asText(raw);
    }
    affected = affected ?? asNumber(level['affected']);
  }
  return { status, message: message ?? GENERIC_ERROR, affected, unsettled: status === 409 };
}
