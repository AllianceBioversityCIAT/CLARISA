import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, In, Not } from 'typeorm';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcLabel } from '../entities/gc-label.entity';
import { GcProposal, GcProposalType } from '../entities/gc-proposal.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { IMPORT_FIELDS, IMPORT_FIELD_NAMES } from '../utils/import-fields';
import { AiService } from './ai.service';
import { ConceptsAdminService, LIST_FIELDS } from './concepts-admin.service';

const MAX_COLUMNS = 60;
const MAX_ROWS = 5;
const MAX_CELL = 200;
const MAX_VALUES = 200;

const cut = (v: unknown, n = MAX_CELL) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);
const key = (v: unknown) => cut(v, 500).toLowerCase();
const headerKey = (v: unknown) => key(v).replace(/[^a-z0-9]+/g, '');

export interface ColumnMatch {
  column: number;
  header: string;
  field: string | null;
  confidence: number;
  source: 'exact' | 'ai' | 'none';
}

export interface RequestCheck {
  check: string;
  ok: boolean;
  detail: string;
}

type Verdict = 'approve' | 'needs_changes' | 'reject';

/**
 * Advisory AI features (D8, D8b, D5b). Nothing here writes a concept: column
 * matches and list values go back to the wizard, where every selector stays
 * editable; a request recommendation is stored on the request and never
 * moves its state. A person always decides.
 */
