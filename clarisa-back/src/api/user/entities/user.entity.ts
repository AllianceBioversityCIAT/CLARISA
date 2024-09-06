import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { CountryOfficeRequest } from '../../country-office-request/entities/country-office-request.entity';
import { Mis } from '../../mis/entities/mis.entity';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { Source } from '../../source/entities/source.entity';
import { UserMis } from './user-mis.entity';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  first_name: string;

  @Column({ type: 'text', nullable: true })
  last_name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: false })
  username: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ type: 'text', nullable: true })
  password?: string;

  @Column({ type: 'tinyint', nullable: false, default: () => '0' })
  is_cgiar_user: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login: Date;

  @Column({ type: 'tinyint', nullable: true })
  agree_terms: boolean;

  //object relations

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles: UserRole[];

  @OneToMany(() => CountryOfficeRequest, (cor) => cor.accepted_by_object)
  country_office_request_accepted_array: CountryOfficeRequest[];

  @OneToMany(() => CountryOfficeRequest, (cor) => cor.rejected_by_object)
  country_office_request_rejection_array: CountryOfficeRequest[];

  @OneToMany(() => Mis, (m) => m.contact_point_object)
  mis_array: Mis[];

  @OneToMany(() => PartnerRequest, (pr) => pr.accepted_by_object)
  partner_request_accepted_array: PartnerRequest[];

  @OneToMany(() => PartnerRequest, (pr) => pr.rejected_by_object)
  partner_request_rejected_array: PartnerRequest[];

  @OneToMany(() => UserMis, (um) => um.user_object)
  user_mis_array: UserMis[];

  @OneToMany(() => Source, (s) => s.contact_point_object)
  source_array: Source[];

  //meant to be used by the guard
  permissions: string[] | undefined;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
