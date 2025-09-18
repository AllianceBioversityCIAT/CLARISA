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
import { Project } from './project.entity';
import { CgiarEntity } from '../../cgiar-entity/entities/cgiar-entity.entity';

export type Level = 'low' | 'medium' | 'high';
export type MappingStatus = 'Confirmed' | 'Proposed' | 'Rejected' | 'Pending';

@Entity('project_mapping')
@Unique('uq_project_globalunit', ['project_id', 'global_unit_id'])
export class ProjectMapping {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index()
  @Column({ type: 'bigint', nullable: false })
  project_id: number;

  /** CLARISA: global_units.id */
  @Index()
  @Column({ type: 'bigint', nullable: false })
  global_unit_id: number;

  @Column({ type: 'int', nullable: false })
  allocation: number; // 0..100 (valida en servicio o agrega CHECK en migration)

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' })
  complementarity: Level;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' })
  efficiencies: Level;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({
    type: 'enum',
    enum: ['Confirmed', 'Proposed', 'Rejected', 'Pending'],
    default: 'Confirmed',
  })
  status: MappingStatus;

  // object relations
  @ManyToOne(() => Project, (p) => p.project_mappings_array, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project_object: Project;

  @ManyToOne(() => CgiarEntity, (gu) => gu.project_mappings_array, {
    nullable: true,
  })
  @JoinColumn({ name: 'global_unit_id' })
  global_unit_object: CgiarEntity;

  // auditable fields
  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