@Injectable()
export class AiAssistService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ai: AiService,
    private readonly admin: ConceptsAdminService,
  ) {}

  /**
   * Headers + a few sample rows → one schema field per column. Exact header
   * matches are resolved without the model; the model only sees the rest,
   * and its answer is filtered to known fields, one column per field.
   */
  async mapColumns(headers: string[], rows: unknown[][] = []) {
    if (!Array.isArray(headers) || !headers.length)
      throw new BadRequestException('headers must be a non-empty list');
    const cols = headers.slice(0, MAX_COLUMNS).map((h) => cut(h, 100));
    const byKey = new Map(IMPORT_FIELD_NAMES.map((f) => [headerKey(f), f]));
    const result: ColumnMatch[] = cols.map((header, column) => {
      const exact = byKey.get(headerKey(header));
      return exact
        ? { column, header, field: exact, confidence: 1, source: 'exact' }
        : { column, header, field: null, confidence: 0, source: 'none' };
    });
    const taken = new Set(result.map((r) => r.field).filter(Boolean));
    const pending = result.filter((r) => !r.field && r.header);
    if (pending.length) {
      const samples = (Array.isArray(rows) ? rows : [])
        .slice(0, MAX_ROWS)
        .map((row) => (Array.isArray(row) ? row : []));
      const answer = await this.ai.json<{
        matches: { column: number; field: string; confidence: number }[];
      }>(
        'import_column_mapping',
        'You map spreadsheet columns to the fields of a taxonomy schema. ' +
          'Use the header and the sample values. Answer "none" when no field fits. ' +
          'Never map two columns to the same field. Confidence is 0 to 1.',
        {
          fields: IMPORT_FIELDS.filter((f) => !taken.has(f.field)),
          columns: pending.map((p) => ({
            column: p.column,
            header: p.header,
            samples: samples.map((row) => cut(row[p.column])).filter(Boolean),
          })),
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['matches'],
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['column', 'field', 'confidence'],
                properties: {
                  column: { type: 'integer' },
                  field: {
                    type: 'string',
                    enum: [...IMPORT_FIELD_NAMES, 'none'],
                  },
                  confidence: { type: 'number' },
                },
              },
            },
          },
        },
      );
      const best = [...(answer?.matches ?? [])]
        .filter(
          (m) =>
            IMPORT_FIELD_NAMES.includes(m.field) &&
            pending.some((p) => p.column === m.column),
        )
        .sort((a, b) => b.confidence - a.confidence);
      for (const m of best) {
        const slot = result[m.column];
        if (slot.field || taken.has(m.field)) continue;
        slot.field = m.field;
        slot.confidence = Math.max(0, Math.min(1, Number(m.confidence) || 0));
        slot.source = 'ai';
        taken.add(m.field);
      }
    }
    return { columns: result, fields: IMPORT_FIELDS };
  }

  /** Free-text cells → values of a controlled list, or null when none fits. */
  async normalizeValues(code: string, listCode: string, values: string[]) {
    if (!Array.isArray(values) || !values.length)
      throw new BadRequestException('values must be a non-empty list');
    const scheme = await this.scheme(code);
    const lists = await this.admin.loadLists(this.dataSource.manager, scheme);
    const list = lists.get(listCode);
    if (!list) throw new BadRequestException(`Unknown list "${listCode}"`);
    const allowed = [...new Set(list.values())];
    const distinct = [...new Set(values.map((v) => cut(v)).filter(Boolean))];
    const out = new Map<string, { value: string | null; source: string }>();
    const pending: string[] = [];
    for (const v of distinct.slice(0, MAX_VALUES)) {
      const hit = list.get(key(v));
      if (hit) out.set(v, { value: hit, source: 'exact' });
      else pending.push(v);
    }
    if (pending.length) {
      const answer = await this.ai.json<{
        values: { input: string; value: string }[];
      }>(
        'list_value_normalization',
        'Map each input to the one allowed value that means the same, or "none". ' +
          'Do not guess: spelling variants and plurals match, different concepts do not.',
        { allowed, inputs: pending },
        {
          type: 'object',
          additionalProperties: false,
          required: ['values'],
          properties: {
            values: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['input', 'value'],
                properties: {
                  input: { type: 'string' },
                  value: { type: 'string', enum: [...allowed, 'none'] },
                },
              },
            },
          },
        },
      );
      for (const m of answer?.values ?? []) {
        if (!pending.includes(m.input) || out.has(m.input)) continue;
        out.set(m.input, {
          value: allowed.includes(m.value) ? m.value : null,
          source: 'ai',
        });
      }
    }
    return {
      list: listCode,
      allowed,
      values: distinct.map((input) => ({
        input,
        ...(out.get(input) ?? { value: null, source: 'none' }),
      })),
    };
  }

  /**
   * Deterministic checks first, then the model's verdict over them. Stored on
   * the request as advisory; the state is never touched. The requester's
   * email never leaves CLARISA.
   */
  async recommend(proposalId: number) {
    const manager = this.dataSource.manager;
    const p = await manager.findOne(GcProposal, { where: { id: proposalId } });
    if (!p) throw new BadRequestException('Request not found');
    const scheme = await manager.findOne(GcScheme, {
      where: { id: p.scheme_id },
    });
    if (!scheme) throw new BadRequestException('Scheme not found');
    const payload = p.payload ?? {};
    const current = p.concept_id
      ? await manager.findOne(GcConcept, { where: { id: p.concept_id } })
      : null;
    const checks = await this.checks(p, scheme, payload, current);
    const similar = await this.similar(scheme, payload, current);

    const answer = await this.ai.json<{
      verdict: Verdict;
      summary: string;
      reasons: { kind: string; severity: string; message: string }[];
      suggested_changes: string;
    }>(
      'concept_request_recommendation',
      'You advise the editors of a controlled vocabulary (SKOS) on a change request. ' +
        'Check for duplicates of existing concepts, definition quality (circular, missing genus, ' +
        'vague), presence of a source, controlled-list values and conflicts with the current ' +
        'concept. Answer approve, needs_changes or reject with short, concrete reasons. ' +
        'You only advise; a person decides.',
      {
        request_type: p.type,
        rationale: cut(p.rationale, 2000),
        proposed: this.publicPayload(payload),
        current_concept: current
          ? {
              term_id: Number(current.term_id),
              preferred_label: current.preferred_label,
              definition: cut(current.definition, 2000),
              status: current.status,
            }
          : null,
        deterministic_checks: checks,
        similar_concepts: similar,
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['verdict', 'summary', 'reasons', 'suggested_changes'],
        properties: {
          verdict: {
            type: 'string',
            enum: ['approve', 'needs_changes', 'reject'],
          },
          summary: { type: 'string' },
          reasons: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['kind', 'severity', 'message'],
              properties: {
                kind: {
                  type: 'string',
                  enum: [
                    'duplicate',
                    'definition',
                    'source',
                    'list_values',
                    'conflict',
                    'other',
                  ],
                },
                severity: {
                  type: 'string',
                  enum: ['info', 'warning', 'blocking'],
                },
                message: { type: 'string' },
              },
            },
          },
          suggested_changes: { type: 'string' },
        },
      },
    );
    const recommendation = {
      advisory: true,
      verdict: (['approve', 'needs_changes', 'reject'] as Verdict[]).includes(
        answer?.verdict,
      )
        ? answer.verdict
        : 'needs_changes',
      summary: cut(answer?.summary, 2000),
      reasons: (answer?.reasons ?? []).slice(0, 20).map((r) => ({
        kind: cut(r.kind, 30),
        severity: cut(r.severity, 20),
        message: cut(r.message, 1000),
      })),
      suggested_changes: cut(answer?.suggested_changes, 2000),
      checks,
      similar: similar.map((s) => ({
        term_id: s.term_id,
        preferred_label: s.preferred_label,
      })),
      generated_at: new Date().toISOString(),
    };
    // Only this column: an AI answer must never move the request (D5b).
    await manager.update(
      GcProposal,
      { id: p.id },
      { ai_recommendation: recommendation },
    );
    return recommendation;
  }

  async checks(
    p: GcProposal,
    scheme: GcScheme,
    payload: Record<string, unknown>,
    current: GcConcept | null,
  ): Promise<RequestCheck[]> {
    const out: RequestCheck[] = [];
    const label = cut(payload.preferred_label ?? current?.preferred_label, 500);
    const definition = cut(payload.definition ?? current?.definition, 5000);
    if (p.type === GcProposalType.NEW || p.type === GcProposalType.EDIT) {
      out.push({
        check: 'definition_present',
        ok: !!definition,
        detail: definition ? 'Has a definition' : 'No definition',
      });
      const circular =
        !!label &&
        !!definition &&
        new RegExp(
          `\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
          'i',
        ).test(definition);
      out.push({
        check: 'definition_not_circular',
        ok: !circular,
        detail: circular
          ? 'The definition repeats the term it defines'
          : 'The definition does not repeat the term',
      });
      const hasSource = !!(
        cut(payload.source_citation ?? current?.source_citation) ||
        cut(payload.source_url ?? current?.source_url)
      );
      out.push({
        check: 'source_present',
        ok: hasSource,
        detail: hasSource ? 'Has a source' : 'No source citation or URL',
      });
      const lists = await this.admin.loadLists(this.dataSource.manager, scheme);
      const invalid: string[] = [];
      for (const [field, listCode] of Object.entries(LIST_FIELDS)) {
        const raw = payload[field];
        if (raw === undefined || raw === null || raw === '') continue;
        const list = lists.get(listCode);
        for (const v of Array.isArray(raw) ? raw : [raw]) {
          if (!list?.has(key(v))) invalid.push(`${field}: "${cut(v, 80)}"`);
        }
      }
      out.push({
        check: 'list_values_valid',
        ok: !invalid.length,
        detail: invalid.length
          ? `Not in the controlled lists: ${invalid.join(', ')}`
          : 'All list values are valid',
      });
    }
    if (p.type === GcProposalType.DEPRECATE) {
      const replacement = payload.replaced_by_term_id;
      out.push({
        check: 'replacement_given',
        ok: !!replacement,
        detail: replacement
          ? `Replaced by term ${replacement}`
          : 'No replacement concept given',
      });
    }
    return out;
  }

  /** Concepts of the scheme whose preferred or alternative labels look alike. */
  private async similar(
    scheme: GcScheme,
    payload: Record<string, unknown>,
    current: GcConcept | null,
  ) {
    const label = key(payload.preferred_label ?? current?.preferred_label);
    const words = label.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    if (!label) return [];
    const manager = this.dataSource.manager;
    const concepts = await manager.find(GcConcept, {
      where: {
        scheme_id: scheme.id,
        status: Not(GcConceptStatus.DEPRECATED),
        ...(current ? { id: Not(current.id) } : {}),
      },
    });
    const labels = concepts.length
      ? await manager.find(GcLabel, {
          where: { concept_id: In(concepts.map((c) => Number(c.id))) },
        })
      : [];
    const byConcept = new Map<number, string[]>();
    for (const l of labels) {
      const list = byConcept.get(Number(l.concept_id)) ?? [];
      list.push(key(l.label));
      byConcept.set(Number(l.concept_id), list);
    }
    const score = (c: GcConcept) => {
      const all = [
        key(c.preferred_label),
        ...(byConcept.get(Number(c.id)) ?? []),
      ];
      if (all.includes(label)) return 3;
      if (all.some((l) => l.includes(label) || label.includes(l))) return 2;
      return words.some((w) => all.some((l) => l.includes(w))) ? 1 : 0;
    };
    return concepts
      .map((c) => ({ c, s: score(c) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map(({ c }) => ({
        term_id: Number(c.term_id),
        preferred_label: c.preferred_label,
        definition: cut(c.definition, 600),
        status: c.status,
      }));
  }

  /** The payload without internal notes or anything personal. */
  private publicPayload(payload: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (k === 'notes' || /email/i.test(k)) continue;
      out[k] = typeof v === 'string' ? cut(v, 2000) : v;
    }
    return out;
  }

  private async scheme(code: string) {
    const scheme = await this.dataSource.manager.findOne(GcScheme, {
      where: { code: (code ?? '').toLowerCase() },
    });
    if (!scheme) throw new BadRequestException(`Unknown scheme "${code}"`);
    return scheme;
  }
}
