import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Source } from '../../source/entities/source.entity';

@Entity('innovation_types')
export class InnovationType {
  @Expose({ name: 'code' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  definition: string;

  //relations

  @Column({ type: 'bigint', nullable: false })
  source_id: number;

  //object relations

  @ManyToOne(() => Source, (s) => s.innovation_type_array)
  @JoinColumn({ name: 'source_id' })
  source_object: Source;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
