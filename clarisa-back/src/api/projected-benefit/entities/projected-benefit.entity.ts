import { ImpactAreaIndicator } from 'src/api/impact-area-indicators/entities/impact-area-indicator.entity';
 import { AuditableEntity } from 'src/shared/entities/extends/auditable-entity.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projected_enefits')
export class ProjectedBenefit extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  impact_area_indicator_id: number;

  @ManyToOne(() => ImpactAreaIndicator)
  @JoinColumn({ name: 'impact_area_indicator_id' })
  impact_area_indicator_object: ImpactAreaIndicator;

  @Column()
  description: string;
}