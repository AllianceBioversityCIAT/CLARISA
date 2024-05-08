import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Institution } from '../../institution/entities/institution.entity';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { CgiarEntityType } from '../../cgiar-entity-type/entities/cgiar-entity-type.entity';

@Entity('centers')
export class Center {
  @Exclude()
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

  //object relations

  @ManyToOne(() => Institution, (i) => i.center_array)
  @JoinColumn({ name: 'institution_id' })
  institution_object: Institution;

  //pseudo relations
  cgiar_entity_type_object: CgiarEntityType;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
