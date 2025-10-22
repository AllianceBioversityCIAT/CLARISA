import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Index,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Country } from '../../country/entities/country.entity';
import { Project } from './project.entity';

@Entity('project_countries')
@Unique('uq_project_country', ['project_id', 'country_code'])
export class ProjectCountry {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index()
  @Column({ type: 'bigint', nullable: false })
  project_id: number;

  @Index()
  @Column({ type: 'bigint', nullable: false })
  country_code: number;

  // object relations
  @ManyToOne(() => Project, (p) => p.project_countries_array, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project_object: Project;

  @ManyToOne(() => Country, (c) => c.project_countries_array, {
    nullable: true,
  })
  @JoinColumn({
    name: 'country_code',
    referencedColumnName: 'iso_numeric',
  })
  country_object: Country;

  // auditable fields
  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
