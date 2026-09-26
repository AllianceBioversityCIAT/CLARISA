import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcHistoryAction } from '../entities/gc-history.entity';
import { GcLabel, GcLabelKind } from '../entities/gc-label.entity';
import { GcRelationKind } from '../entities/gc-relation.entity';
import { GcScheme } from '../entities/gc-scheme.entity';
import { CreateConceptDto, UpdateConceptDto } from '../dto/concept-admin.dto';
import { IMPORT_FIELD_NAMES } from '../utils/import-fields';
import {
  ConceptsAdminService,
  GcActor,
  WRITABLE_FIELDS,
} from './concepts-admin.service';

export const MAX_IMPORT_ROWS = 2000;

export enum ImportAction {
  CREATE = 'create',
  UPDATE = 'update',
  SKIP = 'skip',
  INVALID = 'invalid',
}

export interface ImportRowResult {
  row: number;
  action: ImportAction;
  term_id: number | null;
  preferred_label: string;
  changes: string[];
  errors: string[];
  warnings: string[];
}

interface PlannedRow extends ImportRowResult {
  dto: CreateConceptDto;
  alt: string[];
  broader: string[];
  related: string[];
  concept: GcConcept | null;
}

const MULTI = new Set([
  'alternative_labels',
  'meliaf_function',
  'meliaf_phase_also',
  'broader_terms',
  'related_terms',
  'validated_by',
]);
const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;
const DERIVATION_PREFIXES: [RegExp, string][] = [
  [/^\s*(verbatim|quoted|taken)\s+from[:\s]+/i, 'verbatim_from_source'],
  [/^\s*adapted\s+from[:\s]+/i, 'adapted_from_source'],
  [
    /^\s*(consolidated|compiled)\s+from[:\s]+/i,
    'consolidated_from_several_sources',
  ],
  [/^\s*source[:\s]+/i, ''],
];

const norm = (v: string) => v.replace(/\s+/g, ' ').trim();
const key = (v: string) => norm(v).toLowerCase();

/** A cell as text, or undefined when empty (an empty cell never clears a field). */
const cell = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const text = String(v).trim();
  return text ? text : undefined;
};
const splitList = (v: unknown): string[] | undefined => {
  if (Array.isArray(v)) {
    const out = v.map((x) => cell(x)).filter((x): x is string => !!x);
    return out.length ? [...new Set(out.map(norm))] : undefined;
  }
  const text = cell(v);
  if (!text) return undefined;
  return [
    ...new Set(
      text
        .split(/[;|\n]+/)
        .map(norm)
        .filter(Boolean),
    ),
  ];
};
const flatten = (errors: ValidationError[]): string[] =>
  errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...flatten(e.children ?? []),
  ]);

/**
 * Bulk import of concepts (tasks 1.10, 1.10d). The wizard parses the file and
 * sends one object per row, keyed by schema field. `preview` computes the
 * plan without writing; `import` recomputes it under the scheme lock and
 * writes it in one transaction, all or nothing.
 *
 * Same rule as the glossary import (PR #193 review): a column that was not
 * mapped, or an empty cell, says nothing about that field — it never clears
 * a stored value. Clearing stays an edit in the concept form.
 */
