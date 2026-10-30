import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

/** One row of `glossary` as the migration reads it (dates already formatted by SQL). */
type GlossaryRow = {
  id: number | string;
  title: string;
  definition: string | null;
  source: string | null;
  source_url: string | null;
  reference_date: string | null;
  group_id: number | string | null;
  alternative_labels: string | null;
  editorial_status: string | null;
  replaced_by_id: number | string | null;
  show_in_dashboard: number | boolean | null;
  is_active: number | boolean | null;
  application_name: string | null;
  created_on: string | null;
  updated_on: string | null;
};

type PortfolioRow = {
  id: number | string;
  name: string | null;
  acronym: string | null;
};

type ExistingConcept = {
  id: number | string;
  term_id: number | string;
  extra: string | null;
};

const STATUSES = ['draft', 'in_review', 'approved', 'deprecated'];

/**
 * Copies the glossary (`glossary`, served by `GET api/glossary` since 2022)
 * into the taxonomy module (`gc_concepts`) so the taxonomy can become the
 * single store of CLARISA concepts (Yeck, 2026-10-28/30) — first as a copy to
 * test in dev, without touching what v1 serves.
 *
 * What it creates in the scheme `meliaf-taxonomy`:
 * - a controlled list `portfolios` (one value per row of `portfolios`, value =
 *   the portfolio id, label = acronym + name) and the custom field
 *   `portfolios` (`multi_list`) that uses it — the "dropdown" Yeck asked for;
 * - a collection `glossary` that groups the copied terms;
 * - one concept per glossary row, `term_id` = the glossary `id` (so `termId`
 *   of v1 survives), `status` = the editorial status, alternative labels as
 *   `alt` labels, `replaced_by_id` resolved to the copied replacement, and a
 *   `create` row in the history.
 *
 * What the taxonomy has no column for travels inside `extra._glossary`
 * (`is_active`, `show_in_dashboard`, `group_id`, `reference_date`,
 * `application_name`): a key starting with `_` is reserved for internal use
 * (`isReservedExtraKey`), so the panel never shows nor edits it and
 * `mergeExtra` keeps it on every update. That key is also the mark of a copied
 * row, which is what makes the migration idempotent and lets `down()` remove
 * only what it created.
 *
 * Collisions: a `term_id` already used by a concept that is not a copy is
 * left alone (the glossary row is skipped, nothing is overwritten). Production
 * has no concepts, so there every row is copied.
 */
