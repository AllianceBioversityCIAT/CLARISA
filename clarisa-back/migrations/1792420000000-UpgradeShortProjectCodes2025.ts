import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives the 2025 projects that already carry a short `external_code` the full
 * 2026 code it belongs to, so `?code=` links them with their 2026 row
 * (Santiago Sánchez, 2026-10-16: 31 projects in production, e.g. `192 D514`
 * vs `449 C-D514`, `4 S245` vs `500 C-S245`, `55 A1540` vs `325 B-A1540`).
 *
 * A 2026 code is taken only when it ends in `-` + the short code (`C-D514`
 * for `D514`, never `C-D5140` nor `C-XD514`), exactly one 2026 code does so,
 * and no other 2025 project (any source) already has it or would take it.
 * Anything else keeps its short code, to be mapped by hand (F100, D409, D510
 * and D527 at the time of writing).
 *
 * Idempotent: a code that already is a 2026 code is left alone, and each
 * UPDATE only fires while the row still holds the short code it read.
 * `down()` does nothing: the short code is the tail of the code written
 * (`C-D514` → `D514`), and undoing it by rule could not tell those rows apart
 * from codes set by hand.
 */
export class UpgradeShortProjectCodes20251792420000000
  implements MigrationInterface
{
  name = 'UpgradeShortProjectCodes20251792420000000';

  /**
   * 2025 project id → the 2026 code that replaces its short code. `held2025`
   * are the codes of every 2025 row, other sources included.
   */
  static matchShortCodes(
    projects: ReadonlyArray<{ id: number | string; external_code: string }>,
    codes: ReadonlyArray<string>,
    held2025: ReadonlyArray<string> = [],
  ): Map<string, string> {
    const full = codes.map((code) => code.trim()).filter(Boolean);
    const fullUpper = new Set(full.map((code) => code.toUpperCase()));
    const held = new Set(
      [...projects.map((p) => p.external_code), ...held2025]
        .map((code) => (code ?? '').trim().toUpperCase())
        .filter((code) => fullUpper.has(code)),
    );

    const matches = new Map<string, string>();
    for (const project of projects) {
      const short = (project.external_code ?? '').trim().toUpperCase();
      if (!short || fullUpper.has(short)) continue;
      const hits = full.filter((code) =>
        code.toUpperCase().endsWith(`-${short}`),
      );
      if (hits.length !== 1 || held.has(hits[0].toUpperCase())) continue;
      matches.set(String(project.id), hits[0]);
    }

    const taken = new Map<string, number>();
    for (const code of matches.values())
      taken.set(code, (taken.get(code) ?? 0) + 1);
    for (const [id, code] of matches)
      if ((taken.get(code) ?? 0) > 1) matches.delete(id);

    return matches;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { external_code: string }[] = await queryRunner.query(
      `SELECT DISTINCT external_code FROM project
        WHERE phase = 2026 AND external_code IS NOT NULL AND external_code <> ''`,
    );
    const projects: { id: number | string; external_code: string }[] =
      await queryRunner.query(
        `SELECT id, external_code FROM project
          WHERE phase = 2025 AND external_source IS NULL
            AND external_code IS NOT NULL AND external_code <> ''`,
      );
    const held: { external_code: string }[] = await queryRunner.query(
      `SELECT external_code FROM project
        WHERE phase = 2025 AND external_code IS NOT NULL AND external_code <> ''`,
    );
    const shortById = new Map(
      projects.map((p) => [String(p.id), p.external_code]),
    );
    const cls = UpgradeShortProjectCodes20251792420000000;
    const matches = cls.matchShortCodes(
      projects,
      rows.map((r) => r.external_code),
      held.map((r) => r.external_code),
    );
    for (const [id, code] of matches) {
      await queryRunner.query(
        `UPDATE project SET external_code = ?
          WHERE id = ? AND external_code = ?`,
        [code, id, shortById.get(id)],
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty, see the class comment.
  }
}
