import { GcField, GcFieldType } from '../entities/gc-field.entity';
import { ASSIST_MAX_STEPS } from '../dto/assistant.dto';
import { CUSTOM_COLUMN_PREFIX, isHttpUrl, isRealDay } from './custom-fields';

/**
 * Pure pieces of the concept assistant (assistant-contract.md): the fields it
 * may propose, the system prompt, the JSON schema of its answer and the
 * server-side sanitizer that the answer always goes through. Nothing here
 * touches the database or the network, so every rule is unit-testable.
 */

export type AssistTab = 'details' | 'fields';
type Kind =
  | 'text'
  | 'url'
  | 'list'
  | 'multi_list'
  | 'multi_text'
  | 'date'
  | 'number';

export interface AssistField {
  field: string;
  label: string;
  kind: Kind;
  /** Controlled list of a list-typed field. */
  list?: string;
  /** Max characters of a text (the DTO limit; 8000 where the DTO has none). */
  max?: number;
  /** Max items of an array value. */
  maxItems?: number;
  meaning: string;
  tab: AssistTab;
}

/**
 * Safety cap for texts the DTO leaves unbounded (definition, scope note...):
 * the same 8000 the AI draft route accepts as input.
 */
export const UNBOUNDED_TEXT_MAX = 8000;
const CUSTOM_TEXT_MAX = 1000;
const CUSTOM_LONG_TEXT_MAX = 20000;
const CUSTOM_MAX_ITEMS = 100;
const REASON_MAX = 500;
const REPLY_MAX = 4000;

/**
 * The built-in whitelist. Meanings are the front's tooltips
 * (`clarisa-front/.../global-concepts-admin/utils/field-info.ts`), so the
 * model reads the same explanation as the editor; phase_also has no
 * tooltip there and is written here.
 */
export const ASSIST_FIELDS: AssistField[] = [
  {
    field: 'preferred_label',
    label: 'Preferred label',
    kind: 'text',
    max: 500,
    tab: 'details',
    meaning:
      'The main name of the concept, as readers see it on the public page and in the API, e.g. “Theory of Change”. Up to 500 characters.',
  },
  {
    field: 'definition',
    label: 'Definition',
    kind: 'text',
    max: UNBOUNDED_TEXT_MAX,
    tab: 'details',
    meaning:
      'The full meaning of the concept, e.g. “A description of how and why a set of activities is expected to lead to the desired change.” Published with the concept.',
  },
  {
    field: 'short_definition',
    label: 'Short definition',
    kind: 'text',
    max: 500,
    tab: 'details',
    meaning:
      'A one-line version of the definition, used in tooltips and compact lists, e.g. “How activities are expected to lead to change.” Up to 500 characters.',
  },
  {
    field: 'scope_note',
    label: 'Scope note',
    kind: 'text',
    max: UNBOUNDED_TEXT_MAX,
    tab: 'details',
    meaning:
      'When and how to use the term, and what it does not cover, e.g. “Use for programme-level logic; for one project use Results framework.”',
  },
  {
    field: 'example_of_use',
    label: 'Example of use',
    kind: 'text',
    max: UNBOUNDED_TEXT_MAX,
    tab: 'details',
    meaning:
      'A sentence that uses the term in context, e.g. “The team revised its theory of change after the mid-term review.”',
  },
  {
    field: 'term_type',
    label: 'Term type',
    kind: 'list',
    list: 'term_type',
    tab: 'details',
    meaning:
      'The kind of term, picked from the “term type” controlled list. Readers and the API can filter concepts by it.',
  },
  {
    field: 'functions',
    label: 'Function',
    kind: 'multi_list',
    list: 'functions',
    maxItems: 10,
    tab: 'details',
    meaning:
      'The function(s) the concept serves: Monitoring, Evaluation, Learning, Impact assessment or Foresight. Pick one or more; readers and the API can filter by it.',
  },
  {
    field: 'phase_primary',
    label: 'Phase (primary)',
    kind: 'list',
    list: 'phase',
    tab: 'details',
    meaning:
      'The main phase of the cycle where the concept is used, from the “Phase” list. In the concepts Excel it is usually the PARENT TERM column.',
  },
  {
    field: 'phase_also',
    label: 'Phase (also)',
    kind: 'multi_list',
    list: 'phase',
    maxItems: 10,
    tab: 'details',
    meaning:
      'Other phases of the cycle where the concept is also used, from the same “Phase” list; never repeat the primary phase.',
  },
  {
    field: 'derivation',
    label: 'Derivation',
    kind: 'list',
    list: 'derivation',
    tab: 'details',
    meaning:
      'How the term was obtained, from the “derivation” list, e.g. adopted as-is from a source or adapted from one.',
  },
  {
    field: 'source_citation',
    label: 'Source citation',
    kind: 'text',
    max: UNBOUNDED_TEXT_MAX,
    tab: 'details',
    meaning:
      'Where the definition comes from, written as a reference, e.g. “OECD DAC (2023). Glossary of Key Terms in Evaluation.”',
  },
  {
    field: 'source_url',
    label: 'Source URL',
    kind: 'url',
    max: 1000,
    tab: 'details',
    meaning:
      'Web link to that source, starting with https://, e.g. https://www.oecd.org/dac/evaluation/. Up to 1,000 characters.',
  },
  {
    field: 'steward',
    label: 'Steward',
    kind: 'text',
    max: 255,
    tab: 'details',
    meaning:
      'Person or team responsible for keeping the term right, e.g. “MEL Community of Practice”. Up to 255 characters.',
  },
  {
    field: 'notes',
    label: 'Internal notes',
    kind: 'text',
    max: UNBOUNDED_TEXT_MAX,
    tab: 'details',
    meaning:
      'Notes for other admins, e.g. “Check the wording with the Evaluation Function before approving.” Never published: only admins see them.',
  },
];

