import { Exclude } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { UserRole } from '../../user/entities/user-role.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  acronym: string;

  @Exclude()
  @Column({ type: 'int', nullable: false })
  order: number;

  // Roles the screen may not edit or delete (SA, MS, CRON_EXEC, RQAT, OU).
  // `select: false` + `@Exclude()` keep `GET api/roles` byte-identical; the
  // access-admin module selects them explicitly.
  @Exclude()
  @Column({ type: 'tinyint', nullable: false, default: 0, select: false })
  is_system: boolean;

  /** `super` (SA) | `user_admin` (UM) | `module` (the rest). */
  @Exclude()
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: 'module',
    select: false,
  })
  level: string;

  //object relations

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];

  @OneToMany(() => RolePermission, (rp) => rp.role_object)
  role_permission_array: RolePermission[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
