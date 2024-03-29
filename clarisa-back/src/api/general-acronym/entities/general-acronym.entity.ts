import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Entity('general_acronyms')
export class GeneralAcronym {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  @Expose({ name: 'code' })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  acronym: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
