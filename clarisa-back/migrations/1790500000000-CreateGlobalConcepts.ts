import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the Global Concepts module: every table it owns, the MELIAF scheme
 * and the controlled lists of the MELIAF data schema template v0.1 (sheet
 * "Lists").
 *
 * Asked for the MELIAF taxonomy hosting evaluation ahead of the Rabat
 * buildshop (6–8 Oct 2026). Design: openspec/changes/add-global-concepts.
 *
 * Decoupled on purpose: every table is prefixed `gc_`, and none declares a
 * foreign key to — or is referenced by — any table outside the module. Who
 * edited is stored as email text, platforms as their code. Reverting this
 * migration drops the whole module and leaves every other table untouched.
 *
 * Idempotent: `CREATE TABLE IF NOT EXISTS` and `INSERT … WHERE NOT EXISTS`,
 * because each DDL statement commits on its own in MySQL and a partial run has
 * to be repeatable.
 */
export class CreateGlobalConcepts1790500000000 implements MigrationInterface {
  name = 'CreateGlobalConcepts1790500000000';

  /** Controlled lists, exactly as the schema template's "Lists" sheet. */
  static readonly LISTS: Record<string, string[]> = {
    status: ['Draft', 'In review', 'Approved', 'Deprecated'],
    meliaf_function: [
      'MEL',
      'IA',
      'IA (ex ante)',
      'Foresight',
      'Cross-cutting',
    ],
    meliaf_phase: [
      'Core term',
      'Proposal',
      'Design',
      'Implementation',
      'Analysis',
      'Sharing',
    ],
    term_type: [
      'Concept',
      'Process step',
      'Method',
      'Study type',
      'Product',
      'Role',
      'Metric',
    ],
    derivation: [
      'Verbatim from source',
      'Adapted from source',
      'Newly written',
      'Consolidated from several sources',
    ],
    language: ['en', 'fr', 'es'],
    icon_status: ['Final', 'Draft', 'Placeholder', 'Not yet designed'],
    icon_format: ['SVG', 'PNG', 'AI', 'EPS'],
  };

