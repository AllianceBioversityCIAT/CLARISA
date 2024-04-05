import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ActionAreaOutcome } from '../../action-area-outcome/entities/action-area-outcome.entity';

@Entity('outcomes')
export class Outcome {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  smo_code: string;

  @Column({ type: 'text', nullable: true })
  outcome_statement: string;

  //object relations

  @OneToMany(() => ActionAreaOutcome, (aaoi) => aaoi.outcome_object)
  action_area_outcomes: ActionAreaOutcome[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
