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
import { CgiarEntityType } from '../../cgiar-entity-type/entities/cgiar-entity-type.entity';
import { Institution } from '../../institution/entities/institution.entity';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';

@Entity('global_units')
export class CgiarEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  short_name: string;

  @Column({ type: 'text', nullable: true })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  smo_code: string;

  @Column({ type: 'text', nullable: true })
  financial_code: string;

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  @Column({ type: 'bigint', nullable: false, default: 1 })
  level: number;

  //relations

  @Column({ type: 'bigint', nullable: true })
  institution_id: number;

  @Column({ type: 'bigint', nullable: false })
  global_unit_type_id: number;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  @Column({ type: 'bigint', nullable: true })
  portfolio_id: number;

  //object relations

  @ManyToOne(() => CgiarEntityType, (cet) => cet.cgiar_entity_array)
  @JoinColumn({ name: 'global_unit_type_id' })
  cgiar_entity_type_object: CgiarEntityType;

  @ManyToOne(() => Institution, (i) => i.cgiar_entity_array)
  @JoinColumn({ name: 'institution_id' })
  institution_object: Institution;

  @ManyToOne(() => CgiarEntity, (parent) => parent.children)
  @JoinColumn({ name: 'parent_id' })
  parent_object: CgiarEntity;

  @OneToMany(() => CgiarEntity, (child) => child.parent_object)
  children: CgiarEntity[];

  @ManyToOne(() => Portfolio, (p) => p.cgiar_entity_array)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio_object: Portfolio;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
