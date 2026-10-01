import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { jsonColumn } from '../utils/json-column';

/** Editorial status. Only `approved` and `deprecated` are public. */
export enum GcConceptStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  DEPRECATED = 'deprecated',
}

export const GC_PUBLIC_STATUSES: GcConceptStatus[] = [
  GcConceptStatus.APPROVED,
  GcConceptStatus.DEPRECATED,
];

/** Primary source of a concept (brief §2.1: every term keeps its origin). */
export enum GcConceptOrigin {
  LEXICON = 'lexicon',
  AI_GENERATED = 'ai_generated',
  DOMAIN_EXPERT = 'domain_expert',
  EXTERNAL_STANDARD = 'external_standard',
}

/**
 * One concept of a scheme — the term register of the concepts data schema
 * template, field names included. The URI is derived from the scheme and
 * `term_id` at read time and never stored (V32).
 */
@Entity('gc_concepts')
export class GcConcept {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  scheme_id: number;

  /** Stable public code, unique per scheme (V2). */
  @Column({ type: 'bigint' })
  term_id: number;

  /** Preferred label in the scheme's default language; other languages live in gc_labels (V4). */
  @Column({ type: 'varchar', length: 500 })
  preferred_label: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'text', nullable: true })
  definition: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  short_definition: string | null;

  @Column({ type: 'text', nullable: true })
  scope_note: string | null;

  @Column({ type: 'text', nullable: true })
  example_of_use: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  term_type: string | null;

  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<string[]>([]),
  })
  functions: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  phase_primary: string | null;

  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<string[]>([]),
  })
  phase_also: string[];

  @Column({ type: 'text', nullable: true })
  source_citation: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  source_url: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  derivation: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  origin: GcConceptOrigin | null;

  /** Fields a model drafted (V37); never rewrites `origin`. */
  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<string[]>([]),
  })
  ai_generated_fields: string[];

  @Column({ type: 'varchar', length: 20, default: GcConceptStatus.DRAFT })
  status: GcConceptStatus;

  /** Record revision (V22), not the scheme release. */
  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @Column({ type: 'date', nullable: true })
  date_created: string | null;

  @Column({ type: 'date', nullable: true })
  date_modified: string | null;

  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<string[]>([]),
  })
  validated_by: string[];

  @Column({ type: 'date', nullable: true })
  date_validated: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  steward: string | null;

  /** Internal id of the replacing concept (V2); rendered as `replaced_by` at the boundary. */
  @Column({ type: 'bigint', nullable: true })
  replaced_by_id: number | null;

  @Column({ type: 'text', nullable: true })
  rights_note: string | null;

  /** Internal editorial notes: never published nor exported. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Fields defined after the schema was agreed (D15). */
  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<Record<string, unknown>>({}),
  })
  extra: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by_email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by_email: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
