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
import { Institution } from '../../institution/entities/institution.entity'; // catálogo CLARISA
import { ProjectCountry } from './project-country.entity';
import { ProjectMapping } from './project-mapping.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index()
  @Column({ type: 'bigint', nullable: true })
  legacy_project_id: number;

  @Column({ type: 'text', nullable: false })
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
  remaining_budget: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  annual_budget: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  funding_source?: string;

  // ===== Relaciones con catálogos CLARISA (por ID + objeto) =====
  @Index()
  @Column({ type: 'bigint', nullable: true })
  lead_institution_id: number;

  @Index()
  @Column({ type: 'bigint', nullable: true })
  funder_institution_id: number;

  @ManyToOne(() => Institution, (i) => i.lead_projects, { nullable: true })
  @JoinColumn({ name: 'lead_institution_id' })
  lead_institution_object: Institution;

  @ManyToOne(() => Institution, (i) => i.funded_projects, { nullable: true })
  @JoinColumn({ name: 'funder_institution_id' })
  funder_institution_object: Institution;

  // ===== Relaciones objeto =====
  @OneToMany(() => ProjectCountry, (pc) => pc.project_object)
  project_countries_array: ProjectCountry[];

  @OneToMany(() => ProjectMapping, (pm) => pm.project_object)
  project_mappings_array: ProjectMapping[];

  // ===== Campos opcionales del W3 =====
  @Column({ type: 'text', nullable: true })
  interim_director_review: string;

  @Column({ type: 'text', nullable: true })
  project_results: string;

  // ===== auditable fields =====
  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
