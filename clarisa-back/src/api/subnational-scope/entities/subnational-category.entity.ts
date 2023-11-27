import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Country } from '../../country/entities/country.entity';
import { Exclude } from 'class-transformer';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { SubnationalScope } from './subnational-scope.entity';
import { Language } from '../../language/entities/language.entity';

@Entity('iso_subnational_categories')
export class SubnationalCategory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index({ unique: false })
  @Column({ type: 'bigint', nullable: false })
  iso_category_id: number;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  plural_name: string;

  //relations

  @Column({ type: 'bigint', nullable: true })
  country_id: number;

  @Column({ type: 'bigint', nullable: true })
  iso_language_id: number;

  //object relations

  @ManyToOne(() => Country, (country) => country.subnational_category_array)
  @JoinColumn({ name: 'country_id' })
  country_object: Country;

  @ManyToOne(() => Language, (language) => language.subnational_category_array)
  @JoinColumn({ name: 'iso_language_id' })
  language_object: Language;

  @OneToMany(() => SubnationalScope, (ss) => ss.subnational_category_object)
  subnational_scope_array: SubnationalScope[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
