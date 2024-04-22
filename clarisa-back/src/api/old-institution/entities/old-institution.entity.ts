import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Entity('old_institutions')
export class OldInstitution {
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

  //object "relations"

  // @OneToMany(() => InstitutionLocation, (il) => il.old_institution_object)
  // institution_locations: InstitutionLocation[];

  // @ManyToOne(() => InstitutionType, (it) => it.institutions)
  // @JoinColumn({ name: 'institution_type_id' })
  // institution_type_object: InstitutionType;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
