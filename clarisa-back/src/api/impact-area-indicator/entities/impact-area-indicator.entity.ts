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
import { ImpactArea } from '../../impact-area/entities/impact-area.entity';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';

@Entity('impact_area_indicators')
export class ImpactAreaIndicator {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
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

  @Column({ type: 'bigint', nullable: true })
  portfolio_id: number;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  @Column({ type: 'bigint', nullable: true })
  level: number;

  //object relations

  @ManyToOne(() => ImpactArea, (ia) => ia.impact_area_indicators)
  @JoinColumn({ name: 'impact_areas_id' })
  impact_area_object: ImpactArea;

  @ManyToOne(() => ImpactAreaIndicator, (iai) => iai.children)
  @JoinColumn({ name: 'parent_id' })
  parent: ImpactAreaIndicator;

  @OneToMany(() => ImpactAreaIndicator, (iai) => iai.parent)
  children: ImpactAreaIndicator[];

  @ManyToOne(() => Portfolio, (p) => p.impact_area_indicators)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
