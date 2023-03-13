import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ImpactArea } from '../../impact-area/entities/impact-area.entity';

@Entity('impact_area_indicators')
export class ImpactAreaIndicator {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  indicator_statement: string;

  @Column({ type: 'int', nullable: true })
  target_year: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  target_unit: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  target_value: string;

  @Column({ type: 'tinyint', nullable: false, default: () => '0' })
  is_aplicable_projected_benefits: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  smo_code: string;

  //relations

  @Column({ type: 'bigint', nullable: true })
  impact_areas_id: number;

  //object relations

  @ManyToOne(() => ImpactArea, (ia) => ia.impact_area_indicators)
  @JoinColumn({ name: 'impact_areas_id' })
  impact_area_object: ImpactArea;

  //auditable fields

  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
