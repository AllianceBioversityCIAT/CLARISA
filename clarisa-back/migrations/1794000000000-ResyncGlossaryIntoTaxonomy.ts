import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { CopyGlossaryIntoTaxonomy1793404800000 } from './1793404800000-CopyGlossaryIntoTaxonomy';

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
  created_epoch: number | string | null;
  updated_epoch: number | string | null;
  created_by: number | string | null;
  updated_by: number | string | null;
  modification_justification: string | null;
};

type ConceptRow = {
  id: number | string;
  term_id: number | string;
  preferred_label: string;
  definition: string | null;
  source_citation: string | null;
  source_url: string | null;
  status: string;
  replaced_by_id: number | string | null;
  extra: string | null;
};

/**
 * Brings the taxonomy copy of the glossary up to date with the `glossary`
 * table, right before the glossary starts reading and writing the taxonomy
 * only (`GlossaryStore`, 2026-11-06). After this release the `glossary` table
 * is no longer written: it stays as the backup.
 *
 * The copy of 2026-11-03 (`CopyGlossaryIntoTaxonomy1793404800000`) ran once.
 * Anything the glossary panel changed after it lives only in `glossary`, so:
 *
 * - a term created since then is copied (the copy's own `up`, idempotent);
 * - every copied term gets the table's current term, definition, provenance,
 *   status, replacement, alternative labels (same order) and portfolios;
 * - `extra._glossary` gets everything v1 and the panel read and the first
 *   copy did not keep: the editorial status (an inactive term was copied as
 *   `deprecated` and v1 publishes its own editorial status), the audit fields
 *   (who and when), the raw group and the modification note.
 *
 * A change to what readers see leaves an `update` row in `gc_history`; adding
 * the internal `_glossary` fields does not. Where the two stores already
 * agree (prod on 2026-11-06), the only write is that enrichment. Other keys
 * of `extra` (custom fields of the taxonomy) are kept.
 *
 * `down()` refuses to run (2026-11-11): the previous state of the copy is
 * not kept, and a revert followed by a new run would replay `up()` and
 * overwrite every later edit with the stale `glossary` table.
 */
