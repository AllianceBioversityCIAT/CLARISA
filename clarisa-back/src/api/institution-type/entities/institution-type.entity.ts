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
import { Institution } from '../../institution/entities/institution.entity';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { Source } from '../../source/entities/source.entity';

@Entity('institution_types')
export class InstitutionType {
  @Expose({ name: 'code' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  //relations

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  @Exclude()
  @Column({ type: 'bigint', nullable: false })
  source_id: number;

  //object relations

  @ManyToOne(() => InstitutionType, (it) => it.children)
  @JoinColumn({ name: 'parent_id' })
  parent_object: InstitutionType;

  @ManyToOne(() => Source, (s) => s.institution_type_array)
  @JoinColumn({ name: 'source_id' })
  source_object: Source;

  @OneToMany(() => InstitutionType, (it) => it.parent_object)
  children: InstitutionType[];

  @OneToMany(() => Institution, (i) => i.institution_type_object)
  institutions: Institution[];

  // @OneToMany(() => OldInstitution, (oi) => oi.institution_type_object)
  // old_institutions: OldInstitution[];

  @OneToMany(() => PartnerRequest, (pr) => pr.institution_type_object)
  partner_requests: PartnerRequest[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
