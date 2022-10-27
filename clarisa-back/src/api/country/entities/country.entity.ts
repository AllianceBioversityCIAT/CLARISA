import { Geoposition } from 'src/api/geoposition/entities/geoposition.entity';
import { InstitutionLocation } from 'src/api/institution/entities/institution-location.entity';
import { PartnerRequest } from 'src/api/partner-request/entities/partner-request.entity';
import { Region } from 'src/api/region/entities/region.entity';
import { AuditableEntity } from 'src/shared/entities/extends/auditable-entity.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('countries')
export class Country extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  iso_alpha_2: string;

  @Column()
  iso_alpha_3: string;

  @Column()
  iso_numeric: number;

  @Column()
  geoposition_id: number;

  @ManyToOne(() => Geoposition)
  @JoinColumn({ name: 'geoposition_id' })
  geoposition_object: Geoposition;

  @ManyToMany(() => Region, (region) => region.countries)
  @JoinTable({
    name: 'country_regions',
    joinColumn: {
      name: 'country_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'region_id',
      referencedColumnName: 'id',
    },
  })
  regions: Region[];

  @OneToMany(() => InstitutionLocation, (il) => il.country_object)
  institution_locations: InstitutionLocation[];

  @OneToMany(() => PartnerRequest, (pr) => pr.institution_type_object)
  partner_requests: PartnerRequest[];
}
