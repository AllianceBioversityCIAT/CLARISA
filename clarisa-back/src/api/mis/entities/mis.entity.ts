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
import { Environment } from '../../environment/entities/environment.entity';
import { AppSecret } from '../../app-secret/entities/app-secret.entity';

@Entity('mises')
export class Mis {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  acronym: string;

  // relations
  @Column()
  main_contact_point_id: number;

  @Column({ type: 'number', nullable: true })
  environment_id: number;

  //object relations

  @ManyToOne(() => Environment, (e) => e.mis_array)
  @JoinColumn({ name: 'environment_id' })
  environment_object: Environment;

  @ManyToOne(() => User, (u) => u.mis_array)
  @JoinColumn({ name: 'main_contact_point_id' })
  contact_point_object: User;

  @OneToMany(() => AppSecret, (asr) => asr.sender_mis_object)
  mis_receiver_array: AppSecret[];

  @OneToMany(() => AppSecret, (ass) => ass.receiver_mis_object)
  mis_sender_array: AppSecret[];

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
