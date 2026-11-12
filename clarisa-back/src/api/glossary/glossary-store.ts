import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import {
  DEFAULT_SCHEME_CODE,
  GLOSSARY_COLLECTION_CODE,
} from '../global-concepts/global-concepts.config';
import { GcConceptStatus } from '../global-concepts/entities/gc-concept.entity';
import { Portfolio } from '../portfolio/entities/portfolio.entity';
import { GlossaryPortfolio } from './entities/glossary-portfolio.entity';
import {
  Glossary,
  GlossaryEditorialStatus,
  parseLabels,
} from './entities/glossary.entity';

/** Key of `gc_concepts.extra` that holds what only the glossary has. */
export const GLOSSARY_EXTRA_KEY = '_glossary';
/** Key of `gc_concepts.extra` of the `portfolios` custom field (ids as text). */
export const GLOSSARY_PORTFOLIOS_KEY = 'portfolios';
/** Longest term the taxonomy stores (`gc_concepts.preferred_label`). */
export const GLOSSARY_TERM_MAX_LENGTH = 500;

/** What the glossary keeps in `extra._glossary`. */
export interface GlossaryMeta {
  is_active?: boolean;
  show_in_dashboard?: boolean;
  group_id?: number | null;
  reference_date?: string | null;
  application_name?: string | null;
  editorial_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  modification_justification?: string | null;
  /**
   * The alternative labels as the glossary has them, kept only when two of
   * them are one label for `gc_labels` ("Café" / "Cafe"), which stores one.
   */
  alternative_labels?: string[];
}

/** Who writes: the panel user, for `gc_history` and the audit fields. */
export interface GlossaryActor {
  userId?: number | null;
  email?: string | null;
}

/** One concept of the glossary collection, as read. */
interface ConceptRow {
  id: number | string;
  term_id: number | string;
  preferred_label: string;
  definition: string | null;
  source_citation: string | null;
  source_url: string | null;
  status: string;
  version: string | null;
  replaced_by_id: number | string | null;
  extra: string | null;
}

/** The persistence the glossary needs. Real: `GlossaryStore`; tests: in memory. */
export interface GlossaryStorage {
  all(manager?: EntityManager): Promise<Glossary[]>;
  byId(id: number, manager?: EntityManager): Promise<Glossary | null>;
  portfolioIds(id: number, manager?: EntityManager): Promise<number[]>;
  save(
    value: Glossary | Glossary[],
    manager?: EntityManager,
    actor?: GlossaryActor,
  ): Promise<void>;
  setPortfolios(
    id: number,
    portfolioIds: number[],
    manager?: EntityManager,
    actor?: GlossaryActor,
  ): Promise<void>;
  /** Runs `work` in one transaction (all or nothing). */
  transaction<T>(work: (manager?: EntityManager) => Promise<T>): Promise<T>;
}

export const GLOSSARY_STORAGE = Symbol('GLOSSARY_STORAGE');

/** Status of the concept for a glossary row (same rule as the copy migration). */
export function conceptStatusOf(
  editorial: string | null | undefined,
  isActive: boolean,
): GcConceptStatus {
  const known = Object.values(GcConceptStatus) as string[];
  const status = known.includes(String(editorial))
    ? (editorial as GcConceptStatus)
    : GcConceptStatus.APPROVED;
  if (isActive) return status;
  return status === GcConceptStatus.DRAFT ||
    status === GcConceptStatus.IN_REVIEW
    ? status
    : GcConceptStatus.DEPRECATED;
}

/**
 * Editorial status and active flag of a concept as the glossary shows them.
 *
 * Normally they are the ones the glossary stored (`extra._glossary`). The
 * concept is also reachable from the taxonomy (its panel, an applied change
 * proposal), which only moves `status`; when `status` no longer matches what
 * the glossary stored, the taxonomy changed it after the glossary and its
 * status wins: approved → active and approved; deprecated → inactive (the
 * copy rule); draft / in review → that editorial status.
 */
export function glossaryStateOf(
  meta: GlossaryMeta,
  status: string,
): { editorial: string; isActive: boolean } {
  const isActive =
    meta.is_active === undefined
      ? status !== GcConceptStatus.DEPRECATED
      : !!meta.is_active;
  const editorial = meta.editorial_status ?? status;
  if (conceptStatusOf(editorial, isActive) === status)
    return { editorial, isActive };
  switch (status) {
    case GcConceptStatus.APPROVED:
      return { editorial: GcConceptStatus.APPROVED, isActive: true };
    case GcConceptStatus.DEPRECATED:
      return {
        editorial:
          editorial === GcConceptStatus.DEPRECATED
            ? editorial
            : GcConceptStatus.APPROVED,
        isActive: false,
      };
    default:
      return { editorial: status, isActive };
  }
}

