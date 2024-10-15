import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Entity('levers')
export class Lever {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  short_name: string;

  @Column({ type: 'text', nullable: true })
  full_name: string;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
