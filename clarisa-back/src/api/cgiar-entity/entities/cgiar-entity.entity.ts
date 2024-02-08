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
import { Framework } from '../../framework/entities/framework.entity';

@Entity('global_units')
export class CgiarEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  smo_code: string;

  //relations

  @Column({ type: 'text', nullable: true })
  financial_code: string;

  @Column({ type: 'bigint', nullable: true })
  institution_id: number;

  @Column({ type: 'bigint', nullable: false })
  global_unit_type_id: number;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  @Column({ type: 'bigint', nullable: false })
  framework_id: number;

  //object relations

  @ManyToOne(() => CgiarEntityType, (cet) => cet.cgiar_entity_array)
  @JoinColumn({ name: 'global_unit_type_id' })
  cgiar_entity_type_object: CgiarEntityType;

  @ManyToOne(() => Framework, (f) => f.cgiar_entity_array)
  @JoinColumn({ name: 'framework_id' })
  framework_object: Framework;

  @ManyToOne(() => Institution, (i) => i.cgiar_entity_array)
  @JoinColumn({ name: 'institution_id' })
  institution_object: Institution;

  @ManyToOne(() => CgiarEntity, (ce) => ce.children_array)
  @JoinColumn({ name: 'parent_id' })
  parent_object: CgiarEntity;

  @OneToMany(() => CgiarEntity, (ce) => ce.parent_object)
  children_array: CgiarEntity[];

  //auditable fields

  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
