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

@Entity('project')
export class Project {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

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
  remaining: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  annual: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_of_funding?: string;

  // ===== Relaciones con catálogos CLARISA (por ID + objeto) =====
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
