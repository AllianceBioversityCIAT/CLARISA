import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { CgiarEntityType } from '../../cgiar-entity-type/entities/cgiar-entity-type.entity';

@Entity('funding_sources')
export class FundingSource {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  type_term: string;

  @Column({ type: 'text', nullable: true })
  funding_to: string;

  //object relations
  @OneToMany(() => CgiarEntityType, (cet) => cet.funding_source_object)
  cgiar_entity_type_array: CgiarEntityType[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
