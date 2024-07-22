import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Entity('glossary')
export class Glossary {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  applicationName: string;

  @Column({ type: 'text', nullable: false })
  term: string;

  @Column({ type: 'text', nullable: false })
  definition: string;

  @Column({ type: 'tinyint', nullable: false, default: () => '0' })
  show_in_dashboard: boolean;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
