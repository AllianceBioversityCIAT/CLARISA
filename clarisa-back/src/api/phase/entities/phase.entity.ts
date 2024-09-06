import { Exclude } from 'class-transformer';
import { Column, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

export abstract class Phase {
  @PrimaryColumn({ type: 'varchar', nullable: false, length: 255 })
  id!: string;

  @Column({ type: 'text', nullable: false })
  name!: string;

  @Column({ type: 'int', nullable: false })
  year!: number;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'tinyint', width: 1, nullable: false, default: () => '1' })
  is_open!: boolean;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields!: AuditableEntity;

  //util field for the phases endpoint
  application!: string;
}

export type PhaseConstructor<T extends Phase> = new () => T;
