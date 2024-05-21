import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { SdgTarget } from '../../sdg-target/entities/sdg-target.entity';

@Entity('sustainable_development_goal_indicators')
export class SdgIndicator {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  unsd_indicator_code: string;

  @Column({ type: 'text', nullable: false })
  sdg_indicator_code: string;

  @Column({ type: 'text', nullable: false })
  sdg_indicator: string;

  //relations

  @Exclude()
  @Column({ type: 'bigint', nullable: true })
  sdg_target_id: number;

  //object relations

  @ManyToOne(() => SdgTarget, (sdgt) => sdgt.sdg_indicator_array)
  @JoinColumn({ name: 'sdg_target_id' })
  sdg_target_object: SdgTarget;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
