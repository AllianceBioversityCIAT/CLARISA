import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ActionArea } from '../../action-area/entities/action-area.entity';
import { Outcome } from '../../outcome/entities/outcome.entity';
import { ActionAreaOutcomeIndicator } from '../../action-area-outcome-indicator/entities/action-area-outcome-indicator.entity';
@Entity('action_area_outcomes')
export class ActionAreaOutcome {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  //relations

  @Column({ type: 'bigint', nullable: true })
  outcome_id: number;

  @Column({ type: 'bigint', nullable: true })
  action_area_id: number;

  //object relations

  @ManyToOne(() => Outcome, (o) => o.action_area_outcomes)
  @JoinColumn({ name: 'outcome_id' })
  outcome_object: Outcome;

  @ManyToOne(() => ActionArea, (aa) => aa.action_area_outcomes)
  @JoinColumn({ name: 'action_area_id' })
  action_area_object: ActionArea;

  @OneToMany(
    () => ActionAreaOutcomeIndicator,
    (aaoi) => aaoi.action_area_outcome_object,
  )
  action_area_outcome_indicators: ActionAreaOutcomeIndicator[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
