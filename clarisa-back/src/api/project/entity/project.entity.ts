import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Institution } from '../../institution/entities/institution.entity';
import { ProjectCountry } from './project-country.entity';
import { ProjectMapping } from './project-mapping.entity';

@Index(
  'uq_project_external_identity',
  ['external_source', 'external_project_id'],
  {
    unique: true,
  },
)
@Entity('project')
export class Project {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  /** CLARISA display alias; for W3 rows this is populated from external_code. */
  short_name: string;

  @Column({ type: 'text', nullable: false })
  full_name: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  start_date: string;

  @Column({ type: 'date', nullable: true })
  end_date: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_budget: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  remaining: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  annual: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_of_funding?: string;

  @Column({ type: 'int', nullable: false, default: 2025 })
  phase: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  external_source: string;

  @Index('idx_project_external_project_id')
  @Column({ type: 'varchar', length: 128, nullable: true })
  external_project_id: string;

  @Column({ type: 'bigint', nullable: true })
  external_record_id: number;

  /** Original W3 Registry project code. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  external_code: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source_status: string;

  @Column({ type: 'int', nullable: true })
  source_snapshot_id: number;

  @Column({ type: 'datetime', nullable: true })
  source_created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  source_updated_at: Date;

  @Column({ type: 'datetime', nullable: true })
  last_synced_at: Date;

  @Column({ type: 'text', nullable: true })
  source_center_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_center_acronym: string;

  @Column({ type: 'text', nullable: true })
  source_funder: string;

  // ===== Relations with CLARISA catalogs (by ID + object) =====
  @Index()
  @Column({ type: 'bigint', nullable: true })
  organization_code: number;

  @Index()
  @Column({ type: 'bigint', nullable: true })
  funder_code: number;

  @ManyToOne(() => Institution, (i) => i.lead_projects, { nullable: true })
  @JoinColumn({ name: 'organization_code' })
  lead_institution_object: Institution;

  @ManyToOne(() => Institution, (i) => i.funded_projects, { nullable: true })
  @JoinColumn({ name: 'funder_code' })
  funder_institution_object: Institution;

  // ===== Object relations =====
  @OneToMany(() => ProjectCountry, (pc) => pc.project_object)
  project_countries_array: ProjectCountry[];

  @OneToMany(() => ProjectMapping, (pm) => pm.project_object)
  project_mappings_array: ProjectMapping[];

  // ===== Optional W3 fields =====
  @Column({ type: 'text', nullable: true })
  interim_director_review: string;

  @Column({ type: 'text', nullable: true })
  project_results: string;

  // ===== auditable fields =====
  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