const LIST_FIELD_MAX = 100; // gc_lists.value is varchar(100)

/** The scheme context the prompt and the sanitizer share. */
export interface AssistContext {
  scheme: { code: string; title: string; description?: string | null };
  /** Active list values by list code, in display order. */
  lists: Map<string, { value: string; label: string }[]>;
  /** Active custom fields of the scheme. */
  customFields: GcField[];
}

export interface AssistEdit {
  seq: number;
  field: string;
  tab: string;
  before?: unknown;
  after?: unknown;
  at: string;
}

export interface AssistStep {
  field: string;
  tab: AssistTab;
  value: unknown;
  reason: string;
}

/** Custom fields the assistant may fill: every active type but links to other concepts. */
export function customAssistFields(fields: GcField[]): AssistField[] {
  const out: AssistField[] = [];
  for (const f of [...fields].sort(
    (a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.code.localeCompare(b.code),
  )) {
    if (!f.is_active) continue;
    const base = {
      field: `${CUSTOM_COLUMN_PREFIX}${f.code}`,
      label: f.label,
      tab: 'fields' as AssistTab,
      meaning: f.help || `Custom field “${f.label}” of this scheme.`,
    };
    switch (f.type) {
      case GcFieldType.TEXT:
        out.push({ ...base, kind: 'text', max: CUSTOM_TEXT_MAX });
        break;
      case GcFieldType.LONG_TEXT:
        out.push({ ...base, kind: 'text', max: CUSTOM_LONG_TEXT_MAX });
        break;
      case GcFieldType.MULTI_TEXT:
        out.push({
          ...base,
          kind: 'multi_text',
          max: CUSTOM_TEXT_MAX,
          maxItems: CUSTOM_MAX_ITEMS,
        });
        break;
      case GcFieldType.URL:
        out.push({ ...base, kind: 'url', max: CUSTOM_TEXT_MAX });
        break;
      case GcFieldType.DATE:
        out.push({ ...base, kind: 'date' });
        break;
      case GcFieldType.NUMBER:
        out.push({ ...base, kind: 'number' });
        break;
      case GcFieldType.LIST:
        out.push({ ...base, kind: 'list', list: f.list_code ?? '' });
        break;
      case GcFieldType.MULTI_LIST:
        out.push({
          ...base,
          kind: 'multi_list',
          list: f.list_code ?? '',
          maxItems: CUSTOM_MAX_ITEMS,
        });
        break;
      // TERM_LINK: a concept id the model cannot know; never proposed.
    }
  }
  return out;
}

export const allAssistFields = (ctx: AssistContext) => [
  ...ASSIST_FIELDS,
  ...customAssistFields(ctx.customFields),
];

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
/** Values sent to the model: trimmed, e-mail addresses masked. */
const clip = (v: unknown, n = 2000): unknown => {
  if (typeof v === 'string') return v.replace(EMAIL, '[email]').slice(0, n);
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => clip(x, 300));
  if (v && typeof v === 'object') return clip(JSON.stringify(v), n);
  return v ?? null;
};

