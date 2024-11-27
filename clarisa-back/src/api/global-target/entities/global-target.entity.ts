import { Exclude, Expose } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ImpactArea } from '../../impact-area/entities/impact-area.entity';

@Entity('global_targets')
export class GlobalTarget {
  @Expose({ name: 'targetId' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  smo_code: string;

  @Column({ type: 'text', nullable: true })
  global_target: string;

  //relations
  @Column({ type: 'bigint', nullable: true })
  impact_area_id: number;

  //object_relations
  @ManyToOne(() => ImpactArea, (ia) => ia.global_target_array)
  @JoinColumn({ name: 'impact_area_id' })
  impact_area_object: ImpactArea;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
