import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ImpactAreaIndicator } from '../../impact-area-indicator/entities/impact-area-indicator.entity';
import { GlobalTarget } from '../../global-target/entities/global-target.entity';

@Entity('impact_areas')
export class ImpactArea {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  financial_code: string;

  @Column({ type: 'text', nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  color: string;

  //object relations

  @OneToMany(() => ImpactAreaIndicator, (iai) => iai.impact_area_object)
  impact_area_indicators: ImpactAreaIndicator[];

  @OneToMany(() => GlobalTarget, (gt) => gt.impact_area_object)
  global_target_array: GlobalTarget[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