/** The draft reduced to whitelisted fields; custom values read from `x:<code>` or `extra`. */
export function draftForPrompt(
  ctx: AssistContext,
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const extra =
    draft?.extra &&
    typeof draft.extra === 'object' &&
    !Array.isArray(draft.extra)
      ? (draft.extra as Record<string, unknown>)
      : {};
  const out: Record<string, unknown> = {};
  for (const f of allAssistFields(ctx)) {
    const raw = f.field.startsWith(CUSTOM_COLUMN_PREFIX)
      ? (draft?.[f.field] ?? extra[f.field.slice(CUSTOM_COLUMN_PREFIX.length)])
      : draft?.[f.field];
    out[f.field] = clip(raw);
  }
  return out;
}

/** Edits in the order the person made them (by `seq`), trimmed. */
export const orderedEdits = (edits: AssistEdit[] | undefined) =>
  [...(edits ?? [])]
    .sort((a, b) => a.seq - b.seq)
    .map((e) => ({
      seq: e.seq,
      field: e.field,
      tab: e.tab,
      before: clip(e.before, 500),
      after: clip(e.after, 500),
      at: e.at,
    }));

/**
 * The system prompt: what Concepts is, every field with its meaning (and its
 * list codes), the draft, the ordered manual edits and the rules.
 */
export function buildAssistantPrompt(
  ctx: AssistContext,
  input: {
    draft: Record<string, unknown>;
    edits?: AssistEdit[];
    termId?: number;
  },
): string {
  const lines: string[] = [];
  lines.push(
    'You are the assistant beside the concept editor of Concepts in CLARISA, the CGIAR reference-data platform.',
    'Concepts is the official CGIAR controlled vocabulary (SKOS concepts) for monitoring, evaluation, learning, impact assessment and foresight: each concept has a preferred label, a definition and metadata that other CGIAR systems read through the API.',
    `Scheme: ${ctx.scheme.code} — ${ctx.scheme.title}.${ctx.scheme.description ? ` ${clip(ctx.scheme.description, 600)}` : ''}`,
    input.termId
      ? `The person is editing the existing concept with term id ${input.termId}.`
      : 'The person is creating a new concept.',
    '',
    'You only PROPOSE values. The person accepts or undoes each proposal and saves with the normal Save button; you never save anything.',
    '',
    'RULES',
    '1. Answer in the language the person writes in. Field values: in the language of the draft (English when the draft is empty), unless the person asks otherwise.',
    '2. Propose values only for the fields listed below, using their exact field names. Never invent other fields.',
    '3. List-typed fields take ONLY the codes listed for them (the part before “=”). If no code fits, do not propose the field; say so in the reply. Never invent a code.',
    "4. NEVER change a field that appears in MANUAL EDITS unless the person's latest message explicitly asks to change that field. If you think such a field could be better, suggest it in the reply instead of as a step. When the person does ask, set overrides_manual_edit to true for that step and say in its reason that they asked.",
    `5. At most ${ASSIST_MAX_STEPS} steps, one per field, in the order the person should review them. Respect each field's maximum length.`,
    '6. Do not invent sources, citations or URLs. Propose source_citation or source_url only when the person gave them or they are a well-known, verifiable reference; otherwise leave them out and say a source is still needed.',
    '7. A definition must not repeat the term it defines; give the genus and what distinguishes it. short_definition is one plain sentence of at most 200 characters, not starting with the term.',
    '8. Keep the reply short and concrete: what you proposed and why, and what the person still has to decide. Use an empty steps list when you only answer a question.',
    '',
    'FIELDS (field name — kind — meaning)',
  );
  for (const f of allAssistFields(ctx)) {
    const kind =
      f.kind === 'list'
        ? `one code of list "${f.list}"`
        : f.kind === 'multi_list'
          ? `array of codes of list "${f.list}"`
          : f.kind === 'multi_text'
            ? 'array of texts'
            : f.kind === 'date'
              ? 'date YYYY-MM-DD'
              : f.kind === 'number'
                ? 'number'
                : f.kind === 'url'
                  ? `http(s) URL, max ${f.max} chars`
                  : `text, max ${f.max} chars`;
    lines.push(`- ${f.field} — ${kind} — ${f.label}: ${f.meaning}`);
    if (f.list) {
      const values = ctx.lists.get(f.list) ?? [];
      lines.push(
        values.length
          ? `  codes: ${values.map((v) => `${v.value}=${v.label}`).join('; ')}`
          : '  codes: (this list has no active values; do not propose this field)',
      );
    }
  }
  if (!ctx.customFields.some((f) => f.is_active))
    lines.push('(This scheme has no active custom fields.)');
  const edits = orderedEdits(input.edits);
  lines.push(
    '',
    'CURRENT DRAFT (the form as it is now; null = empty)',
    JSON.stringify(draftForPrompt(ctx, input.draft)),
    '',
    'MANUAL EDITS (in the order the person made them)',
    edits.length ? JSON.stringify(edits) : '(none)',
  );
  return lines.join('\n');
}

