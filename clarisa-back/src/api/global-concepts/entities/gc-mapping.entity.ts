import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** SKOS mapping properties; `close` is the default because `exact` is transitive. */
export enum GcMatchType {
  EXACT = 'exact',
  CLOSE = 'close',
  BROAD = 'broad',
  NARROW = 'narrow',
  RELATED = 'related',
}

export enum GcMappingJustification {
  MANUAL = 'manual',
  LEXICAL = 'lexical',
  AI_SUGGESTED = 'ai_suggested',
}

export enum GcMappingStatus {
  SUGGESTED = 'suggested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * A link from a concept to an external vocabulary (AGROVOC, IPCC, OECD-DAC,
 * PRMS…) or to a concept of another CLARISA scheme, with SSSOM-style
 * provenance. Only `approved` mappings are published.
 */
@Entity('gc_mappings')
export class GcMapping {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  concept_id: number;

  @Column({ type: 'varchar', length: 50 })
  target_scheme: string;

  @Column({ type: 'varchar', length: 1000 })
  target_uri: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  target_label: string | null;

  @Column({ type: 'varchar', length: 20, default: GcMatchType.CLOSE })
  match_type: GcMatchType;

  @Column({
    type: 'varchar',
    length: 30,
    default: GcMappingJustification.MANUAL,
  })
  justification: GcMappingJustification;

  @Column({ type: 'decimal', precision: 4, scale: 3, nullable: true })
  confidence: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  author_email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewed_by_email: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  mapped_at: Date;

  @Column({ type: 'varchar', length: 20, default: GcMappingStatus.APPROVED })
  status: GcMappingStatus;
}