export class CopyGlossaryIntoTaxonomy1793404800000
  implements MigrationInterface
{
  name = 'CopyGlossaryIntoTaxonomy1793404800000';

  static readonly SCHEME_CODE = 'meliaf-taxonomy';
  static readonly COLLECTION_CODE = 'glossary';
  static readonly COLLECTION_LABEL = 'Glossary';
  static readonly FIELD_CODE = 'portfolios';
  static readonly FIELD_LABEL = 'Portfolios';
  static readonly LIST_CODE = 'portfolios';
  /** Key of `gc_concepts.extra` that marks a copied row and keeps the v1-only fields. */
  static readonly MARKER = '_glossary';

  /** Label of a portfolio in the controlled list: `P25 — CGIAR portfolio 2025-2030`. */
  static listLabel(p: PortfolioRow): string {
    const name = String(p.name ?? '')
      .replace(/[​\s]+/g, ' ')
      .trim();
    const acronym = String(p.acronym ?? '').trim();
    return acronym ? `${acronym} — ${name}` : name;
  }

  /** Whether a stored `extra` carries the copy mark. */
  static isCopy(extra: string | null | undefined): boolean {
    if (!extra) return false;
    try {
      const parsed: unknown = JSON.parse(extra);
      return (
        !!parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        CopyGlossaryIntoTaxonomy1793404800000.MARKER in parsed
      );
    } catch {
      return false;
    }
  }

  /**
   * The stored alternative labels as a clean list (same reading as
   * `parseLabels` of the glossary), without duplicates that the
   * case-insensitive unique key of `gc_labels` would reject.
   */
  static altLabels(value: string | null | undefined): string[] {
    if (!value) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const label of parsed) {
      if (typeof label !== 'string') continue;
      const clean = label.trim();
      const key = clean.toLowerCase();
      if (!clean || seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
  }

  /** The `gc_concepts` values of one glossary row. */
  static conceptRow(row: GlossaryRow, portfolioIds: string[]) {
    const status = STATUSES.includes(String(row.editorial_status ?? ''))
      ? String(row.editorial_status)
      : 'approved';
    const extra: Record<string, unknown> = {};
    if (portfolioIds.length) extra.portfolios = portfolioIds;
    extra[CopyGlossaryIntoTaxonomy1793404800000.MARKER] = {
      is_active: Boolean(Number(row.is_active ?? 1)),
      show_in_dashboard: Boolean(Number(row.show_in_dashboard ?? 0)),
      group_id: Number(row.group_id ?? row.id),
      reference_date: row.reference_date ?? null,
      application_name: row.application_name ?? null,
    };
    return {
      term_id: Number(row.id),
      preferred_label: String(row.title ?? ''),
      definition: row.definition ?? null,
      source_citation: row.source ?? null,
      source_url: row.source_url ?? null,
      status,
      date_created: row.created_on ?? null,
      date_modified: row.updated_on ?? row.created_on ?? null,
      extra: JSON.stringify(extra),
    };
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = CopyGlossaryIntoTaxonomy1793404800000;
    const schemes: {
      id: number | string;
      code: string;
      next_term_id: number;
    }[] = await queryRunner.query(
      `SELECT id, code, next_term_id FROM gc_schemes WHERE code = ? LIMIT 1`,
      [cls.SCHEME_CODE],
    );
    if (!schemes?.length) return;
    const scheme = schemes[0];

    // The controlled list of portfolios and the custom field that uses it.
    const portfolios: PortfolioRow[] = await queryRunner.query(
      `SELECT id, name, acronym FROM portfolios ORDER BY id`,
    );
    for (const [index, p] of (portfolios ?? []).entries()) {
      await queryRunner.query(
        `INSERT INTO gc_lists (scope, list_code, value, label, sort, is_active)
         SELECT ?, ?, ?, ?, ?, 1 FROM DUAL
         WHERE NOT EXISTS (
           SELECT 1 FROM gc_lists WHERE scope = ? AND list_code = ? AND value = ?
         )`,
        [
          scheme.code,
          cls.LIST_CODE,
          String(p.id),
          cls.listLabel(p),
          index,
          scheme.code,
          cls.LIST_CODE,
          String(p.id),
        ],
      );
    }
    await queryRunner.query(
      `INSERT INTO gc_fields
         (scheme_id, code, label, type, list_code, required, is_public, sort, is_active, help)
       SELECT ?, ?, ?, 'multi_list', ?, 0, 1, 0, 1, ? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM gc_fields WHERE scheme_id = ? AND code = ?)`,
      [
        scheme.id,
        cls.FIELD_CODE,
        cls.FIELD_LABEL,
        cls.LIST_CODE,
        'CGIAR portfolios the term applies to (copied from the glossary).',
        scheme.id,
        cls.FIELD_CODE,
      ],
    );

    // The collection that groups the copied terms.
    await queryRunner.query(
      `INSERT INTO gc_collections (scheme_id, code, label, ordered)
       SELECT ?, ?, ?, 0 FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM gc_collections WHERE scheme_id = ? AND code = ?)`,
      [
        scheme.id,
        cls.COLLECTION_CODE,
        cls.COLLECTION_LABEL,
        scheme.id,
        cls.COLLECTION_CODE,
      ],
    );
    const collections: { id: number | string }[] = await queryRunner.query(
      `SELECT id FROM gc_collections WHERE scheme_id = ? AND code = ? LIMIT 1`,
      [scheme.id, cls.COLLECTION_CODE],
    );
    const collectionId = Number(collections?.[0]?.id);

    // The glossary as stored, dates as `YYYY-MM-DD` strings so no timezone moves a day.
    const rows: GlossaryRow[] = await queryRunner.query(
      `SELECT id, title, definition, source, source_url,
              DATE_FORMAT(reference_date, '%Y-%m-%d') AS reference_date,
              group_id, alternative_labels, editorial_status, replaced_by_id,
              show_in_dashboard, is_active, applicationName AS application_name,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS created_on,
              DATE_FORMAT(updated_at, '%Y-%m-%d') AS updated_on
         FROM glossary ORDER BY id`,
    );
    const links: {
      glossary_id: number | string;
      portfolio_id: number | string;
    }[] = await queryRunner.query(
      `SELECT glossary_id, portfolio_id FROM glossary_portfolios
          WHERE is_active = 1 ORDER BY glossary_id, portfolio_id`,
    );
    const portfoliosOf = new Map<number, string[]>();
    for (const l of links ?? []) {
      const key = Number(l.glossary_id);
      portfoliosOf.set(key, [
        ...(portfoliosOf.get(key) ?? []),
        String(l.portfolio_id),
      ]);
    }

    const existing: ExistingConcept[] = await queryRunner.query(
      `SELECT id, term_id, extra FROM gc_concepts WHERE scheme_id = ?`,
      [scheme.id],
    );
    const byTermId = new Map(
      (existing ?? []).map((c) => [Number(c.term_id), c] as const),
    );

    const txId = randomUUID();
    /** term_id → id of the copied concept (new or already there). */
    const copied = new Map<number, number>();
    for (const row of rows ?? []) {
      const termId = Number(row.id);
      const found = byTermId.get(termId);
      let conceptId: number;
      if (found) {
        // Another concept owns this term_id: never overwritten, the row is skipped.
        if (!cls.isCopy(found.extra)) continue;
        conceptId = Number(found.id);
      } else {
        const c = cls.conceptRow(row, portfoliosOf.get(termId) ?? []);
        const result: { insertId?: number } | undefined =
          await queryRunner.query(
            `INSERT INTO gc_concepts
               (scheme_id, term_id, preferred_label, language, definition,
                source_citation, source_url, status, version,
                date_created, date_modified, extra)
             VALUES (?, ?, ?, 'en', ?, ?, ?, ?, '1.0', ?, ?, ?)`,
            [
              scheme.id,
              c.term_id,
              c.preferred_label,
              c.definition,
              c.source_citation,
              c.source_url,
              c.status,
              c.date_created,
              c.date_modified,
              c.extra,
            ],
          );
        conceptId = Number(result?.insertId);
        if (!Number.isInteger(conceptId) || conceptId <= 0) {
          const inserted: { id: number | string }[] = await queryRunner.query(
            `SELECT id FROM gc_concepts WHERE scheme_id = ? AND term_id = ? LIMIT 1`,
            [scheme.id, c.term_id],
          );
          conceptId = Number(inserted?.[0]?.id);
        }
        for (const label of cls.altLabels(row.alternative_labels)) {
          await queryRunner.query(
            `INSERT INTO gc_labels (concept_id, label, language, kind, status)
             VALUES (?, ?, 'en', 'alt', 'active')`,
            [conceptId, label],
          );
        }
        const changes: Record<string, { from: null; to: unknown }> = {};
        for (const [field, value] of Object.entries({
          preferred_label: c.preferred_label,
          status: c.status,
          definition: c.definition,
          source_citation: c.source_citation,
          source_url: c.source_url,
          extra: JSON.parse(c.extra) as unknown,
        })) {
          if (value !== null && value !== undefined)
            changes[field] = { from: null, to: value };
        }
        await queryRunner.query(
          `INSERT INTO gc_history (concept_id, action, changes, changed_by_email, tx_id)
           VALUES (?, 'create', ?, NULL, ?)`,
          [conceptId, JSON.stringify(changes), txId],
        );
      }
      copied.set(termId, conceptId);
      await queryRunner.query(
        `INSERT INTO gc_collection_members (collection_id, concept_id)
         SELECT ?, ? FROM DUAL
         WHERE NOT EXISTS (
           SELECT 1 FROM gc_collection_members WHERE collection_id = ? AND concept_id = ?
         )`,
        [collectionId, conceptId, collectionId, conceptId],
      );
    }

    // Second pass: the replacement is a copied concept too, known only now.
    for (const row of rows ?? []) {
      if (row.replaced_by_id === null || row.replaced_by_id === undefined)
        continue;
      const from = copied.get(Number(row.id));
      const to = copied.get(Number(row.replaced_by_id));
      if (!from || !to) continue;
      await queryRunner.query(
        `UPDATE gc_concepts SET replaced_by_id = ? WHERE id = ? AND replaced_by_id IS NULL`,
        [to, from],
      );
    }

    // New concepts never reuse a glossary id.
    const maxId = Math.max(0, ...(rows ?? []).map((r) => Number(r.id)));
    const next = Math.max(Number(scheme.next_term_id), maxId + 1);
    if (next !== Number(scheme.next_term_id)) {
      await queryRunner.query(
        `UPDATE gc_schemes SET next_term_id = ? WHERE id = ?`,
        [next, scheme.id],
      );
    }
  }

  /** Removes only the copied concepts (marked rows) with everything hanging from them, and the collection when it is left empty. The list and the field stay: other concepts may already use them. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const cls = CopyGlossaryIntoTaxonomy1793404800000;
    const schemes: { id: number | string }[] = await queryRunner.query(
      `SELECT id FROM gc_schemes WHERE code = ? LIMIT 1`,
      [cls.SCHEME_CODE],
    );
    if (!schemes?.length) return;
    const schemeId = schemes[0].id;
    const candidates: ExistingConcept[] = await queryRunner.query(
      `SELECT id, term_id, extra FROM gc_concepts WHERE scheme_id = ? AND extra LIKE ?`,
      [schemeId, `%"${cls.MARKER}"%`],
    );
    const ids = (candidates ?? [])
      .filter((c) => cls.isCopy(c.extra))
      .map((c) => Number(c.id));
    if (ids.length) {
      const marks = ids.map(() => '?').join(', ');
      for (const table of [
        'gc_collection_members',
        'gc_labels',
        'gc_history',
        'gc_mappings',
        'gc_icons',
        'gc_embeddings',
      ]) {
        await queryRunner.query(
          `DELETE FROM ${table} WHERE concept_id IN (${marks})`,
          ids,
        );
      }
      // No foreign keys in the module: a relation added in dev after the copy would otherwise point at nothing.
      await queryRunner.query(
        `DELETE FROM gc_relations WHERE concept_id IN (${marks}) OR related_concept_id IN (${marks})`,
        [...ids, ...ids],
      );
      await queryRunner.query(
        `UPDATE gc_concepts SET replaced_by_id = NULL WHERE replaced_by_id IN (${marks})`,
        ids,
      );
      await queryRunner.query(
        `DELETE FROM gc_concepts WHERE id IN (${marks})`,
        ids,
      );
    }
    await queryRunner.query(
      `DELETE FROM gc_collections
        WHERE scheme_id = ? AND code = ?
          AND NOT EXISTS (
            SELECT 1 FROM gc_collection_members m WHERE m.collection_id = gc_collections.id
          )`,
      [schemeId, cls.COLLECTION_CODE],
    );
  }
}
