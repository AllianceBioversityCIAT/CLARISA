import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives the 2025 projects the `external_code` their 2026 W3 row already has,
 * so MEL can link the same project across years by code (Santiago Sánchez,
 * 2026-10-16, case reported by ICARDA: `146 F-AG10607-ASIA-AFRICA…` and
 * `591 F-AG10607` had nothing in common but the name).
 *
 * The 2025 rows carry the code glued to the start of `short_name`. A 2026 code
 * is copied only when it opens the 2025 `short_name` and is followed by a
 * non-alphanumeric character or the end of the name (`R-A-2022-8` must not
 * take `R-A-2022-80-REMET`). Left empty, to be mapped later by the centres:
 * names that open with no 2026 code, names two codes could claim, and codes
 * that more than one 2025 project would take (Santiago validates those by
 * hand). `short_name` is never touched.
 *
 * Idempotent: only empty codes are filled. `down()` empties exactly the codes
 * this rule would have written.
 */
export class BackfillProjectCodes20251792170000000
  implements MigrationInterface
{
  name = 'BackfillProjectCodes20251792170000000';

  /** 2025 project id → the 2026 code it takes. */
  static matchCodes(
    projects: ReadonlyArray<{ id: number | string; short_name: string }>,
    codes: ReadonlyArray<string>,
  ): Map<string, string> {
    const matches = new Map<string, string>();
    for (const project of projects) {
      const name = (project.short_name ?? '').trim().toUpperCase();
      const hits = codes.filter((code) => {
        const prefix = code.trim().toUpperCase();
        if (!prefix || !name.startsWith(prefix)) return false;
        const next = name.charAt(prefix.length);
        return next === '' || !/[0-9A-Z]/.test(next);
      });
      if (hits.length === 1) matches.set(String(project.id), hits[0].trim());
    }

    const taken = new Map<string, number>();
    for (const code of matches.values())
      taken.set(code, (taken.get(code) ?? 0) + 1);
    for (const [id, code] of matches)
      if ((taken.get(code) ?? 0) > 1) matches.delete(id);

    return matches;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const codes = await this.codes2026(queryRunner);
    const projects: { id: number | string; short_name: string }[] =
      await queryRunner.query(
        `SELECT id, short_name FROM project
          WHERE phase = 2025 AND external_source IS NULL
            AND (external_code IS NULL OR external_code = '')`,
      );
    const cls = BackfillProjectCodes20251792170000000;
    for (const [id, code] of cls.matchCodes(projects, codes)) {
      await queryRunner.query(
        `UPDATE project SET external_code = ?
          WHERE id = ? AND (external_code IS NULL OR external_code = '')`,
        [code, id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = await this.codes2026(queryRunner);
    const projects: {
      id: number | string;
      short_name: string;
      external_code: string;
    }[] = await queryRunner.query(
      `SELECT id, short_name, external_code FROM project
        WHERE phase = 2025 AND external_source IS NULL
          AND external_code IS NOT NULL AND external_code <> ''`,
    );
    const cls = BackfillProjectCodes20251792170000000;
    const matches = cls.matchCodes(projects, codes);
    for (const project of projects) {
      if (matches.get(String(project.id)) !== project.external_code) continue;
      await queryRunner.query(
        `UPDATE project SET external_code = NULL WHERE id = ?`,
        [project.id],
      );
    }
  }

  private async codes2026(queryRunner: QueryRunner): Promise<string[]> {
    const rows: { external_code: string }[] = await queryRunner.query(
      `SELECT DISTINCT external_code FROM project
        WHERE phase = 2026 AND external_code IS NOT NULL AND external_code <> ''`,
    );
    return rows.map((r) => r.external_code);
  }
}