  private readonly tables: string[] = [
    `CREATE TABLE IF NOT EXISTS \`gc_schemes\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`code\` varchar(50) NOT NULL,
      \`title\` varchar(255) NOT NULL,
      \`description\` text NULL,
      \`uri_base\` varchar(255) NULL,
      \`default_language\` varchar(10) NOT NULL DEFAULT 'en',
      \`license\` varchar(255) NULL,
      \`publisher\` varchar(255) NULL,
      \`governance_description\` text NULL,
      \`owner_platform\` varchar(50) NULL,
      \`next_term_id\` bigint NOT NULL DEFAULT 1,
      \`validator_required\` tinyint NOT NULL DEFAULT 0,
      \`no_objection_days\` int NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_schemes_code\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_concepts\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`scheme_id\` bigint NOT NULL,
      \`term_id\` bigint NOT NULL,
      \`preferred_label\` varchar(500) NOT NULL,
      \`language\` varchar(10) NOT NULL DEFAULT 'en',
      \`definition\` text NULL,
      \`short_definition\` varchar(500) NULL,
      \`scope_note\` text NULL,
      \`example_of_use\` text NULL,
      \`term_type\` varchar(50) NULL,
      \`meliaf_function\` text NULL,
      \`meliaf_phase_primary\` varchar(50) NULL,
      \`meliaf_phase_also\` text NULL,
      \`source_citation\` text NULL,
      \`source_url\` varchar(1000) NULL,
      \`derivation\` varchar(50) NULL,
      \`origin\` varchar(30) NULL,
      \`ai_generated_fields\` text NULL,
      \`status\` varchar(20) NOT NULL DEFAULT 'draft',
      \`version\` varchar(20) NOT NULL DEFAULT '1.0',
      \`date_created\` date NULL,
      \`date_modified\` date NULL,
      \`validated_by\` text NULL,
      \`date_validated\` date NULL,
      \`steward\` varchar(255) NULL,
      \`replaced_by_id\` bigint NULL,
      \`rights_note\` text NULL,
      \`notes\` text NULL,
      \`extra\` text NULL,
      \`created_by_email\` varchar(255) NULL,
      \`updated_by_email\` varchar(255) NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_concepts_scheme_term\` (\`scheme_id\`, \`term_id\`),
      KEY \`IDX_gc_concepts_scheme_status\` (\`scheme_id\`, \`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_labels\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`concept_id\` bigint NOT NULL,
      \`label\` varchar(500) NOT NULL,
      \`language\` varchar(10) NOT NULL DEFAULT 'en',
      \`kind\` varchar(20) NOT NULL DEFAULT 'alt',
      \`status\` varchar(20) NOT NULL DEFAULT 'active',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_labels_concept_lang_label\` (\`concept_id\`, \`language\`, \`label\`(191)),
      KEY \`IDX_gc_labels_label\` (\`label\`(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_relations\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`concept_id\` bigint NOT NULL,
      \`related_concept_id\` bigint NOT NULL,
      \`kind\` varchar(20) NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_relations\` (\`concept_id\`, \`related_concept_id\`, \`kind\`),
      KEY \`IDX_gc_relations_related\` (\`related_concept_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_collections\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`scheme_id\` bigint NOT NULL,
      \`code\` varchar(100) NOT NULL,
      \`label\` varchar(255) NOT NULL,
      \`ordered\` tinyint NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_collections_scheme_code\` (\`scheme_id\`, \`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_collection_members\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`collection_id\` bigint NOT NULL,
      \`concept_id\` bigint NOT NULL,
      \`position\` int NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_collection_members\` (\`collection_id\`, \`concept_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_mappings\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`concept_id\` bigint NOT NULL,
      \`target_scheme\` varchar(50) NOT NULL,
      \`target_uri\` varchar(1000) NOT NULL,
      \`target_label\` varchar(500) NULL,
      \`match_type\` varchar(20) NOT NULL DEFAULT 'close',
      \`justification\` varchar(30) NOT NULL DEFAULT 'manual',
      \`confidence\` decimal(4,3) NULL,
      \`author_email\` varchar(255) NULL,
      \`reviewed_by_email\` varchar(255) NULL,
      \`mapped_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`status\` varchar(20) NOT NULL DEFAULT 'approved',
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_mappings\` (\`concept_id\`, \`target_uri\`(255), \`match_type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_icons\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`icon_code\` varchar(50) NULL,
      \`concept_id\` bigint NOT NULL,
      \`icon_status\` varchar(30) NULL,
      \`file_name\` varchar(255) NULL,
      \`file_format\` varchar(10) NULL,
      \`designer\` varchar(255) NULL,
      \`designer_country\` varchar(100) NULL,
      \`year_created\` int NULL,
      \`rights_and_licence\` varchar(255) NULL,
      \`alt_text\` varchar(500) NULL,
      \`file_link_primary\` varchar(1000) NULL,
      \`file_link_backup\` varchar(1000) NULL,
      \`date_added\` date NULL,
      PRIMARY KEY (\`id\`),
      KEY \`IDX_gc_icons_concept\` (\`concept_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_lists\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`scope\` varchar(50) NOT NULL DEFAULT '',
      \`list_code\` varchar(50) NOT NULL,
      \`value\` varchar(100) NOT NULL,
      \`label\` varchar(255) NOT NULL,
      \`sort\` int NOT NULL DEFAULT 0,
      \`is_active\` tinyint NOT NULL DEFAULT 1,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_lists\` (\`scope\`, \`list_code\`, \`value\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_history\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`concept_id\` bigint NOT NULL,
      \`action\` varchar(30) NOT NULL,
      \`changes\` text NULL,
      \`changed_by_email\` varchar(255) NULL,
      \`changed_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`tx_id\` varchar(36) NULL,
      \`proposal_id\` bigint NULL,
      \`release_id\` bigint NULL,
      PRIMARY KEY (\`id\`),
      KEY \`IDX_gc_history_concept\` (\`concept_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_proposals\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`type\` varchar(20) NOT NULL,
      \`scheme_id\` bigint NOT NULL,
      \`concept_id\` bigint NULL,
      \`target_concept_id\` bigint NULL,
      \`target_scheme_id\` bigint NULL,
      \`base_version\` varchar(20) NULL,
      \`payload\` text NULL,
      \`rationale\` text NULL,
      \`requester_email\` varchar(255) NOT NULL,
      \`origin\` varchar(20) NOT NULL,
      \`origin_platform\` varchar(50) NULL,
      \`external_request_id\` varchar(100) NULL,
      \`access_token_hash\` varchar(128) NULL,
      \`ai_recommendation\` text NULL,
      \`no_objection_until\` datetime NULL,
      \`state\` varchar(30) NOT NULL DEFAULT 'submitted',
      \`decision_note\` text NULL,
      \`decided_by_email\` varchar(255) NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_proposals_external\` (\`origin_platform\`, \`external_request_id\`),
      KEY \`IDX_gc_proposals_scheme_state\` (\`scheme_id\`, \`state\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_proposal_events\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`proposal_id\` bigint NOT NULL,
      \`from_state\` varchar(30) NULL,
      \`to_state\` varchar(30) NOT NULL,
      \`actor_email\` varchar(255) NULL,
      \`note\` text NULL,
      \`at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`IDX_gc_proposal_events_proposal\` (\`proposal_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_email_verifications\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`email\` varchar(255) NOT NULL,
      \`token_hash\` varchar(128) NOT NULL,
      \`proposal_draft\` text NOT NULL,
      \`expires_at\` datetime NOT NULL,
      \`used_at\` datetime NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_email_verifications_token\` (\`token_hash\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_releases\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`scheme_id\` bigint NOT NULL,
      \`version\` varchar(20) NOT NULL,
      \`release_uri\` varchar(500) NOT NULL,
      \`previous_release_id\` bigint NULL,
      \`released_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`notes\` text NULL,
      \`license\` varchar(255) NULL,
      \`released_by_email\` varchar(255) NULL,
      \`snapshot\` longtext NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_releases_scheme_version\` (\`scheme_id\`, \`version\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_outbox\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`kind\` varchar(30) NOT NULL,
      \`payload\` text NOT NULL,
      \`attempts\` int NOT NULL DEFAULT 0,
      \`next_attempt_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`delivered_at\` timestamp NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`IDX_gc_outbox_pending\` (\`delivered_at\`, \`next_attempt_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_embeddings\` (
      \`concept_id\` bigint NOT NULL,
      \`model\` varchar(60) NOT NULL,
      \`text_hash\` char(64) NOT NULL,
      \`vector\` mediumtext NOT NULL,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`concept_id\`, \`model\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    // Custom metadata fields a scheme defines for itself (contract v2 §2).
    // Their values live in gc_concepts.extra, keyed by `code`.
    `CREATE TABLE IF NOT EXISTS \`gc_fields\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`scheme_id\` bigint NOT NULL,
      \`code\` varchar(50) NOT NULL,
      \`label\` varchar(255) NOT NULL,
      \`type\` varchar(20) NOT NULL,
      \`list_code\` varchar(50) NULL,
      \`required\` tinyint NOT NULL DEFAULT 0,
      \`is_public\` tinyint NOT NULL DEFAULT 1,
      \`sort\` int NOT NULL DEFAULT 0,
      \`is_active\` tinyint NOT NULL DEFAULT 1,
      \`help\` text NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_gc_fields_code\` (\`scheme_id\`, \`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    // Aggregated usage per day (contract v2 §3). The composite key is what the
    // atomic `INSERT … ON DUPLICATE KEY UPDATE` counts against.
    `CREATE TABLE IF NOT EXISTS \`gc_usage_daily\` (
      \`day\` date NOT NULL,
      \`scheme_id\` bigint NOT NULL,
      \`kind\` varchar(20) NOT NULL,
      \`item\` varchar(191) NOT NULL,
      \`count\` int NOT NULL DEFAULT 0,
      PRIMARY KEY (\`day\`, \`scheme_id\`, \`kind\`, \`item\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS \`gc_ai_usage\` (
      \`month\` char(7) NOT NULL,
      \`calls\` int NOT NULL DEFAULT 0,
      \`input_tokens\` bigint NOT NULL DEFAULT 0,
      \`output_tokens\` bigint NOT NULL DEFAULT 0,
      \`cost_usd\` decimal(12,6) NOT NULL DEFAULT 0,
      PRIMARY KEY (\`month\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  /** In reverse creation order, for `down`. */
  static readonly TABLE_NAMES = [
    'gc_ai_usage',
    'gc_usage_daily',
    'gc_fields',
    'gc_embeddings',
    'gc_outbox',
    'gc_releases',
    'gc_email_verifications',
    'gc_proposal_events',
    'gc_proposals',
    'gc_history',
    'gc_lists',
    'gc_icons',
    'gc_mappings',
    'gc_collection_members',
    'gc_collections',
    'gc_relations',
    'gc_labels',
    'gc_concepts',
    'gc_schemes',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const ddl of this.tables) {
      await queryRunner.query(ddl);
    }

    await queryRunner.query(
      `INSERT INTO \`gc_schemes\`
         (code, title, description, default_language, license, publisher, governance_description, next_term_id)
       SELECT ?, ?, ?, 'en', ?, ?, ?, 1
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM \`gc_schemes\` WHERE code = ?)`,
      [
        'meliaf',
        'MELIAF taxonomy',
        'CGIAR taxonomy for Monitoring, Evaluation, Learning, Impact Assessment and Foresight.',
        'CC BY 4.0',
        'CGIAR',
        'Proposals are screened by Communities of Practice and domain champions, the Portfolio Performance Team acts as secretariat, and the PRM Steering Group validates by no objection (MELIAF Build Brief, Group 4).',
        'meliaf',
      ],
    );

    for (const [listCode, values] of Object.entries(
      CreateGlobalConcepts1790500000000.LISTS,
    )) {
      for (const [index, label] of values.entries()) {
        await queryRunner.query(
          `INSERT INTO \`gc_lists\` (scope, list_code, value, label, sort, is_active)
           SELECT '', ?, ?, ?, ?, 1
           FROM DUAL
           WHERE NOT EXISTS (
             SELECT 1 FROM \`gc_lists\` WHERE scope = '' AND list_code = ? AND value = ?
           )`,
          [
            listCode,
            CreateGlobalConcepts1790500000000.toValue(label),
            label,
            index,
            listCode,
            CreateGlobalConcepts1790500000000.toValue(label),
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of CreateGlobalConcepts1790500000000.TABLE_NAMES) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  }

  /**
   * Machine value of a list entry: `In review` → `in_review`,
   * `IA (ex ante)` → `ia_ex_ante`. Language codes stay as they are.
   * A static method, not an exported function: TypeORM instantiates every
   * export of a migration file, and a bare function crashes `migration:run`.
   */
  static toValue(label: string): string {
    return label
      .trim()
      .toLowerCase()
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