/** Strict JSON schema of the model's answer (OpenAI structured output). */
export function assistantAnswerSchema(ctx: AssistContext) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'steps'],
    properties: {
      reply: { type: 'string' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['field', 'value', 'reason', 'overrides_manual_edit'],
          properties: {
            field: {
              type: 'string',
              enum: allAssistFields(ctx).map((f) => f.field),
            },
            value: {
              anyOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'array', items: { type: 'string' } },
                { type: 'null' },
              ],
            },
            reason: { type: 'string' },
            overrides_manual_edit: { type: 'boolean' },
          },
        },
      },
    },
  };
}

export interface RawAnswer {
  reply?: unknown;
  steps?: {
    field?: unknown;
    value?: unknown;
    reason?: unknown;
    overrides_manual_edit?: unknown;
  }[];
}

const norm = (v: string) => v.replace(/\s+/g, ' ').trim();
const k = (v: unknown) => norm(String(v ?? '')).toLowerCase();

/** A list value by code or label (case/space-insensitive) → the code, or undefined. */
function listCode(ctx: AssistContext, list: string, v: unknown) {
  if (typeof v !== 'string' && typeof v !== 'number') return undefined;
  const key = k(v);
  const hit = (ctx.lists.get(list) ?? []).find(
    (x) => k(x.value) === key || k(x.label) === key,
  );
  return hit?.value;
}

/** A value checked for its field; `undefined` = drop the step. */
function cleanValue(ctx: AssistContext, f: AssistField, raw: unknown): unknown {
  const text = (v: unknown, max: number) => {
    if (typeof v !== 'string' && typeof v !== 'number') return undefined;
    const t = String(v).trim();
    return t && t.length <= max ? t : undefined;
  };
  switch (f.kind) {
    case 'text':
      return Array.isArray(raw) ? undefined : text(raw, f.max ?? 1000);
    case 'url': {
      const t = Array.isArray(raw) ? undefined : text(raw, f.max ?? 1000);
      return t && isHttpUrl(t) ? t : undefined;
    }
    case 'date': {
      const t = Array.isArray(raw) ? undefined : text(raw, 10);
      return t && isRealDay(t) ? t : undefined;
    }
    case 'number': {
      const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
      return typeof n === 'number' && Number.isFinite(n) && raw !== ''
        ? n
        : undefined;
    }
    case 'list': {
      if (Array.isArray(raw)) return undefined;
      const t = text(raw, LIST_FIELD_MAX);
      return t === undefined ? undefined : listCode(ctx, f.list ?? '', t);
    }
    case 'multi_list': {
      const items = (Array.isArray(raw) ? raw : [raw])
        .map((x) => listCode(ctx, f.list ?? '', x))
        .filter((x): x is string => !!x);
      const unique = [...new Set(items)];
      return unique.length && unique.length <= (f.maxItems ?? 10)
        ? unique
        : undefined;
    }
    case 'multi_text': {
      const items = (Array.isArray(raw) ? raw : [raw]).map((x) =>
        text(x, f.max ?? 1000),
      );
      if (items.some((x) => x === undefined)) return undefined;
      const unique = [...new Set(items as string[])];
      return unique.length && unique.length <= (f.maxItems ?? 100)
        ? unique
        : undefined;
    }
  }
  return undefined;
}

