import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Country } from '../../country/entities/country.entity';
import { SubnationalCategory } from './subnational-category.entity';
import { Language } from '../../language/entities/language.entity';

@Entity('iso_subnational_scope')
export class SubnationalScope {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index({ unique: false })
  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  local_name: string;

  @Column({ type: 'text', nullable: true })
  romanization_system_name: string;

  //relations

  @Column({ type: 'bigint', nullable: false })
  country_id: number;

  @Column({ type: 'bigint', nullable: true })
  iso_language_id: number;

  @Column({ type: 'bigint', nullable: true })
  iso_subnational_category_id: number;

  //object relations

  @ManyToOne(() => Country, (country) => country.subnational_scope_array)
  @JoinColumn({ name: 'country_id' })
  country_object: Country;

  @ManyToOne(() => Language, (language) => language.subnational_scope_array)
  @JoinColumn({ name: 'iso_language_id' })
  language_object: Language;

  @ManyToOne(() => SubnationalCategory, (sc) => sc.subnational_scope_array)
  @JoinColumn({ name: 'iso_subnational_category_id' })
  subnational_category_object: SubnationalCategory;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
