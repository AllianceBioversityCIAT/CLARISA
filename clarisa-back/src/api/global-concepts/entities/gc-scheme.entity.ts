import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A vocabulary: the global MELIAF taxonomy, a domain taxonomy (climate change
 * adaptation) or the concept group a platform owns (`owner_platform`).
 * `code` is part of every concept URI, so it never changes once created.
 */
@Entity('gc_schemes')
export class GcScheme {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Overrides the module-wide URI base for this scheme, when set. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  uri_base: string | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  default_language: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  license: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher: string | null;

  /** Published with the scheme metadata and every export (brief §2.2). */
  @Column({ type: 'text', nullable: true })
  governance_description: string | null;

  /** Platform code (MIS acronym, lower-case) owning this scheme; null = MELIAF admins. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  owner_platform: string | null;

  /** Next `term_id` to assign; read and bumped under a row lock. */
  @Column({ type: 'bigint', default: 1 })
  next_term_id: number;

  @Column({ type: 'tinyint', default: 0 })
  validator_required: boolean;

  @Column({ type: 'int', nullable: true })
  no_objection_days: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
