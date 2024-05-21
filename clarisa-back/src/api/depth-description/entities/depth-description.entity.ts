import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { ProjectedBenefitDepth } from '../../projected-benefit-depth/entities/projected-benefit-depth.entity';

@Entity('depth_descriptions')
export class DepthDescription {
  @Expose({ name: 'depthScaleId' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Expose({ name: 'depthScaleName' })
  @Column({ type: 'text', nullable: true })
  name: string;

  //object relations

  @OneToMany(() => ProjectedBenefitDepth, (pbd) => pbd.depth_description_object)
  projected_benefit_depth_array: ProjectedBenefitDepth[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
