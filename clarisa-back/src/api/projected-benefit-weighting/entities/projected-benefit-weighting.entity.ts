import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ProjectedBenefitWeightDescription } from '../../projected-benefit-weight-description/entities/projected-benefit-weight-description.entity';
import { ProjectedBenefit } from '../../projected-benefit/entities/projected-benefit.entity';

@Entity('projected_benefit_weightings')
export class ProjectedBenefitWeighting {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  weight_value: string;

  //relations

  @Column({ type: 'bigint', nullable: true })
  projected_benefits_id: number;

  @Column({ type: 'bigint', nullable: true })
  weight_description_id: number;

  //object relations

  @ManyToOne(
    () => ProjectedBenefit,
    (pb) => pb.projected_benefit_weighting_array,
  )
  @JoinColumn({ name: 'projected_benefits_id' })
  projected_benefit_object: ProjectedBenefit;

  @ManyToOne(
    () => ProjectedBenefitWeightDescription,
    (pbwd) => pbwd.projected_benefit_weighting_array,
  )
  @JoinColumn({ name: 'weight_description_id' })
  weight_description_object: ProjectedBenefitWeightDescription;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
