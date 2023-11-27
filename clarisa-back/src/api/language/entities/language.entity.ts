import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CountryName } from '../../country/entities/country-name.entity';
import { SubnationalCategory } from '../../subnational-scope/entities/subnational-category.entity';
import { SubnationalScope } from '../../subnational-scope/entities/subnational-scope.entity';
import { CountryLanguage } from '../../country/entities/country-language.entity';
import { Exclude } from 'class-transformer';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Entity('iso_languages')
export class Language {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: false })
  iso_alpha_2: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: false })
  iso_alpha_3: string;

  //object relations

  @OneToMany(() => CountryLanguage, (cl) => cl.language_object)
  country_language_array: CountryLanguage[];

  @OneToMany(() => CountryName, (cn) => cn.language_object)
  country_name_array: CountryName[];

  @OneToMany(() => SubnationalCategory, (sc) => sc.language_object)
  subnational_category_array: SubnationalCategory[];

  @OneToMany(() => SubnationalScope, (ss) => ss.language_object)
  subnational_scope_array: SubnationalScope[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
