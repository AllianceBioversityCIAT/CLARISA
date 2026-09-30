import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { RolePermission } from '../../role/entities/role-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  // Plain wording for the roles screen. `select: false` keeps every existing
  // reader of this entity (`GET api/permissions/...`) byte-identical; the
  // access-admin module selects them explicitly.
  @Exclude()
  @Column({ type: 'varchar', length: 50, nullable: true, select: false })
  module: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  label: string;

  @Exclude()
  @Column({ type: 'text', nullable: true, select: false })
  description: string;

  //object relations
  @OneToMany(() => RolePermission, (rp) => rp.permission_object)
  role_permission_array: RolePermission[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
