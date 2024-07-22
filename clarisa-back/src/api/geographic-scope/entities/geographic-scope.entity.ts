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

@Entity('geographic_scopes')
export class GeographicScope {
  @Expose({ name: 'code' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  iati_name: string;

  @Column({ type: 'text', nullable: true })
  definition: string;

  @Column({ type: 'tinyint', width: 1, nullable: false, default: () => '1' })
  is_one_cgiar: boolean;

  //relations

  @Column({ type: 'bigint', nullable: false })
  source_id: number;

  //object relations

  @ManyToOne(() => Source, (s) => s.geographic_scope_array)
  @JoinColumn({ name: 'source_id' })
  source_object: Source;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
