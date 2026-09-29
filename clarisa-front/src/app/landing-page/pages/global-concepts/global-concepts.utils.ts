import { HttpErrorResponse } from '@angular/common/http';

/** The scheme the page opens on; any other one is reached with `?scheme=`. */
export const DEFAULT_SCHEME = 'meliaf';

/** Same cap as the back (`MAX_SUGGEST_TEXT`, concepts-suggest.service.ts). */
export const MAX_SUGGEST_TEXT = 20000;

/** Base path of every link of this section. */
export const GC_BASE = '/landing-page/global-concepts';

export interface ListOption {
  value: string;
  label: string;
}

export type ListsByCode = Record<string, ListOption[]>;

/**
 * The controlled lists grouped by list code.
 *
 * `GET api/meliaf-taxonomy/lists` answers an object keyed by list code
 * (`concepts-read.service.ts` `lists()`), while the shared client types it as
 * a flat `ListValue[]`. Both shapes are accepted so the page keeps working
 * whichever of the two is corrected.
 */
export function normalizeLists(raw: unknown): ListsByCode {
  const out: ListsByCode = {};
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const code = row?.list_code;
      if (typeof code !== 'string' || typeof row?.value !== 'string') continue;
      (out[code] ??= []).push({ value: row.value, label: typeof row.label === 'string' ? row.label : row.value });
    }
    return out;
  }
  if (raw && typeof raw === 'object') {
    for (const [code, values] of Object.entries(raw as Record<string, unknown>)) {
      if (!Array.isArray(values)) continue;
      out[code] = values
        .filter(v => typeof v?.value === 'string')
        .map(v => ({ value: v.value, label: typeof v.label === 'string' ? v.label : v.value }));
    }
  }
  return out;
}

/** The readable label of a controlled value; the raw value when the list does not know it. */
export function labelOf(lists: ListsByCode, code: string, value: string | null | undefined): string {
  if (!value) return '';
  return lists[code]?.find(option => option.value === value)?.label ?? value;
}

/**
 * A link only when it resolves to http(s). Values reach this page from an
 * import or an editor, so a `javascript:` URL is shown as text, never bound.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  const candidate = (url ?? '').trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : null;
  } catch {
    return null;
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * `2026-09-25` or an ISO timestamp -> "25 September 2026". Parsed by parts:
 * `new Date('2026-09-25')` is UTC midnight and prints the previous day west of
 * Greenwich, Cali included.
 */
export function dateLabel(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  // A timestamp names an instant: show the reader's local day (21:00 in Cali is
  // still today). A bare YYYY-MM-DD is a calendar day and is shown as is.
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const at = new Date(raw);
    if (!Number.isNaN(at.getTime())) {
      const name = MONTHS[at.getMonth()];
      return `${at.getDate()} ${name} ${at.getFullYear()}`;
    }
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  return name ? `${Number(day)} ${name} ${year}` : raw;
}

/** The first readable sentence the back sent, through its error envelope. */
function backMessage(error: HttpErrorResponse): string | null {
  const body = error?.error;
  const candidates = [body?.response?.response?.message, body?.response?.message, body?.message];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length && candidate.every(item => typeof item === 'string')) {
      return candidate.join('. ');
    }
    if (typeof candidate === 'string' && candidate.trim() && !/exception$/i.test(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
}

/**
 * What to tell a reader when a call fails: what happened and what to do.
 * `fallback400` replaces a 400 whose message the back did not spell out.
 */
export function humanError(error: HttpErrorResponse, context: { notFound?: string; fallback400?: string } = {}): string {
  switch (error?.status) {
    case 0:
      return 'CLARISA could not be reached. Check your connection and try again.';
    case 400:
      return backMessage(error) ?? context.fallback400 ?? 'Some of the information is not valid. Review the fields and try again.';
    case 403:
      return 'This link does not give access to this request. Open the latest link we emailed you.';
    case 404:
      return context.notFound ?? 'We could not find what you were looking for. It may have been removed or the link may be incomplete.';
    case 429:
      return 'Too many attempts in a short time. Wait a few minutes and try again.';
    default:
      return 'Something went wrong on our side. Try again in a few minutes.';
  }
}

// ------------------------------------------------------------ session storage

/** Follow-up token of a request, kept for this browser tab only. */
export const accessKey = (id: number | string) => `gc-request-access-${id}`;

/** Request id already obtained from a one-time confirmation link. */
export const verifiedKey = (token: string) => `gc-request-verified-${token}`;

export function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the page still works from the email link.
  }
}

// ------------------------------------------------------------ clipboard and anchors

/** Copies a text; resolves `false` when the browser refuses (no permission, old engine). */
export function copyText(text: string): Promise<boolean> {
  const fallback = () => {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(area);
    }
  };
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => fallback()
    );
  }
  return Promise.resolve(fallback());
}

/**
 * Scrolls to an in-page section. The router does not scroll to fragments
 * (`anchorScrolling` is off app-wide), so the documentation pages do it on
 * each fragment change, which also makes a shared `#section` link land.
 */
export function scrollToSection(id: string | null | undefined, smooth = true): void {
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
}
