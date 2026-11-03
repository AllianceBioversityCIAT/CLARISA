import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * An inactive glossary term must stay inactive in the taxonomy.
 *
 * `CopyGlossaryIntoTaxonomy1793404800000` now copies a term with
 * `is_active = 0` as `deprecated` (v1 `show=inactive`: public, marked as
 * retired) instead of `approved` (v1 `show=active`). Where the copy already ran
 * with the first version (dev), the inactive copies are `approved`: this moves
 * each of them to `deprecated` with a `status` row in the history, like a
 * status change made in the panel. Where the copy runs with the current version
 * (prod), there is nothing to change and nothing is written.
 *
 * Only copies (the `_glossary` mark in `extra`) whose `_glossary.is_active` is
 * `false` and whose status is still `approved` are touched.
 *
 * `down()` changes nothing: going back would publish inactive terms as current.
 * The copies themselves, history included, are removed by the copy's `down()`.
 */
export class GlossaryCopyInactiveAsDeprecated1793736000000
  implements MigrationInterface
{
  name = 'GlossaryCopyInactiveAsDeprecated1793736000000';

  static readonly SCHEME_CODE = 'meliaf-taxonomy';
  /** Key of `gc_concepts.extra` that marks a glossary copy (same as the copy). */
  static readonly MARKER = '_glossary';

  /** Whether a stored `extra` is the copy of an inactive glossary term. */
  static isInactiveCopy(extra: string | null | undefined): boolean {
    if (!extra) return false;
    let parsed: unknown;
    try {
      parsed = JSON.parse(extra);
    } catch {
      return false;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return false;
    const mark = (parsed as Record<string, unknown>)[
      GlossaryCopyInactiveAsDeprecated1793736000000.MARKER
    ];
    return (
      !!mark &&
      typeof mark === 'object' &&
      !Array.isArray(mark) &&
      (mark as Record<string, unknown>).is_active === false
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cls = GlossaryCopyInactiveAsDeprecated1793736000000;
    const schemes: { id: number | string }[] = await queryRunner.query(
      `SELECT id FROM gc_schemes WHERE code = ? LIMIT 1`,
      [cls.SCHEME_CODE],
    );
    if (!schemes?.length) return;
    const rows: { id: number | string; extra: string | null }[] =
      await queryRunner.query(
        `SELECT id, extra FROM gc_concepts
          WHERE scheme_id = ? AND status = 'approved' AND extra LIKE ?`,
        [schemes[0].id, `%"${cls.MARKER}"%`],
      );
    const ids = (rows ?? [])
      .filter((r) => cls.isInactiveCopy(r.extra))
      .map((r) => Number(r.id));
    if (!ids.length) return;

    const txId = randomUUID();
    const change = JSON.stringify({
      status: { from: 'approved', to: 'deprecated' },
    });
    for (const id of ids) {
      await queryRunner.query(
        `UPDATE gc_concepts SET status = 'deprecated'
          WHERE id = ? AND status = 'approved'`,
        [id],
      );
      await queryRunner.query(
        `INSERT INTO gc_history (concept_id, action, changes, changed_by_email, tx_id)
         VALUES (?, 'status', ?, NULL, ?)`,
        [id, change, txId],
      );
    }
  }

  public async down(): Promise<void> {
    // Nothing: see the class comment.
  }
}
