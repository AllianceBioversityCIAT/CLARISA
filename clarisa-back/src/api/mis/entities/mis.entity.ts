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
import { CountryOfficeRequest } from '../../country-office-request/entities/country-office-request.entity';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { UserMis } from '../../user/entities/user-mis.entity';
import { User } from '../../user/entities/user.entity';

@Entity('mises')
export class Mis {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: number;

  @Column({ type: 'text', nullable: false })
  acronym: string;

  // relations
  @Column()
  main_contact_point_id: string;

  //object relations

  @ManyToOne(() => User, (u) => u.mis_array)
  @JoinColumn({ name: 'main_contact_point_id' })
  //@Expose()
  contact_point_object: User;

  @OneToMany(() => PartnerRequest, (pr) => pr.institution_type_object)
  partner_requests: PartnerRequest[];

  @OneToMany(() => CountryOfficeRequest, (cof) => cof.mis_object)
  country_office_requests: CountryOfficeRequest[];

  @OneToMany(() => UserMis, (um) => um.mis_object)
  user_mis_array: UserMis[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