@Injectable()
export class ConceptsImportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: ConceptsAdminService,
  ) {}

  async preview(code: string, rows: Record<string, unknown>[]) {
    const manager = this.dataSource.manager;
    const scheme = await manager.findOne(GcScheme, {
      where: { code: (code ?? '').toLowerCase() },
    });
    if (!scheme) throw new BadRequestException(`Unknown scheme "${code}"`);
    const plan = await this.plan(manager, scheme, rows);
    return {
      applied: false,
      summary: this.summary(plan),
      rows: plan.map(this.view),
    };
  }

  async import(
    code: string,
    rows: Record<string, unknown>[],
    actor: { email: string },
    skipInvalid = false,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const scheme = await this.admin.lockScheme(manager, code);
      const plan = await this.plan(manager, scheme, rows);
      const invalid = plan.filter((r) => r.action === ImportAction.INVALID);
      if (invalid.length && !skipInvalid) {
        throw new BadRequestException(
          `${invalid.length} row(s) are invalid; fix them or import skipping them: ` +
            invalid
              .slice(0, 5)
              .map((r) => `row ${r.row} (${r.errors[0]})`)
              .join('; '),
        );
      }
      const txId = randomUUID();
      const who: GcActor = {
        email: actor.email,
        action: GcHistoryAction.DIRECT_EDIT,
      };
      for (const r of plan) {
        if (r.action === ImportAction.INVALID || r.action === ImportAction.SKIP)
          continue;
        try {
          if (r.action === ImportAction.CREATE) {
            const created = await this.admin.createIn(
              manager,
              scheme,
              r.dto,
              {
                ...who,
                action: GcHistoryAction.CREATE,
              },
              txId,
            );
            r.term_id = created.term_id;
            r.concept = await manager.findOne(GcConcept, {
              where: { scheme_id: scheme.id, term_id: created.term_id },
            });
          } else if (
            r.concept &&
            r.changes.some((c) => c !== 'alternative_labels')
          ) {
            const { term_id: _t, status: _s, ...update } = r.dto;
            await this.admin.updateIn(
              manager,
              scheme,
              r.concept,
              update as UpdateConceptDto,
              who,
              txId,
            );
          }
          if (r.concept && r.alt.length)
            await this.mergeAltLabels(manager, scheme, r, who, txId);
        } catch (err) {
          throw new BadRequestException(
            `Row ${r.row}: ${(err as Error)?.message ?? 'could not be written'}. Nothing was imported.`,
          );
        }
      }
      await this.linkRelations(manager, scheme, plan, who, txId);
      return {
        applied: true,
        summary: this.summary(plan),
        rows: plan.map(this.view),
      };
    });
  }

  // ------------------------------------------------------------------ plan

  private async plan(
    manager: EntityManager,
    scheme: GcScheme,
    rows: Record<string, unknown>[],
  ): Promise<PlannedRow[]> {
    if (!Array.isArray(rows) || !rows.length)
      throw new BadRequestException('rows must be a non-empty list');
    if (rows.length > MAX_IMPORT_ROWS)
      throw new BadRequestException(
        `An import is limited to ${MAX_IMPORT_ROWS} rows`,
      );

    const existing = await manager.find(GcConcept, {
      where: { scheme_id: scheme.id },
    });
    const byTermId = new Map(existing.map((c) => [Number(c.term_id), c]));
    const byLabel = new Map<string, GcConcept>();
    for (const c of existing)
      if (c.status !== GcConceptStatus.DEPRECATED)
        byLabel.set(`${c.language}|${key(c.preferred_label)}`, c);
    const lists = await this.admin.loadLists(manager, scheme);
    const seenIds = new Set<number>();
    const seenLabels = new Map<string, number>();
    const claimed = new Set<number>();

    return rows.map((raw, i) => {
      const r: PlannedRow = {
        row: Number((raw as any)?.__row) || i + 1,
        action: ImportAction.CREATE,
        term_id: null,
        preferred_label: '',
        changes: [],
        errors: [],
        warnings: [],
        dto: { preferred_label: '' },
        alt: [],
        broader: [],
        related: [],
        concept: null,
      };
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        r.action = ImportAction.INVALID;
        r.errors.push('The row is not an object');
        return r;
      }
      const unknown = Object.keys(raw).filter(
        (k) => k !== '__row' && !IMPORT_FIELD_NAMES.includes(k),
      );
      if (unknown.length)
        r.warnings.push(`Ignored column(s): ${unknown.join(', ')}`);

      const dto = this.toDto(raw, r);
      r.dto = dto;
      r.preferred_label = dto.preferred_label;
      if (!dto.preferred_label) r.errors.push('No preferred label');

      // Identity: TERM ID first, then the preferred label (D8b; the file has repeats).
      const requested = dto.term_id;
      if (requested !== undefined) {
        if (seenIds.has(requested)) {
          r.warnings.push(
            `TERM ID ${requested} is repeated in the file; this row gets a new id`,
          );
          delete dto.term_id;
        } else {
          seenIds.add(requested);
        }
      }
      const language = dto.language?.toLowerCase() ?? scheme.default_language;
      const labelKey = `${language}|${key(dto.preferred_label)}`;
      let target =
        dto.term_id !== undefined ? (byTermId.get(dto.term_id) ?? null) : null;
      if (!target && dto.term_id === undefined && dto.preferred_label)
        target = byLabel.get(labelKey) ?? null;
      if (target && claimed.has(Number(target.id))) {
        r.errors.push(
          `Another row of the file already updates term ${target.term_id}`,
        );
      }
      if (dto.preferred_label) {
        const first = seenLabels.get(labelKey);
        if (first !== undefined)
          r.errors.push(`Same preferred label as row ${first}`);
        else seenLabels.set(labelKey, r.row);
        const clash = byLabel.get(labelKey);
        if (clash && (!target || Number(clash.id) !== Number(target.id)))
          r.errors.push(
            `"${dto.preferred_label}" is already the preferred label of term ${clash.term_id}`,
          );
      }

      const invalidDto = flatten(
        validateSync(plainToInstance(CreateConceptDto, { ...dto }), {
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );
      r.errors.push(...invalidDto);
      try {
        this.admin.cleanFields(dto, lists);
      } catch (err) {
        r.errors.push((err as Error).message);
      }
      if (dto.status === GcConceptStatus.DEPRECATED && !target)
        r.errors.push('A new concept cannot start as deprecated');
      if (!dto.definition && !target?.definition)
        r.warnings.push('No definition');

      if (target) {
        r.concept = target;
        r.term_id = Number(target.term_id);
        claimed.add(Number(target.id));
        r.changes = this.diff(target, dto, lists);
        if (r.alt.length) r.changes.push('alternative_labels');
        if (dto.status && dto.status !== target.status)
          r.warnings.push(
            `Status stays ${target.status}: change it from the concept page`,
          );
        r.action = r.changes.length ? ImportAction.UPDATE : ImportAction.SKIP;
      } else {
        r.term_id = dto.term_id ?? null;
      }
      if (r.errors.length) r.action = ImportAction.INVALID;
      return r;
    });
  }

  /** Row → concept DTO; 1.10d rules for the Lexicon file. */
  private toDto(raw: Record<string, unknown>, r: PlannedRow): CreateConceptDto {
    const dto: Record<string, unknown> = {};
    for (const field of IMPORT_FIELD_NAMES) {
      const value = MULTI.has(field) ? splitList(raw[field]) : cell(raw[field]);
      if (value !== undefined) dto[field] = value;
    }
    r.alt = (dto.alternative_labels as string[]) ?? [];
    r.broader = (dto.broader_terms as string[]) ?? [];
    r.related = (dto.related_terms as string[]) ?? [];
    delete dto.alternative_labels;
    delete dto.broader_terms;
    delete dto.related_terms;

    if (dto.term_id !== undefined) {
      const n = Number(dto.term_id);
      if (Number.isInteger(n) && n > 0) dto.term_id = n;
      else {
        r.warnings.push(
          `TERM ID "${dto.term_id}" is not a number; a new id is assigned`,
        );
        delete dto.term_id;
      }
    }
    if (typeof dto.status === 'string') {
      const s = key(dto.status).replace(/\s+/g, '_');
      if ((Object.values(GcConceptStatus) as string[]).includes(s))
        dto.status = s;
      else {
        r.errors.push(`Unknown status "${dto.status}"`);
        delete dto.status;
      }
    }
    // SOURCE: "Adapted from X" → derivation + citation; a URL goes to source_url.
    if (typeof dto.source_citation === 'string') {
      let citation = dto.source_citation;
      if (!dto.derivation) {
        for (const [re, value] of DERIVATION_PREFIXES) {
          if (re.test(citation)) {
            citation = citation.replace(re, '');
            if (value) dto.derivation = value;
            break;
          }
        }
      }
      const url = URL_RE.exec(citation)?.[0];
      if (url && !dto.source_url) {
        dto.source_url = url.replace(/[.,;]+$/, '');
        citation = citation.replace(url, '').replace(/\s*[-–,;:]\s*$/, '');
      }
      dto.source_citation = norm(citation) || undefined;
      if (!dto.source_citation) delete dto.source_citation;
    }
    if (dto.date_validated !== undefined) {
      const d = String(dto.date_validated);
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(d);
      if (m) dto.date_validated = m[1];
    }
    dto.preferred_label = norm(String(dto.preferred_label ?? ''));
    return dto as unknown as CreateConceptDto;
  }

  /** Fields whose normalised value differs from what is stored. */
  private diff(
    c: GcConcept,
    dto: CreateConceptDto,
    lists: Map<string, Map<string, string>>,
  ): string[] {
    let clean: Record<string, unknown> = {};
    try {
      clean = this.admin.cleanFields(dto, lists);
    } catch {
      return [];
    }
    const out: string[] = [];
    if (
      dto.preferred_label &&
      key(dto.preferred_label) !== key(c.preferred_label)
    )
      out.push('preferred_label');
    for (const field of WRITABLE_FIELDS) {
      if (!(field in clean)) continue;
      const now = (c as unknown as Record<string, unknown>)[field] ?? null;
      if (JSON.stringify(now) !== JSON.stringify(clean[field] ?? null))
        out.push(field);
    }
    return out;
  }

  // ------------------------------------------------------------ write helpers

  /** Adds the file's alternative labels to the ones already stored (never removes). */
  private async mergeAltLabels(
    manager: EntityManager,
    scheme: GcScheme,
    r: PlannedRow,
    actor: GcActor,
    txId: string,
  ) {
    const concept = r.concept as GcConcept;
    const current = await manager.find(GcLabel, {
      where: { concept_id: concept.id },
    });
    const have = new Set(current.map((l) => `${l.language}|${key(l.label)}`));
    const pref = key(concept.preferred_label);
    const add = r.alt.filter(
      (a) => key(a) !== pref && !have.has(`${concept.language}|${key(a)}`),
    );
    if (!add.length) return;
    await this.admin.setLabelsIn(
      manager,
      scheme,
      concept,
      [
        ...current.map((l) => ({
          label: l.label,
          language: l.language,
          kind: l.kind,
          status: l.status,
        })),
        ...add.map((label) => ({
          label,
          language: concept.language,
          kind: /^[A-Z0-9&().-]{2,10}$/.test(label)
            ? GcLabelKind.ACRONYM
            : GcLabelKind.ALT,
        })),
      ],
      actor,
      txId,
    );
  }

  /**
   * Broader / related references resolve by TERM ID or label, against the
   * scheme after this import's creates. A link the integrity rules refuse
   * (cycle, S27) or that points nowhere is reported, not fatal: the checks run
   * before any write, so skipping one leaves nothing half-written.
   */
  private async linkRelations(
    manager: EntityManager,
    scheme: GcScheme,
    plan: PlannedRow[],
    actor: GcActor,
    txId: string,
  ) {
    const wanted = plan.filter(
      (r) => r.concept && (r.broader.length || r.related.length),
    );
    if (!wanted.length) return;
    const all = await manager.find(GcConcept, {
      where: { scheme_id: scheme.id },
    });
    const labels = await manager.find(GcLabel, {
      where: { concept_id: In(all.map((c) => Number(c.id))) },
    });
    const byId = new Map(all.map((c) => [Number(c.id), c]));
    const find = new Map<string, GcConcept>();
    for (const c of all) {
      find.set(String(c.term_id), c);
      find.set(key(c.preferred_label), c);
    }
    for (const l of labels) {
      const c = byId.get(Number(l.concept_id));
      if (c && !find.has(key(l.label))) find.set(key(l.label), c);
    }
    for (const r of wanted) {
      const links: [GcRelationKind, string][] = [
        ...r.broader.map((t): [GcRelationKind, string] => [
          GcRelationKind.BROADER,
          t,
        ]),
        ...r.related.map((t): [GcRelationKind, string] => [
          GcRelationKind.RELATED,
          t,
        ]),
      ];
      for (const [kind, ref] of links) {
        const target = find.get(/^\d+$/.test(ref) ? ref : key(ref));
        if (!target) {
          r.warnings.push(`${kind} "${ref}" not found; link skipped`);
          continue;
        }
        try {
          await this.admin.addRelationIn(
            manager,
            r.concept as GcConcept,
            target,
            kind,
            actor,
            txId,
          );
        } catch (err) {
          if (!(err instanceof HttpException)) throw err;
          r.warnings.push(`${kind} "${ref}": ${err.message}; link skipped`);
        }
      }
    }
  }

  private summary(plan: PlannedRow[]) {
    const n = (a: ImportAction) => plan.filter((r) => r.action === a).length;
    return {
      total: plan.length,
      to_create: n(ImportAction.CREATE),
      to_update: n(ImportAction.UPDATE),
      unchanged: n(ImportAction.SKIP),
      invalid: n(ImportAction.INVALID),
      with_warnings: plan.filter((r) => r.warnings.length).length,
    };
  }

  private view = (r: PlannedRow): ImportRowResult => ({
    row: r.row,
    action: r.action,
    term_id: r.term_id,
    preferred_label: r.preferred_label,
    changes: r.changes,
    errors: r.errors,
    warnings: r.warnings,
  });
}
