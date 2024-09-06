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
import { Workpackage } from '../../workpackage/entities/workpackage.entity';
import { Initiative } from './initiative.entity';
import { Stage } from './status.entity';

@Entity('submission_tool_initiative_stages')
export class InitiativeStage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'text', nullable: true })
  status!: string;

  @Column({ type: 'tinyint', nullable: false, default: () => '0' })
  is_global_dimension!: boolean;

  //relations

  @Column({ type: 'bigint', nullable: false })
  initiative_id!: number;

  @Column({ type: 'bigint', nullable: false })
  stage_id!: number;

  @Column({ type: 'bigint', nullable: true })
  action_area_id?: number;

  //object relations

  @ManyToOne(() => Initiative, (i) => i.initiative_stage_array)
  @JoinColumn({ name: 'initiative_id' })
  initiative_object!: Initiative;

  @ManyToOne(() => Stage, (s) => s.initiative_stage_array)
  @JoinColumn({ name: 'stage_id' })
  stage_object!: Stage;

  @ManyToOne(() => ActionArea, (aa) => aa.initiative_stage_array)
  @JoinColumn({ name: 'action_area_id' })
  action_area_object!: ActionArea;

  @OneToMany(() => Workpackage, (w) => w.initiative_stage_object)
  work_package_array!: Workpackage[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields!: AuditableEntity;
}