/** Words that name a field in a message: its code, its code with spaces, its label. */
function fieldNames(f: AssistField): string[] {
  const code = f.field.replace(CUSTOM_COLUMN_PREFIX, '');
  return [...new Set([f.field, code, code.replace(/_/g, ' '), f.label])]
    .map((n) => k(n))
    .filter((n) => n.length >= 3);
}

/** True when the message names the field, so a change of a hand-edited field was asked. */
export function messageNamesField(message: string, f: AssistField): boolean {
  const text = ` ${k(message).replace(/[^\p{L}\p{N}_:]+/gu, ' ')} `;
  return fieldNames(f).some((n) =>
    text.includes(` ${n.replace(/[^\p{L}\p{N}_:]+/gu, ' ')} `),
  );
}

/**
 * The model's answer as the front may show it: known fields only, values
 * valid for their type (list codes of the scheme, DTO lengths), one step per
 * field, at most ASSIST_MAX_STEPS, and no step on a field the person edited
 * by hand unless their latest message names that field and the model flags
 * it as asked.
 */
export function sanitizeAnswer(
  ctx: AssistContext,
  raw: RawAnswer | null | undefined,
  input: { edits?: AssistEdit[]; lastUserMessage: string },
): { reply: string; steps: AssistStep[] } {
  const byField = new Map(allAssistFields(ctx).map((f) => [f.field, f]));
  const edited = new Set((input.edits ?? []).map((e) => e.field));
  const steps: AssistStep[] = [];
  const seen = new Set<string>();
  for (const s of Array.isArray(raw?.steps) ? raw.steps : []) {
    if (steps.length >= ASSIST_MAX_STEPS) break;
    const f = typeof s?.field === 'string' ? byField.get(s.field) : undefined;
    if (!f || seen.has(f.field)) continue;
    let reason = typeof s.reason === 'string' ? norm(s.reason) : '';
    if (edited.has(f.field)) {
      const asked =
        s.overrides_manual_edit === true &&
        messageNamesField(input.lastUserMessage, f);
      if (!asked) continue;
      if (!/\basked\b/i.test(reason))
        reason = `You asked to change this field you edited by hand. ${reason}`;
    }
    const value = cleanValue(ctx, f, s.value);
    if (value === undefined) continue;
    seen.add(f.field);
    steps.push({
      field: f.field,
      tab: f.tab,
      value,
      reason: reason.slice(0, REASON_MAX),
    });
  }
  const reply =
    typeof raw?.reply === 'string' ? raw.reply.trim().slice(0, REPLY_MAX) : '';
  return { reply, steps };
}

/**
 * Per-user sliding-window limit, in memory: per process, reset on restart,
 * not shared between instances. Enough to stop one person (or a stuck
 * client) from burning the monthly AI budget; the budget cap in
 * `gc_ai_usage` is the hard stop across instances.
 */
export class AssistRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    readonly limit = 20,
    readonly windowMs = 10 * 60_000,
  ) {}

  /** Records a turn; false when the user already used the window up. */
  take(user: string, now = Date.now()): boolean {
    const recent = (this.hits.get(user) ?? []).filter(
      (t) => now - t < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(user, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(user, recent);
    if (this.hits.size > 5000) this.prune(now);
    return true;
  }

  private prune(now: number) {
    for (const [u, list] of this.hits)
      if (!list.some((t) => now - t < this.windowMs)) this.hits.delete(u);
  }
}
