import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Exclude } from 'class-transformer';

@Entity('global_parameters')
export class GlobalParameter {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    nullable: false,
    length: 64,
  })
  @Index({ unique: true })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: false,
  })
  description: string;

  @Column({
    name: 'value',
    type: 'text',
    nullable: true,
  })
  value: string;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
