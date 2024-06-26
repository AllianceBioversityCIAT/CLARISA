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
import { ImpactAreaIndicator } from '../../impact-area-indicator/entities/impact-area-indicator.entity';
import { ProjectedBenefitDepth } from '../../projected-benefit-depth/entities/projected-benefit-depth.entity';
import { ProjectedBenefitWeighting } from '../../projected-benefit-weighting/entities/projected-benefit-weighting.entity';

@Entity('projected_benefits')
export class ProjectedBenefit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  //relations

  @Column({ type: 'bigint', nullable: false })
  impact_area_indicator_id: number;

  //object relations
  @ManyToOne(() => ImpactAreaIndicator)
  @JoinColumn({ name: 'impact_area_indicator_id' })
  impact_area_indicator_object: ImpactAreaIndicator;

  @OneToMany(
    () => ProjectedBenefitWeighting,
    (pbw) => pbw.projected_benefit_object,
  )
  projected_benefit_weighting_array: ProjectedBenefitWeighting[];

  @OneToMany(() => ProjectedBenefitDepth, (pbd) => pbd.projected_benefit_object)
  projected_benefit_depth_array: ProjectedBenefitDepth[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
