import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the validity period to `institutions` and creates `institution_lineage`,
 * a directed-edge table cloned from `global_unit_lineage`
 * (migration 1758728616259-AddYearandLineageGlobalUnits), already in production
 * and already mirrored by PRMS.
 *
 * Strictly additive: no existing column is renamed, dropped or retyped, no row
 * is updated, and `is_active` is never touched. Every existing institution keeps
 * `start_date` and `end_date` NULL, which the API contract reads as "valid".
 *
 * Written by hand on purpose. `npm run migration:generate` cannot be used in
 * this repo: `InstitutionLocation` declares two @ManyToOne over the same
 * `institution_id` column, and the auto-generated FK name
 * `FK_925720f685c6e80a6dd12e8b179` is already created twice pointing at two
 * different tables (FirstMigration and oldInstitutionFix). Every constraint
 * below is named explicitly.
 *
 * This migration is only ever executed by the deploy pipeline, never by hand,
 * so every statement is guarded and the whole thing is a no-op on retry.
 *
 * DEPLOY ORDER — this migration must run BEFORE the new image starts serving.
 * The repo cannot enforce it: `ormconfig` sets `migrationsRun: false`, the
 * production image has no `ts-node` (devDependency, and `migration:execute`
 * loads `src/ormconfig.ts`), and the Jenkins job lives outside this repository.
 * The order matters more than usual here because the `Institution` entity now
 * declares `start_date` / `end_date`: with the new code on the old schema every
 * ORM read of the entity fails, which is not only `GET /api/institutions` but
 * anything loading `institution_object` — partner requests, country office
 * requests, centers, CGIAR entities, projects. The reverse order is safe: the
 * pre-change queries were verified against the migrated schema and return the
 * same rows and the same columns, so the migration can be applied while the old
 * image is still serving. If the migration fails, the deploy must be aborted.
 */
