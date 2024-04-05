import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Exclude } from 'class-transformer';
import { ActionAreaOutcome } from '../../action-area-outcome/entities/action-area-outcome.entity';
import { InitiativeStage } from '../../initiative/entities/initiative-stage.entity';

@Entity('action_areas')
export class ActionArea {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  smo_code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  color: string;

  //relation objects

  @OneToMany(() => ActionAreaOutcome, (aao) => aao.action_area_object)
  action_area_outcomes: ActionAreaOutcome[];

  @OneToMany(() => InitiativeStage, (is) => is.action_area_object)
  initiative_stage_array: InitiativeStage[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
