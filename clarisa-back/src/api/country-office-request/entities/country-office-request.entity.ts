import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Country } from '../../country/entities/country.entity';
import { Institution } from '../../institution/entities/institution.entity';
import { Mis } from '../../mis/entities/mis.entity';
import { User } from '../../user/entities/user.entity';

@Entity('country_office_requests')
export class CountryOfficeRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  request_source: string;

  @Column({ type: 'timestamp', nullable: true })
  accepted_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejected_date: Date;

  @Column({ type: 'text', nullable: true })
  reject_justification: string;

  @Column({ type: 'text', nullable: true })
  external_user_mail: string;

  @Column({ type: 'text', nullable: true })
  external_user_name: string;

  @Column({ type: 'text', nullable: true })
  external_user_comments: string;

  //relations

  @Column({ type: 'bigint', nullable: true })
  accepted_by: number;

  @Column({ type: 'bigint', nullable: true })
  rejected_by: number;

  @Column({ type: 'bigint', nullable: true })
  mis_id: number;

  @Column({ type: 'bigint', nullable: true })
  institution_id: number;

  @Column({ type: 'bigint', nullable: true })
  country_id: number;

  //object relations

  @ManyToOne(() => Country, (c) => c.partner_requests)
  @JoinColumn({ name: 'country_id' })
  country_object: Country;

  @ManyToOne(() => Institution, (i) => i.partner_requests)
  @JoinColumn({ name: 'institution_id' })
  institution_object: Institution;

  @ManyToOne(() => Mis, (m) => m.partner_requests)
  @JoinColumn({ name: 'mis_id' })
  mis_object: Mis;

  @ManyToOne(() => User, (u) => u.country_office_request_accepted_array)
  @JoinColumn({ name: 'accepted_by' })
  accepted_by_object: User;

  @ManyToOne(() => User, (u) => u.country_office_request_rejection_array)
  @JoinColumn({ name: 'rejected_by' })
  rejected_by_object: User;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