/**
 * How the unique key of `gc_labels` compares two labels
 * (`concept_id, language, label(191)`, utf8mb4_0900_ai_ci): first 191
 * characters, case and accents ignored. "Café" and "cafe" are one label.
 */
export function labelKey(label: string): string {
  return String(label ?? '')
    .trim()
    .slice(0, 191)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Labels without the ones the database holds equal; first spelling wins. */
export function distinctLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels.filter((label) => {
    const key = labelKey(label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseExtra(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function portfolioIdsOf(extra: Record<string, unknown>): number[] {
  const raw = extra[GLOSSARY_PORTFOLIOS_KEY];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((id) => Number(id)))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
}

/**
 * The glossary's only store since 2026-11-06: the concepts of the `glossary`
 * collection of the `meliaf-taxonomy` scheme (`gc_concepts`), where the
 * migration of 2026-11-03 copied it. `api/glossary` (v1, read by PRMS),
 * `api/v2/glossary`, the export and the glossary panel read and write here,
 * and the `glossary` table is no longer written (it stays as the backup).
 *
 * A row is handed out as the same `Glossary` object as before, so every
 * public key is still produced by the entity's getters and v1 stays
 * byte-identical:
 *
 * - `term_id` is the glossary `id` (`termId`), `preferred_label` the term,
 *   `source_citation` / `source_url` the provenance;
 * - `extra._glossary` keeps what the taxonomy has no column for
 *   (`GlossaryMeta`: active flag, dashboard flag, group, reference date,
 *   application, editorial status, audit fields);
 * - `extra.portfolios` (the `portfolios` custom field) the portfolio ids;
 * - alternative labels are `alt` rows of `gc_labels`, in their order.
 *
 * Every write also leaves its row in `gc_history` and revises the version of
 * a published concept, as the taxonomy does.
 */
@Injectable()
export class GlossaryStore implements GlossaryStorage {
  constructor(private readonly dataSource: DataSource) {}

  private m(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }

  transaction<T>(work: (manager?: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => work(manager));
  }

  // ------------------------------------------------------------------ read

  async all(manager?: EntityManager): Promise<Glossary[]> {
    return this.load(this.m(manager));
  }

  async byId(id: number, manager?: EntityManager): Promise<Glossary | null> {
    if (!Number.isInteger(Number(id))) return null;
    const [row] = await this.load(this.m(manager), Number(id));
    return row ?? null;
  }

  async portfolioIds(id: number, manager?: EntityManager): Promise<number[]> {
    const row = await this.conceptRow(this.m(manager), Number(id));
    return row ? portfolioIdsOf(parseExtra(row.extra)) : [];
  }

  private conceptSql(oneTerm: boolean) {
    return `SELECT c.id, c.term_id, c.preferred_label, c.definition,
                   c.source_citation, c.source_url, c.status, c.version,
                   c.replaced_by_id, c.extra
              FROM gc_concepts c
              JOIN gc_schemes s ON s.id = c.scheme_id
              JOIN gc_collection_members m ON m.concept_id = c.id
              JOIN gc_collections col
                ON col.id = m.collection_id AND col.scheme_id = s.id
             WHERE s.code = ? AND col.code = ?${oneTerm ? ' AND c.term_id = ?' : ''}
             ORDER BY c.preferred_label ASC, c.term_id ASC`;
  }

  private async conceptRow(
    manager: EntityManager,
    termId: number,
  ): Promise<ConceptRow | undefined> {
    const rows: ConceptRow[] = await manager.query(this.conceptSql(true), [
      DEFAULT_SCHEME_CODE,
      GLOSSARY_COLLECTION_CODE,
      termId,
    ]);
    return rows?.[0];
  }

  private async load(
    manager: EntityManager,
    termId?: number,
  ): Promise<Glossary[]> {
    const params: unknown[] = [DEFAULT_SCHEME_CODE, GLOSSARY_COLLECTION_CODE];
    if (termId !== undefined) params.push(termId);
    const rows: ConceptRow[] =
      (await manager.query(this.conceptSql(termId !== undefined), params)) ??
      [];
    if (!rows.length) return [];

    const conceptIds = rows.map((r) => Number(r.id));
    const marks = conceptIds.map(() => '?').join(', ');
    const labels: { concept_id: number | string; label: string }[] =
      (await manager.query(
        `SELECT concept_id, label FROM gc_labels
          WHERE kind = 'alt' AND concept_id IN (${marks})
          ORDER BY id ASC`,
        conceptIds,
      )) ?? [];
    const labelsOf = new Map<number, string[]>();
    for (const l of labels) {
      const key = Number(l.concept_id);
      labelsOf.set(key, [...(labelsOf.get(key) ?? []), l.label]);
    }

    // The replacement is another concept: its term_id is the v1 value.
    const replacedIds = [
      ...new Set(
        rows
          .map((r) => r.replaced_by_id)
          .filter((id) => id !== null && id !== undefined)
          .map(Number),
      ),
    ];
    const termIdOf = new Map<number, number>(
      rows.map((r) => [Number(r.id), Number(r.term_id)]),
    );
    const missing = replacedIds.filter((id) => !termIdOf.has(id));
    if (missing.length) {
      const found: { id: number | string; term_id: number | string }[] =
        (await manager.query(
          `SELECT id, term_id FROM gc_concepts WHERE id IN (${missing
            .map(() => '?')
            .join(', ')})`,
          missing,
        )) ?? [];
      for (const f of found) termIdOf.set(Number(f.id), Number(f.term_id));
    }

    const extras = rows.map((r) => parseExtra(r.extra));
    const portfolioIds = [...new Set(extras.flatMap(portfolioIdsOf))];
    const portfolios: Portfolio[] = portfolioIds.length
      ? ((await manager.query(
          `SELECT id, name, acronym FROM portfolios WHERE id IN (${portfolioIds
            .map(() => '?')
            .join(', ')})`,
          portfolioIds,
        )) ?? [])
      : [];
    const portfolioById = new Map(
      portfolios.map((p) => [
        Number(p.id),
        Object.assign(new Portfolio(), {
          id: Number(p.id),
          name: p.name,
          acronym: p.acronym,
        }),
      ]),
    );

    return rows.map((row, index) =>
      this.hydrate(
        row,
        extras[index],
        labelsOf.get(Number(row.id)) ?? [],
        termIdOf,
        portfolioById,
      ),
    );
  }

  private hydrate(
    row: ConceptRow,
    extra: Record<string, unknown>,
    labels: string[],
    termIdOf: Map<number, number>,
    portfolioById: Map<number, Portfolio>,
  ): Glossary {
    const meta = (extra[GLOSSARY_EXTRA_KEY] ?? {}) as GlossaryMeta;
    const termId = Number(row.term_id);
    const g = new Glossary();
    g.id = termId;
    g.applicationName = meta.application_name ?? null;
    g.group_id =
      meta.group_id === null || meta.group_id === undefined
        ? null
        : Number(meta.group_id);
    g.title = row.preferred_label;
    g.definition = row.definition;
    g.source = row.source_citation ?? null;
    g.sourceUrl = row.source_url ?? null;
    g.referenceDate = meta.reference_date ?? null;
    // Variants the label key cannot hold apart come from the glossary's own
    // list, while it still matches what `gc_labels` has.
    const shown =
      Array.isArray(meta.alternative_labels) &&
      JSON.stringify(distinctLabels(meta.alternative_labels)) ===
        JSON.stringify(labels)
        ? meta.alternative_labels
        : labels;
    g.alternative_labels = shown.length ? JSON.stringify(shown) : null;
    const state = glossaryStateOf(meta, row.status);
    g.editorial_status = state.editorial as GlossaryEditorialStatus;
    g.replaced_by_id =
      row.replaced_by_id === null || row.replaced_by_id === undefined
        ? null
        : (termIdOf.get(Number(row.replaced_by_id)) ?? null);
    g.show_in_dashboard = !!meta.show_in_dashboard;
    g.auditableFields = {
      is_active: state.isActive,
      created_at: meta.created_at ? new Date(meta.created_at) : null,
      updated_at: meta.updated_at ? new Date(meta.updated_at) : null,
      created_by: meta.created_by ?? null,
      updated_by: meta.updated_by ?? null,
      modification_justification: meta.modification_justification ?? null,
    } as Glossary['auditableFields'];
    g.glossary_portfolio_array = portfolioIdsOf(extra)
      .filter((pid) => portfolioById.has(pid))
      .map((pid) =>
        Object.assign(new GlossaryPortfolio(), {
          glossary_id: termId,
          portfolio_id: pid,
          portfolio_object: portfolioById.get(pid),
          auditableFields: { is_active: true },
        }),
      );
    return g;
  }

  // ----------------------------------------------------------------- write

  async save(
    value: Glossary | Glossary[],
    manager?: EntityManager,
    actor: GlossaryActor = {},
  ): Promise<void> {
    const m = this.m(manager);
    for (const g of Array.isArray(value) ? value : [value]) {
      await this.saveOne(m, g, actor);
    }
  }

  private metaOf(g: Glossary, now: string): GlossaryMeta {
    const a = g.auditableFields ?? ({} as Glossary['auditableFields']);
    const raw = parseLabels(g.alternative_labels);
    const variants =
      distinctLabels(raw).length !== raw.length ? raw : undefined;
    return {
      is_active: a.is_active === undefined ? true : !!a.is_active,
      show_in_dashboard: !!g.show_in_dashboard,
      group_id:
        g.group_id === null || g.group_id === undefined
          ? null
          : Number(g.group_id),
      reference_date: g.referenceDate
        ? String(g.referenceDate).slice(0, 10)
        : null,
      application_name: g.applicationName ?? null,
      editorial_status: g.editorial_status ?? GlossaryEditorialStatus.APPROVED,
      created_at: toIso(a.created_at) ?? now,
      updated_at: now,
      created_by: a.created_by ?? null,
      updated_by: a.updated_by ?? null,
      modification_justification: a.modification_justification ?? null,
      ...(variants ? { alternative_labels: variants } : {}),
    };
  }

  private async scheme(manager: EntityManager) {
    const rows: { id: number | string; next_term_id: number | string }[] =
      await manager.query(
        `SELECT id, next_term_id FROM gc_schemes WHERE code = ? LIMIT 1 FOR UPDATE`,
        [DEFAULT_SCHEME_CODE],
      );
    if (!rows?.length)
      throw new Error(`The scheme ${DEFAULT_SCHEME_CODE} does not exist`);
    return rows[0];
  }

  private async collectionId(manager: EntityManager, schemeId: number) {
    const rows: { id: number | string }[] = await manager.query(
      `SELECT id FROM gc_collections WHERE scheme_id = ? AND code = ? LIMIT 1`,
      [schemeId, GLOSSARY_COLLECTION_CODE],
    );
    if (!rows?.length)
      throw new Error(
        `The collection ${GLOSSARY_COLLECTION_CODE} of ${DEFAULT_SCHEME_CODE} does not exist`,
      );
    return Number(rows[0].id);
  }

  /** Internal id of the concept of a glossary term (the replacement target). */
  private async conceptIdOf(
    manager: EntityManager,
    termId: number | null,
  ): Promise<number | null> {
    if (termId === null || termId === undefined) return null;
    const row = await this.conceptRow(manager, Number(termId));
    return row ? Number(row.id) : null;
  }

  private assertTitle(title: string) {
    if ((title ?? '').length > GLOSSARY_TERM_MAX_LENGTH)
      throw new BadRequestException(
        `The term is longer than ${GLOSSARY_TERM_MAX_LENGTH} characters`,
      );
  }

  private async saveOne(
    manager: EntityManager,
    g: Glossary,
    actor: GlossaryActor,
  ): Promise<void> {
    this.assertTitle(g.title);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const isActive =
      g.auditableFields?.is_active === undefined
        ? true
        : !!g.auditableFields.is_active;
    const status = conceptStatusOf(g.editorial_status, isActive);
    const replacedBy = await this.conceptIdOf(manager, g.replaced_by_id);
    const labels = distinctLabels(parseLabels(g.alternative_labels));
    const email = actor.email ?? null;
    const existing =
      g.id === undefined || g.id === null
        ? undefined
        : await this.conceptRow(manager, Number(g.id));

    if (!existing) {
      if (g.id !== undefined && g.id !== null)
        throw new BadRequestException(`Glossary term ${g.id} was not found`);
      const scheme = await this.scheme(manager);
      const schemeId = Number(scheme.id);
      // The taxonomy numbers its concepts: a new term takes the next free
      // TERM ID, so a glossary term and a taxonomy concept never share a URI.
      let termId = Number(scheme.next_term_id);
      for (;;) {
        const taken: unknown[] = await manager.query(
          `SELECT 1 FROM gc_concepts WHERE scheme_id = ? AND term_id = ? LIMIT 1`,
          [schemeId, termId],
        );
        if (!taken?.length) break;
        termId += 1;
      }
      await manager.query(
        `UPDATE gc_schemes SET next_term_id = ? WHERE id = ?`,
        [termId + 1, schemeId],
      );
      g.auditableFields = {
        ...(g.auditableFields ?? {}),
        is_active: isActive,
        created_at: new Date(now),
        updated_at: new Date(now),
      } as Glossary['auditableFields'];
      const meta = this.metaOf(g, now);
      const extra = { [GLOSSARY_EXTRA_KEY]: meta };
      const result: { insertId?: number } = await manager.query(
        `INSERT INTO gc_concepts
           (scheme_id, term_id, preferred_label, language, definition,
            source_citation, source_url, status, version, replaced_by_id,
            date_created, date_modified, extra, created_by_email, updated_by_email)
         VALUES (?, ?, ?, 'en', ?, ?, ?, ?, '1.0', ?, ?, ?, ?, ?, ?)`,
        [
          schemeId,
          termId,
          g.title,
          g.definition ?? null,
          g.source ?? null,
          g.sourceUrl ?? null,
          status,
          replacedBy,
          today,
          today,
          JSON.stringify(extra),
          email,
          email,
        ],
      );
      let conceptId = Number(result?.insertId);
      if (!Number.isInteger(conceptId) || conceptId <= 0) {
        const again = await this.conceptIdOfScheme(manager, schemeId, termId);
        conceptId = again;
      }
      await manager.query(
        `INSERT INTO gc_collection_members (collection_id, concept_id) VALUES (?, ?)`,
        [await this.collectionId(manager, schemeId), conceptId],
      );
      await this.writeLabels(manager, conceptId, labels);
      await this.log(manager, conceptId, 'create', email, {
        preferred_label: { from: null, to: g.title },
        definition: { from: null, to: g.definition ?? null },
        status: { from: null, to: status },
        ...(labels.length
          ? { alternative_labels: { from: null, to: labels } }
          : {}),
      });
      g.id = termId;
      return;
    }

    const conceptId = Number(existing.id);
    const extra = parseExtra(existing.extra);
    const before = (extra[GLOSSARY_EXTRA_KEY] ?? {}) as GlossaryMeta;
    if (!g.auditableFields?.created_at && before.created_at) {
      g.auditableFields = {
        ...(g.auditableFields ?? {}),
        created_at: new Date(before.created_at),
      } as Glossary['auditableFields'];
    }
    const meta = this.metaOf(g, now);
    if (meta.created_by === null && before.created_by !== undefined)
      meta.created_by = before.created_by ?? null;
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const diff = (field: string, from: unknown, to: unknown) => {
      if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null))
        changes[field] = { from: from ?? null, to: to ?? null };
    };
    diff('preferred_label', existing.preferred_label, g.title);
    diff('definition', existing.definition, g.definition);
    diff('source_citation', existing.source_citation, g.source);
    diff('source_url', existing.source_url, g.sourceUrl);
    diff('status', existing.status, status);
    diff(
      'replaced_by_id',
      existing.replaced_by_id === null ? null : Number(existing.replaced_by_id),
      replacedBy,
    );
    const labelsBefore: string[] = (
      ((await manager.query(
        `SELECT label FROM gc_labels WHERE concept_id = ? AND kind = 'alt' ORDER BY id ASC`,
        [conceptId],
      )) ?? []) as { label: string }[]
    ).map((l) => l.label);
    diff('alternative_labels', labelsBefore, labels);
    const comparable = (x: GlossaryMeta) => {
      const rest = { ...x };
      delete rest.updated_at;
      delete rest.created_at;
      delete rest.updated_by;
      return rest;
    };
    diff(GLOSSARY_EXTRA_KEY, comparable(before), comparable(meta));
    if (!Object.keys(changes).length) return;

    const versioned =
      'preferred_label' in changes ||
      'definition' in changes ||
      'alternative_labels' in changes;
    const wasPublic =
      existing.status === GcConceptStatus.APPROVED ||
      existing.status === GcConceptStatus.DEPRECATED;
    const version =
      versioned && wasPublic ? bumpMinor(existing.version) : existing.version;
    extra[GLOSSARY_EXTRA_KEY] = meta;
    await manager.query(
      `UPDATE gc_concepts
          SET preferred_label = ?, definition = ?, source_citation = ?,
              source_url = ?, status = ?, replaced_by_id = ?, version = ?,
              date_modified = ?, extra = ?, updated_by_email = ?
        WHERE id = ?`,
      [
        g.title,
        g.definition ?? null,
        g.source ?? null,
        g.sourceUrl ?? null,
        status,
        replacedBy,
        version ?? '1.0',
        today,
        JSON.stringify(extra),
        email,
        conceptId,
      ],
    );
    if ('alternative_labels' in changes)
      await this.writeLabels(manager, conceptId, labels, true);
    await this.log(manager, conceptId, 'update', email, changes);
    g.auditableFields = {
      ...(g.auditableFields ?? {}),
      updated_at: new Date(now),
    } as Glossary['auditableFields'];
  }

  private async conceptIdOfScheme(
    manager: EntityManager,
    schemeId: number,
    termId: number,
  ): Promise<number> {
    const rows: { id: number | string }[] = await manager.query(
      `SELECT id FROM gc_concepts WHERE scheme_id = ? AND term_id = ? LIMIT 1`,
      [schemeId, termId],
    );
    return Number(rows?.[0]?.id);
  }

  /** The alternative labels, in the order given; replaces the ones there. */
  private async writeLabels(
    manager: EntityManager,
    conceptId: number,
    labels: string[],
    replace = false,
  ) {
    if (replace)
      await manager.query(
        `DELETE FROM gc_labels WHERE concept_id = ? AND kind = 'alt'`,
        [conceptId],
      );
    // Same guard as the copy: a label the unique key holds equal to one
    // already there is skipped instead of failing the whole write.
    for (const label of distinctLabels(labels)) {
      await manager.query(
        `INSERT INTO gc_labels (concept_id, label, language, kind, status)
         SELECT ?, ?, 'en', 'alt', 'active' FROM DUAL
         WHERE NOT EXISTS (
           SELECT 1 FROM gc_labels
            WHERE concept_id = ? AND language = 'en' AND LEFT(label, 191) = LEFT(?, 191)
         )`,
        [conceptId, label, conceptId, label],
      );
    }
  }

  async setPortfolios(
    id: number,
    portfolioIds: number[],
    manager?: EntityManager,
    actor: GlossaryActor = {},
  ): Promise<void> {
    const m = this.m(manager);
    const row = await this.conceptRow(m, Number(id));
    if (!row)
      throw new BadRequestException(`Glossary term ${id} was not found`);
    const extra = parseExtra(row.extra);
    const before = portfolioIdsOf(extra);
    const wanted = [...new Set((portfolioIds ?? []).map(Number))];
    // The ones kept stay where they were; new ones go at the end.
    const next = [
      ...before.filter((pid) => wanted.includes(pid)),
      ...wanted.filter((pid) => !before.includes(pid)),
    ];
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    if (next.length) extra[GLOSSARY_PORTFOLIOS_KEY] = next.map(String);
    else delete extra[GLOSSARY_PORTFOLIOS_KEY];
    const meta = (extra[GLOSSARY_EXTRA_KEY] ?? {}) as GlossaryMeta;
    extra[GLOSSARY_EXTRA_KEY] = {
      ...meta,
      updated_at: new Date().toISOString(),
      updated_by: actor.userId ?? meta.updated_by ?? null,
    };
    await m.query(
      `UPDATE gc_concepts SET extra = ?, date_modified = ?, updated_by_email = ? WHERE id = ?`,
      [
        JSON.stringify(extra),
        new Date().toISOString().slice(0, 10),
        actor.email ?? null,
        Number(row.id),
      ],
    );
    await this.log(m, Number(row.id), 'update', actor.email ?? null, {
      [GLOSSARY_PORTFOLIOS_KEY]: { from: before, to: next },
    });
  }

  private async log(
    manager: EntityManager,
    conceptId: number,
    action: 'create' | 'update',
    email: string | null,
    changes: Record<string, { from: unknown; to: unknown }>,
  ) {
    await manager.query(
      `INSERT INTO gc_history (concept_id, action, changes, changed_by_email, tx_id)
       VALUES (?, ?, ?, ?, ?)`,
      [conceptId, action, JSON.stringify(changes), email, randomUUID()],
    );
  }
}

/** `1.0` → `1.1`, like the taxonomy revises a published concept. */
export function bumpMinor(version: string | null | undefined): string {
  const [major, minor] = (version || '1.0')
    .split('.')
    .map((n) => Number(n) || 0);
  return `${major || 1}.${minor + 1}`;
}
