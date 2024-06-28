import { Exclude, Expose, Transform } from 'class-transformer';
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

  @Expose({ name: 'target' })
  @Column({ type: 'text', nullable: true })
  global_target: string;

  //relations
  @Expose({ name: 'impactAreaId' })
  @Column({ type: 'bigint', nullable: true })
  impact_area_id: number;

  //object_relations
  @Expose({ name: 'impactAreaName' })
  @Transform(({ value }) => {
    return value.name;
  })
  @ManyToOne(() => ImpactArea, { eager: true })
  @JoinColumn({ name: 'impact_area_id' })
  impact_area_name: ImpactArea;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
