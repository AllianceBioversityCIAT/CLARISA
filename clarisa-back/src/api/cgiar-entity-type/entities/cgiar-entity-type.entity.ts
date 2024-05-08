import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { CgiarEntity } from '../../cgiar-entity/entities/cgiar-entity.entity';
import { FundingSource } from '../../funding-source/entities/funding-source.entity';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';

@Entity('global_unit_types')
export class CgiarEntityType {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  @Expose({ name: 'code' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  definition: string;

  @Column({ type: 'text', nullable: true })
  prefix: string;

  @Column({ type: 'bigint', nullable: false, default: 1 })
  level: number;

  //relations
  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  @Column({ type: 'bigint', nullable: true })
  funding_source_id: number;

  @Column({ type: 'bigint', nullable: true })
  portfolio_id: number;

  //object relations
  @OneToMany(() => CgiarEntity, (ce) => ce.cgiar_entity_type_object)
  cgiar_entity_array: CgiarEntity[];

  @ManyToOne(() => CgiarEntityType, (parent) => parent.children)
  @JoinColumn({ name: 'parent_id' })
  parent_object: CgiarEntityType;

  @OneToMany(() => CgiarEntityType, (child) => child.parent_object)
  children: CgiarEntityType[];

  @ManyToOne(() => FundingSource, (fs) => fs.cgiar_entity_type_array)
  @JoinColumn({ name: 'funding_source_id' })
  funding_source_object: FundingSource;

  @ManyToOne(() => Portfolio, (p) => p.cgiar_entity_type_array)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio_object: Portfolio;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
