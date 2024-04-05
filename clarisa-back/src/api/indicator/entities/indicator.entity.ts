import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ActionAreaOutcomeIndicator } from '../../action-area-outcome-indicator/entities/action-area-outcome-indicator.entity';

@Entity('indicators')
export class Indicator {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  smo_code: string;

  @Column({ type: 'text', nullable: true })
  outcome_indicator_statement: string;

  //object relations

  @OneToMany(() => ActionAreaOutcomeIndicator, (aaoi) => aaoi.indicator_object)
  action_area_outcome_indicators: ActionAreaOutcomeIndicator[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
