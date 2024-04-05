import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ActionAreaOutcome } from '../../action-area-outcome/entities/action-area-outcome.entity';
import { Indicator } from '../../indicator/entities/indicator.entity';

@Entity('action_area_outcome_indicators')
export class ActionAreaOutcomeIndicator {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  //relations

  @Column({ type: 'bigint', nullable: true })
  action_area_outcome_id: number;

  @Column({ type: 'bigint', nullable: true })
  indicator_id: number;

  //object relations

  @ManyToOne(
    () => ActionAreaOutcome,
    (aao) => aao.action_area_outcome_indicators,
  )
  @JoinColumn({ name: 'action_area_outcome_id' })
  action_area_outcome_object: ActionAreaOutcome;

  @ManyToOne(() => Indicator, (i) => i.action_area_outcome_indicators)
  @JoinColumn({ name: 'indicator_id' })
  indicator_object: Indicator;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
