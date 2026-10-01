import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Plain labels for the technical permissions that the Roles screen showed under
 * "Other" with their raw route (names read from clarisatest on 2026-09-30).
 * Data only, idempotent: a row is labelled only while its label is still NULL,
 * so a label edited by hand is never overwritten. `down()` clears only the
 * labels this migration wrote.
 */
export class LabelTechnicalPermissions1790600200000
  implements MigrationInterface
{
  name = 'LabelTechnicalPermissions1790600200000';

  static readonly LABELS: [string, string, string, string][] = [
    [
      '/api/users/update',
      'Access',
      'Edit user records',
      'Change the stored data of CLARISA users (not their roles).',
    ],
    [
      '/integration/cronjobs/ost/initiatives',
      'Automation',
      'Sync OST initiatives',
      'Run the scheduled import of initiatives from OST.',
    ],
    [
      '/integration/cronjobs/ost/workpackages',
      'Automation',
      'Sync OST work packages',
      'Run the scheduled import of work packages from OST.',
    ],
    [
      '/integration/cronjobs/toc/phases',
      'Automation',
      'Sync ToC phases',
      'Run the scheduled import of phases from the Theory of Change.',
    ],
    [
      '/integration/cronjobs/reporting/phases',
      'Automation',
      'Sync Reporting phases',
      'Run the scheduled import of phases from the Reporting tool (PRMS).',
    ],
    [
      '/integration/cronjobs/ipsr/phases',
      'Automation',
      'Sync IPSR phases',
      'Run the scheduled import of phases from IPSR.',
    ],
    [
      '/integration/cronjobs/risk/phases',
      'Automation',
      'Sync Risk phases',
      'Run the scheduled import of phases from the Risk module.',
    ],
    [
      '/cronjobs/global-parameters/refresh',
      'Automation',
      'Refresh global parameters',
      'Reload the global parameters cache.',
    ],
    [
      '/integration/open-search/institutions/reset',
      'Search index',
      'Rebuild institutions index',
      'Rebuild the OpenSearch index of institutions.',
    ],
    [
      '/integration/open-search/institutions/search',
      'Search index',
      'Search institutions index',
      'Query the OpenSearch index of institutions.',
    ],
    [
      '/integration/open-search/countries/reset',
      'Search index',
      'Rebuild countries index',
      'Rebuild the OpenSearch index of countries.',
    ],
    [
      '/integration/open-search/countries/search',
      'Search index',
      'Search countries index',
      'Query the OpenSearch index of countries.',
    ],
    [
      '/integration/open-search/subnational/reset',
      'Search index',
      'Rebuild subnational index',
      'Rebuild the OpenSearch index of subnational areas.',
    ],
    [
      '/integration/open-search/subnational/search',
      'Search index',
      'Search subnational index',
      'Query the OpenSearch index of subnational areas.',
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [
      name,
      module,
      label,
      description,
    ] of LabelTechnicalPermissions1790600200000.LABELS) {
      await queryRunner.query(
        'UPDATE `permissions` SET `module` = ?, `label` = ?, `description` = ?, `updated_at` = `updated_at` WHERE `name` = ? AND `label` IS NULL',
        [module, label, description, name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [
      name,
      module,
      label,
    ] of LabelTechnicalPermissions1790600200000.LABELS) {
      await queryRunner.query(
        'UPDATE `permissions` SET `module` = NULL, `label` = NULL, `description` = NULL, `updated_at` = `updated_at` WHERE `name` = ? AND `module` = ? AND `label` = ?',
        [name, module, label],
      );
    }
  }
}