export class AddInstitutionValidityAndLineage1785994442256
  implements MigrationInterface
{
  name = 'AddInstitutionValidityAndLineage1785994442256';

  private static readonly LINEAGE_TABLE = 'institution_lineage';
  private static readonly FK_FROM = 'fk_institution_lineage_from_institution';
  private static readonly FK_TO = 'fk_institution_lineage_to_institution';
  /** seconds an ALTER may wait for the metadata lock before the deploy fails */
  private static readonly LOCK_WAIT_TIMEOUT_SECONDS = 30;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.withBoundedLockWait(queryRunner, () =>
      this.applyUp(queryRunner),
    );
  }

  private async applyUp(queryRunner: QueryRunner): Promise<void> {
    // Both columns are appended at the end of the row and are NULLable with no
    // default, so MySQL 8 applies them with ALGORITHM=INSTANT: no table rebuild
    // and no blocking of readers or writers on `institutions`.
    if (!(await this.columnExists(queryRunner, 'institutions', 'start_date'))) {
      await queryRunner.query(
        `ALTER TABLE \`institutions\` ADD \`start_date\` date NULL`,
      );
    }

    if (!(await this.columnExists(queryRunner, 'institutions', 'end_date'))) {
      await queryRunner.query(
        `ALTER TABLE \`institutions\` ADD \`end_date\` date NULL`,
      );
    }

    // Clone of `global_unit_lineage` with two deliberate deltas:
    //   - `change_date`: the date of the real-world fact, which is not the same
    //     as `created_at` (the date the row was typed into the database).
    //   - `created_by`: who retired an institution consumed by the whole CGIAR
    //     must be traceable. Nullable because rows seeded by migration have no
    //     interactive user.
    // `relation_type` keeps the production vocabulary verbatim, including the
    // fact that a rename is stored as 'NEW'. Diverging here would make PRMS's
    // `default:` branch launder any new value back into 'NEW' anyway, and would
    // leave two sibling tables speaking different dialects.
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`${AddInstitutionValidityAndLineage1785994442256.LINEAGE_TABLE}\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`from_institution_id\` bigint NULL,
        \`to_institution_id\` bigint NOT NULL,
        \`relation_type\` enum ('MERGE', 'SPLIT', 'SUCCESSOR', 'NEW') NOT NULL,
        \`change_date\` date NULL,
        \`note\` text NULL,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`created_by\` bigint NULL,
        INDEX \`idx_institution_lineage_from\` (\`from_institution_id\`),
        INDEX \`idx_institution_lineage_to\` (\`to_institution_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );

    // Guarded separately: CREATE TABLE IF NOT EXISTS leaves the table in place
    // on a retry, but re-adding a foreign key fails with ER_FK_DUP_NAME (1826).
    if (
      !(await this.foreignKeyExists(
        queryRunner,
        AddInstitutionValidityAndLineage1785994442256.FK_FROM,
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE \`${AddInstitutionValidityAndLineage1785994442256.LINEAGE_TABLE}\`
           ADD CONSTRAINT \`${AddInstitutionValidityAndLineage1785994442256.FK_FROM}\`
           FOREIGN KEY (\`from_institution_id\`) REFERENCES \`institutions\`(\`id\`)
           ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    if (
      !(await this.foreignKeyExists(
        queryRunner,
        AddInstitutionValidityAndLineage1785994442256.FK_TO,
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE \`${AddInstitutionValidityAndLineage1785994442256.LINEAGE_TABLE}\`
           ADD CONSTRAINT \`${AddInstitutionValidityAndLineage1785994442256.FK_TO}\`
           FOREIGN KEY (\`to_institution_id\`) REFERENCES \`institutions\`(\`id\`)
           ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.withBoundedLockWait(queryRunner, () =>
      this.applyDown(queryRunner),
    );
  }

  private async applyDown(queryRunner: QueryRunner): Promise<void> {
    // Reverse order. DROP TABLE takes the table's own foreign keys and indices
    // with it, so they are not dropped one by one.
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`${AddInstitutionValidityAndLineage1785994442256.LINEAGE_TABLE}\``,
    );

    if (await this.columnExists(queryRunner, 'institutions', 'end_date')) {
      await queryRunner.query(
        `ALTER TABLE \`institutions\` DROP COLUMN \`end_date\``,
      );
    }

    if (await this.columnExists(queryRunner, 'institutions', 'start_date')) {
      await queryRunner.query(
        `ALTER TABLE \`institutions\` DROP COLUMN \`start_date\``,
      );
    }
  }

  /**
   * Runs the migration with a bounded wait for the metadata lock.
   *
   * Every `ALTER TABLE institutions` here needs the exclusive metadata lock on
   * the table, and it can only take it once every transaction that already
   * touched `institutions` has finished. MySQL's default `lock_wait_timeout` is
   * 31536000 seconds — a year — so a single long-running transaction does not
   * make the ALTER fail: it makes it wait, and while it waits every request
   * that arrives afterwards queues behind it. The most consumed catalogue of
   * the platform stops answering PRMS, MEL, MARLO and STAR for as long as that
   * lasts, with nothing in the logs but a deploy that has not finished.
   *
   * Failing after 30 seconds is the better of the two outcomes: the deploy goes
   * red, which is exactly what it should do, and the pipeline can just run the
   * migration again once the blocking transaction is gone, because every
   * statement below is idempotent.
   *
   * The previous value is restored so nothing is left behind on the pooled
   * connection this migration borrowed.
   */
  private async withBoundedLockWait(
    queryRunner: QueryRunner,
    run: () => Promise<void>,
  ): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT @@session.lock_wait_timeout AS previous`,
    );
    // Interpolated, not bound: the value is read straight from the server and
    // forced through Number, and `SET SESSION` takes no placeholders on every
    // driver.
    const previous = Number(row?.previous) || 31536000;

    await queryRunner.query(
      `SET SESSION lock_wait_timeout = ${AddInstitutionValidityAndLineage1785994442256.LOCK_WAIT_TIMEOUT_SECONDS}`,
    );

    try {
      await run();
    } finally {
      await queryRunner.query(`SET SESSION lock_wait_timeout = ${previous}`);
    }
  }

  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const [{ found }] = await queryRunner.query(
      `SELECT COUNT(1) AS found
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?`,
      [table, column],
    );
    return Number(found) > 0;
  }

  private async foreignKeyExists(
    queryRunner: QueryRunner,
    name: string,
  ): Promise<boolean> {
    const [{ found }] = await queryRunner.query(
      `SELECT COUNT(1) AS found
         FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
          AND CONSTRAINT_NAME = ?`,
      [AddInstitutionValidityAndLineage1785994442256.LINEAGE_TABLE, name],
    );
    return Number(found) > 0;
  }
}
