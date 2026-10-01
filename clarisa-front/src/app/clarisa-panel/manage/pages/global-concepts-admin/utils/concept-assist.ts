import { ConceptsAssistEdit, ConceptsAssistMessage, CustomField } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../glossary-admin/utils/api-error-message';
import { isMultiType } from './custom-fields';

/**
 * Pure pieces of the concept assistant (openspec/changes/add-roles-users-admin/
 * assistant-contract.md): which fields it may touch, how a value is coerced to
 * what the control binds, the ordered log of hand edits, the typing rhythm and
 * the human error lines. The dialog and the chat panel only wire them.
 */

export type AssistTab = 'details' | 'fields';
/** `text` is typed letter by letter; `single` and `multi` are set in one go. */
export type AssistKind = 'text' | 'single' | 'multi';

export interface AssistFieldMeta {
  field: string;
  label: string;
  tab: AssistTab;
  /** `id` of the control (or its inputId); the ring goes on its `.field` wrapper. */
  elementId: string;
  kind: AssistKind;
  /** List whose labels name the codes (core list fields and list-typed custom fields). */
  listCode?: string | null;
  /** Custom `term_link` fields hold term ids (numbers), everything else strings. */
  numeric?: boolean;
}

/**
 * Core fields of the contract whitelist that the full editor draws. The
 * contract also names `meliaf_phase_also`, which this form has no control for:
 * a step on it is reported as not placed, never written somewhere else.
 */
export const CORE_ASSIST_FIELDS: AssistFieldMeta[] = [
  { field: 'preferred_label', label: 'Preferred label', tab: 'details', elementId: 'gc-label', kind: 'text' },
  { field: 'definition', label: 'Definition', tab: 'details', elementId: 'gc-definition', kind: 'text' },
  { field: 'short_definition', label: 'Short definition', tab: 'details', elementId: 'gc-short_definition', kind: 'text' },
  { field: 'scope_note', label: 'Scope note', tab: 'details', elementId: 'gc-scope_note', kind: 'text' },
  { field: 'example_of_use', label: 'Example of use', tab: 'details', elementId: 'gc-example_of_use', kind: 'text' },
  { field: 'term_type', label: 'Term type', tab: 'details', elementId: 'gc-term-type', kind: 'single', listCode: 'term_type' },
  { field: 'meliaf_function', label: 'MELIAF function', tab: 'details', elementId: 'gc-function', kind: 'multi', listCode: 'meliaf_function' },
  { field: 'meliaf_phase_primary', label: 'Primary MELIAF phase', tab: 'details', elementId: 'gc-phase', kind: 'single', listCode: 'meliaf_phase' },
  { field: 'derivation', label: 'Derivation', tab: 'details', elementId: 'gc-derivation', kind: 'single', listCode: 'derivation' },
  { field: 'source_citation', label: 'Source citation', tab: 'details', elementId: 'gc-citation', kind: 'text' },
  { field: 'source_url', label: 'Source URL', tab: 'details', elementId: 'gc-url', kind: 'text' },
  { field: 'steward', label: 'Steward', tab: 'details', elementId: 'gc-steward', kind: 'text' },
  { field: 'notes', label: 'Internal notes', tab: 'details', elementId: 'gc-notes', kind: 'text' }
];

export const CUSTOM_PREFIX = 'x:';

export function customMeta(field: CustomField): AssistFieldMeta {
  const kind: AssistKind =
    field.type === 'text' || field.type === 'long_text' || field.type === 'url' ? 'text' : isMultiType(field.type) ? 'multi' : 'single';
  return {
    field: `${CUSTOM_PREFIX}${field.code}`,
    label: field.label,
    tab: 'fields',
    elementId: `gc-x-${field.code}`,
    kind,
    listCode: field.list_code,
    numeric: field.type === 'term_link' || field.type === 'number'
  };
}

/** Whitelist of this dialog session: the core fields plus the ACTIVE custom fields already loaded. */
export function assistFields(customFields: CustomField[]): AssistFieldMeta[] {
  return [...CORE_ASSIST_FIELDS, ...(customFields ?? []).filter(field => field.is_active).map(customMeta)];
}

