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

@Entity('iso_country_languages')
export class CountryLanguage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'tinyint', width: 1, nullable: false, default: () => '1' })
  is_administrative: boolean;

  @Column({ type: 'bigint', nullable: true })
  sorting_order: number;

  //relations

  @Column({ type: 'bigint', nullable: false })
  country_id: number;

  @Column({ type: 'bigint', nullable: false })
  iso_language_id: number;

  //object relations

  @ManyToOne(() => Country, (country) => country.country_language_array)
  @JoinColumn({ name: 'country_id' })
  country_object: Country;

  @ManyToOne(() => Language, (language) => language.country_language_array)
  @JoinColumn({ name: 'iso_language_id' })
  language_object: Language;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
