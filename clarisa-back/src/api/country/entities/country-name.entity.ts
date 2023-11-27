import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Country } from './country.entity';
import { Exclude } from 'class-transformer';
import { Language } from '../../language/entities/language.entity';

@Entity('iso_country_names')
export class CountryName {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  full_name: string;

  @Column({ type: 'text', nullable: true })
  short_name: string;

  //relations

  @Column({ type: 'bigint', nullable: true })
  country_id: number;

  @Column({ type: 'bigint', nullable: true })
  iso_language_id: number;

  //object relations

  @ManyToOne(() => Country, (country) => country.country_name_array)
  @JoinColumn({ name: 'country_id' })
  country_object: Country;

  @ManyToOne(() => Language, (language) => language.country_name_array)
  @JoinColumn({ name: 'iso_language_id' })
  language_object: Language;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
