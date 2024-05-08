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
import { CgiarEntity } from '../../cgiar-entity/entities/cgiar-entity.entity';
import { CountryOfficeRequest } from '../../country-office-request/entities/country-office-request.entity';
import { InstitutionDictionary } from '../../institution-dictionary/entities/institution-dictionary.entity';
import { InstitutionType } from '../../institution-type/entities/institution-type.entity';
import { PartnerRequest } from '../../partner-request/entities/partner-request.entity';
import { InstitutionLocation } from './institution-location.entity';
import { Center } from '../../center/entities/center.entity';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  website_link: string;

  //relations

  @Column({ type: 'bigint', nullable: false })
  institution_type_id: number;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  // object relations

  @ManyToOne(() => InstitutionType, (it) => it.institutions)
  @JoinColumn({ name: 'institution_type_id' })
  institution_type_object: InstitutionType;

  @ManyToOne(() => Institution, (i) => i.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Institution;

  @OneToMany(() => Institution, (i) => i.parent)
  children: Institution[];

  @OneToMany(() => InstitutionLocation, (il) => il.institution_object)
  institution_locations: InstitutionLocation[];

  @OneToMany(() => InstitutionDictionary, (id) => id.institution_object)
  institution_dictionary_entries: InstitutionDictionary[];

  @OneToMany(() => PartnerRequest, (pr) => pr.institution_type_object)
  partner_requests: PartnerRequest[];

  @OneToMany(() => CountryOfficeRequest, (cof) => cof.institution_object)
  country_office_requests: CountryOfficeRequest[];

  @OneToMany(() => CgiarEntity, (ce) => ce.institution_object)
  cgiar_entity_array: CgiarEntity[];

  @OneToMany(() => Center, (c) => c.institution_object)
  center_array: Center[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
