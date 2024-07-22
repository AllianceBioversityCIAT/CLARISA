import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ProjectedBenefitWeighting } from '../../projected-benefit-weighting/entities/projected-benefit-weighting.entity';

@Entity('projected_benefit_weight_descriptions')
export class ProjectedBenefitWeightDescription {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  //object relations

  @OneToMany(
    () => ProjectedBenefitWeighting,
    (pbw) => pbw.weight_description_object,
  )
  projected_benefit_weighting_array: ProjectedBenefitWeighting[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