export class ResyncGlossaryIntoTaxonomy1794000000000
  implements MigrationInterface
{
  name = 'ResyncGlossaryIntoTaxonomy1794000000000';

  static readonly SCHEME_CODE = 'meliaf-taxonomy';
  static readonly COLLECTION_CODE = 'glossary';
  static readonly MARKER = '_glossary';
  static readonly PORTFOLIOS = 'portfolios';

  static statusOf(editorial: string | null, active: boolean): string {
    const known = ['draft', 'in_review', 'approved', 'deprecated'];
    const status = known.includes(String(editorial))
      ? String(editorial)
      : 'approved';
    if (active || status === 'draft' || status === 'in_review') return status;
    return 'deprecated';
  }

  static iso(epoch: number | string | null): string | null {
    if (epoch === null || epoch === undefined || epoch === '') return null;
    const ms = Number(epoch) * 1000;
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  static meta(row: GlossaryRow) {
    const cls = ResyncGlossaryIntoTaxonomy1794000000000;
    const raw = cls.v1Labels(row.alternative_labels);
    const num = (v: number | string | null) =>
      v === null || v === undefined ? null : Number(v);
    return {
      is_active: Boolean(Number(row.is_active ?? 1)),
      show_in_dashboard: Boolean(Number(row.show_in_dashboard ?? 0)),
      group_id: num(row.group_id),
      reference_date: row.reference_date ?? null,
      application_name: row.application_name ?? null,
      editorial_status: row.editorial_status ?? 'approved',
      created_at: cls.iso(row.created_epoch),
      updated_at: cls.iso(row.updated_epoch),
      created_by: num(row.created_by),
      updated_by: num(row.updated_by),
      modification_justification: row.modification_justification ?? null,
      // Kept only when two labels are one for the gc_labels unique key, so
      // the glossary still serves both spellings (GlossaryStore reads it).
      ...(raw.length !== cls.distinct(raw).length
        ? { alternative_labels: raw }
        : {}),
    };
  }

  /**
   * Labels without the ones the unique key of `gc_labels` holds equal
   * (first 191 characters, case and accents ignored); first spelling wins.
   * Without it a pair like "Café" / "Cafe" would differ from what the copy
   * stored on every run and fail on the second insert.
   */
  static distinct(labels: string[]): string[] {
    const seen = new Set<string>();
    return labels.filter((label) => {
      const key = String(label)
        .trim()
        .slice(0, 191)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** The labels as v1 reads them (`parseLabels`): strings, trimmed, no blanks. */
  static v1Labels(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed
            .filter((l): l is string => typeof l === 'string')
            .map((l) => l.trim())
            .filter((l) => l !== '')
        : [];
    } catch {
      return [];
    }
  }

  static parse(extra: string | null): Record<string, unknown> {
    if (!extra) return {};
    try {
      const parsed: unknown = JSON.parse(extra);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = ResyncGlossaryIntoTaxonomy1794000000000;
    const schemes: { id: number | string; next_term_id: number | string }[] =
      await queryRunner.query(
        `SELECT id, next_term_id FROM gc_schemes WHERE code = ? LIMIT 1`,
        [cls.SCHEME_CODE],
      );
    if (!schemes?.length) return;

    // Terms created since the first copy (and the collection, list and field
    // where they are missing). Idempotent; stops without writing when a
    // term_id belongs to a concept that is not a glossary copy.
    // The copy re-opens a real transaction when TypeORM's is active, so
    // everything below is part of the same all-or-nothing run.
    await new CopyGlossaryIntoTaxonomy1793404800000().up(queryRunner);

    const schemeId = Number(schemes[0].id);
    const rows: GlossaryRow[] = await queryRunner.query(
      `SELECT id, title, definition, source, source_url,
              DATE_FORMAT(reference_date, '%Y-%m-%d') AS reference_date,
              group_id, alternative_labels, editorial_status, replaced_by_id,
              show_in_dashboard, is_active, applicationName AS application_name,
              UNIX_TIMESTAMP(created_at) AS created_epoch,
              UNIX_TIMESTAMP(updated_at) AS updated_epoch,
              created_by, updated_by, modification_justification
         FROM glossary ORDER BY id`,
    );
    const links: {
      glossary_id: number | string;
      portfolio_id: number | string;
    }[] = await queryRunner.query(
      `SELECT glossary_id, portfolio_id FROM glossary_portfolios
          WHERE is_active = 1 ORDER BY id`,
    );
    const portfoliosOf = new Map<number, string[]>();
    for (const l of links ?? []) {
      const key = Number(l.glossary_id);
      const list = portfoliosOf.get(key) ?? [];
      if (!list.includes(String(l.portfolio_id)))
        list.push(String(l.portfolio_id));
      portfoliosOf.set(key, list);
    }
    const concepts: ConceptRow[] = await queryRunner.query(
      `SELECT c.id, c.term_id, c.preferred_label, c.definition,
              c.source_citation, c.source_url, c.status, c.replaced_by_id, c.extra
         FROM gc_concepts c
         JOIN gc_collection_members m ON m.concept_id = c.id
         JOIN gc_collections col ON col.id = m.collection_id
        WHERE c.scheme_id = ? AND col.scheme_id = ? AND col.code = ?`,
      [schemeId, schemeId, cls.COLLECTION_CODE],
    );
    const byTerm = new Map(
      (concepts ?? []).map((c) => [Number(c.term_id), c] as const),
    );
    const altLabels: { concept_id: number | string; label: string }[] =
      await queryRunner.query(
        `SELECT l.concept_id, l.label FROM gc_labels l
           JOIN gc_concepts c ON c.id = l.concept_id
          WHERE c.scheme_id = ? AND l.kind = 'alt' ORDER BY l.id`,
        [schemeId],
      );
    const labelsOf = new Map<number, string[]>();
    for (const l of altLabels ?? []) {
      const key = Number(l.concept_id);
      labelsOf.set(key, [...(labelsOf.get(key) ?? []), l.label]);
    }

    const txId = randomUUID();
    for (const row of rows ?? []) {
      const concept = byTerm.get(Number(row.id));
      if (!concept) continue; // the copy stopped above if it could not copy it
      const conceptId = Number(concept.id);
      const meta = cls.meta(row);
      const status = cls.statusOf(row.editorial_status, meta.is_active);
      const replacement =
        row.replaced_by_id === null || row.replaced_by_id === undefined
          ? null
          : byTerm.get(Number(row.replaced_by_id));
      const replacedBy = replacement ? Number(replacement.id) : null;
      const labels = cls.distinct(
        CopyGlossaryIntoTaxonomy1793404800000.altLabels(row.alternative_labels),
      );
      const portfolios = portfoliosOf.get(Number(row.id)) ?? [];

      const extra = cls.parse(concept.extra);
      const beforePortfolios = Array.isArray(extra[cls.PORTFOLIOS])
        ? (extra[cls.PORTFOLIOS] as unknown[]).map(String)
        : [];
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      const diff = (field: string, from: unknown, to: unknown) => {
        if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null))
          changes[field] = { from: from ?? null, to: to ?? null };
      };
      diff('preferred_label', concept.preferred_label, String(row.title ?? ''));
      diff('definition', concept.definition, row.definition ?? null);
      diff('source_citation', concept.source_citation, row.source ?? null);
      diff('source_url', concept.source_url, row.source_url ?? null);
      diff('status', concept.status, status);
      diff(
        'replaced_by_id',
        concept.replaced_by_id === null ? null : Number(concept.replaced_by_id),
        replacedBy,
      );
      diff(cls.PORTFOLIOS, beforePortfolios, portfolios);
      const labelsBefore = labelsOf.get(conceptId) ?? [];
      diff('alternative_labels', labelsBefore, labels);

      const metaChanged =
        JSON.stringify(extra[cls.MARKER] ?? null) !== JSON.stringify(meta);
      if (!Object.keys(changes).length && !metaChanged) continue;

      extra[cls.MARKER] = meta;
      if (portfolios.length) extra[cls.PORTFOLIOS] = portfolios;
      else delete extra[cls.PORTFOLIOS];

      await queryRunner.query(
        `UPDATE gc_concepts
            SET preferred_label = ?, definition = ?, source_citation = ?,
                source_url = ?, status = ?, replaced_by_id = ?, extra = ?
          WHERE id = ?`,
        [
          String(row.title ?? ''),
          row.definition ?? null,
          row.source ?? null,
          row.source_url ?? null,
          status,
          replacedBy,
          JSON.stringify(extra),
          conceptId,
        ],
      );
      if ('alternative_labels' in changes) {
        await queryRunner.query(
          `DELETE FROM gc_labels WHERE concept_id = ? AND kind = 'alt'`,
          [conceptId],
        );
        for (const label of labels) {
          // Guarded like the copy: the unique key ignores case and accents.
          await queryRunner.query(
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
      if (Object.keys(changes).length) {
        await queryRunner.query(
          `UPDATE gc_concepts SET date_modified = ? WHERE id = ?`,
          [new Date().toISOString().slice(0, 10), conceptId],
        );
        await queryRunner.query(
          `INSERT INTO gc_history (concept_id, action, changes, changed_by_email, tx_id)
           VALUES (?, 'update', ?, NULL, ?)`,
          [conceptId, JSON.stringify(changes), txId],
        );
      }
    }
  }

  public async down(): Promise<void> {
    throw new Error(
      'ResyncGlossaryIntoTaxonomy1794000000000 cannot be reverted: gc_concepts ' +
        'holds the only live copy of the glossary, and running it again after a ' +
        'revert would overwrite later edits with the old glossary table. ' +
        'Restore a database backup instead.',
    );
  }
}
