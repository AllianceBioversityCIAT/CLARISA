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
import { Country } from '../../country/entities/country.entity';
import { InstitutionType } from '../../institution-type/entities/institution-type.entity';
import { Institution } from '../../institution/entities/institution.entity';
import { Mis } from '../../mis/entities/mis.entity';
import { User } from '../../user/entities/user.entity';

@Entity('partner_requests')
export class PartnerRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  partner_name: string;

  @Column({ type: 'text', nullable: true })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  web_page: string;

  @Column({ type: 'tinyint', width: 1, nullable: false, default: () => '0' })
  is_office: boolean;

  @Column({ type: 'text', nullable: true })
  request_source: string;

  @Column({ type: 'tinyint', width: 1, nullable: true })
  is_modified: boolean;

  @Column({ type: 'tinyint', width: 1, nullable: true })
  accepted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  accepted_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejected_date: Date;

  @Column({ type: 'text', nullable: true })
  reject_justification: string;

  @Column({ type: 'text', nullable: true })
  external_user_mail?: string;

  @Column({ type: 'text', nullable: true })
  external_user_name: string;

  @Column({ type: 'text', nullable: true })
  external_user_comments: string;

  @Column({ type: 'text', nullable: true })
  category_1: string;

  @Column({ type: 'text', nullable: true })
  category_2: string;

  //relations

  @Column({ type: 'bigint', nullable: true })
  institution_type_id: number;

  @Column({ type: 'bigint', nullable: true })
  country_id: number;

  @Column({ type: 'bigint', nullable: true })
  institution_id: number;

  @Column({ type: 'bigint', nullable: false })
  mis_id: number;

  @Column({ type: 'bigint', nullable: true })
  accepted_by: number;

  @Column({ type: 'bigint', nullable: true })
  rejected_by: number;

  @Column({ type: 'bigint', nullable: true })
  partner_request_id: number;

  //object relations

  @ManyToOne(() => InstitutionType, (it) => it.partner_requests)
  @JoinColumn({ name: 'institution_type_id' })
  institution_type_object: InstitutionType;

  @ManyToOne(() => Country, (c) => c.partner_requests)
  @JoinColumn({ name: 'country_id' })
  country_object: Country;

  @ManyToOne(() => Institution, (i) => i.partner_requests)
  @JoinColumn({ name: 'institution_id' })
  institution_object: Institution;

  @ManyToOne(() => Mis, (m) => m.partner_requests)
  @JoinColumn({ name: 'mis_id' })
  mis_object: Mis;

  @ManyToOne(() => User, (u) => u.partner_request_accepted_array)
  @JoinColumn({ name: 'accepted_by' })
  accepted_by_object: User;

  @ManyToOne(() => User, (u) => u.partner_request_rejected_array)
  @JoinColumn({ name: 'rejected_by' })
  rejected_by_object: User;

  @ManyToOne(() => PartnerRequest, (pr) => pr.children)
  @JoinColumn({ name: 'partner_request_id' })
  parent_object: PartnerRequest;

  //in theory it should be ONLY one, but you'll never know...
  @OneToMany(() => PartnerRequest, (pr) => pr.parent_object)
  children: PartnerRequest[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
