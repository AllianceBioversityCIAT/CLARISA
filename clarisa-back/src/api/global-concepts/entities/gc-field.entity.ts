import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** What a custom field holds; fixed once the field exists (stored values depend on it). */
export enum GcFieldType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  MULTI_TEXT = 'multi_text',
  LIST = 'list',
  MULTI_LIST = 'multi_list',
  TERM_LINK = 'term_link',
  URL = 'url',
  DATE = 'date',
  NUMBER = 'number',
}

/**
 * A metadata field a scheme defines for itself (checklist row 2: "add or
 * change fields later without rebuilding"). Values live in
 * `gc_concepts.extra`, keyed by `code`, so adding a field is a row here and
 * never a migration. `code` and `type` are immutable: renaming the key or
 * changing its type would orphan or misread every value already stored.
 */
@Entity('gc_fields')
export class GcField {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  scheme_id: number;

  /** Slug, unique per scheme; the key inside `extra` and the `x:<code>` column. */
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 20 })
  type: GcFieldType;

  /** Controlled list of a `list` / `multi_list` field; null for every other type. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  list_code: string | null;

  @Column({ type: 'tinyint', default: 0 })
  required: boolean;

  /** Published in the public shape and the exports; otherwise admin-only. */
  @Column({ type: 'tinyint', default: 1 })
  is_public: boolean;

  @Column({ type: 'int', default: 0 })
  sort: number;

  /** Inactive fields keep their stored values but accept no new ones. */
  @Column({ type: 'tinyint', default: 1 })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  help: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
