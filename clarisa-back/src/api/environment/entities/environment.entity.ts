import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Exclude } from 'class-transformer';
import { Mis } from '../../mis/entities/mis.entity';

@Entity('environments')
export class Environment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  acronym: string;

  // object relations
  @OneToMany(() => Mis, (m) => m.environment_object)
  mis_array: Mis[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