/** The value in the shape its control binds: text never null, lists as arrays, numbers as numbers. */
export function coerceValue(meta: AssistFieldMeta, value: unknown): unknown {
  if (meta.kind === 'multi') {
    const list = Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value];
    return meta.numeric ? list.map(Number).filter(id => Number.isFinite(id) && id > 0) : list.map(item => String(item));
  }
  if (meta.kind === 'single') {
    if (value === null || value === undefined || value === '') return meta.numeric ? null : meta.field.startsWith(CUSTOM_PREFIX) ? '' : null;
    if (meta.numeric) return Number.isFinite(Number(value)) ? Number(value) : null;
    return String(value);
  }
  return value === null || value === undefined ? '' : String(value);
}

export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function cloneValue<T>(value: T): T {
  return Array.isArray(value) ? ([...value] as unknown as T) : value;
}

// ------------------------------------------------------------- edit log

/**
 * What the person changed by hand, in order. Consecutive changes to the same
 * field fold into one entry (typing a word is one edit, not twenty), keeping
 * the value from before the first keystroke; a field brought back to where it
 * started drops out. Only the entries since the last answered turn are pending.
 */
export class AssistEditLog {
  private seq = 0;
  private entries: ConceptsAssistEdit[] = [];

  record(field: string, tab: string, before: unknown, after: unknown, at = new Date().toISOString()): void {
    const last = this.entries[this.entries.length - 1];
    if (last && last.field === field) {
      if (sameValue(last.before, after)) this.entries.pop();
      else {
        last.after = cloneValue(after);
        last.at = at;
      }
      return;
    }
    if (sameValue(before, after)) return;
    this.entries.push({ seq: ++this.seq, field, tab, before: cloneValue(before), after: cloneValue(after), at });
  }

  /** The log sent with a turn: the contract caps it at 50, the most recent win. */
  pending(): ConceptsAssistEdit[] {
    return this.entries.slice(-50).map(entry => ({ ...entry }));
  }

  get size(): number {
    return this.entries.length;
  }

  fields(): string[] {
    return this.entries.map(entry => entry.field);
  }

  /** A turn answered: what it carried is known to the agent; edits made while it was in flight stay. */
  clearUpTo(seq: number): void {
    this.entries = this.entries.filter(entry => entry.seq > seq);
  }

  clear(): void {
    this.entries = [];
    this.seq = 0;
  }
}

// --------------------------------------------------------------- typing

export const TYPE_TICK_MS = 30;
export const TYPE_MAX_MS = 1200;
export const BLINK_MS = 1200;

/** Prefix lengths to write, one per 30 ms tick, so any text lands within 1.2 s. */
export function typingPlan(length: number): number[] {
  if (length <= 0) return [0];
  const ticks = Math.max(1, Math.min(length, Math.floor(TYPE_MAX_MS / TYPE_TICK_MS)));
  const step = Math.ceil(length / ticks);
  const plan: number[] = [];
  for (let n = step; n < length; n += step) plan.push(n);
  plan.push(length);
  return plan;
}

// ------------------------------------------------------------- messages

export const ASSIST_HISTORY_MAX = 20;
export const ASSIST_MESSAGE_MAX = 4000;

export function historyForTurn(messages: ConceptsAssistMessage[]): ConceptsAssistMessage[] {
  return messages.slice(-ASSIST_HISTORY_MAX).map(message => ({ role: message.role, content: message.content.slice(0, ASSIST_MESSAGE_MAX) }));
}

export const ASSIST_SUGGESTIONS = ['Help me write the definition', 'Suggest term type and MELIAF function', 'Review the whole concept'];

/** What the person reads when a turn fails. The 503 carries the back's own sentence (disabled, monthly cap). */
export function assistErrorMessage(error: any): string {
  switch (error?.status) {
    case 429:
      return 'Too many messages in a short time. Wait a few minutes and send it again — your text is back in the box.';
    case 502:
      return 'The AI answered with something unusable. Nothing in the form changed; try again.';
    case 503:
      return apiErrorMessage(error, 'The assistant is not available right now. The form still works as usual.');
    case 0:
      return 'No connection to CLARISA. Check your network and send it again.';
    default:
      return apiErrorMessage(error, 'The assistant could not answer. Try again.');
  }
}

/** "Definition → Scope note → Term type": the strip above the input. */
export function editTrail(fields: string[], label: (field: string) => string): string {
  return fields.map(label).join(' → ');
}
