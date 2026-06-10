import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Mis } from '../../mis/entities/mis.entity';
import { Environment } from '../../environment/entities/environment.entity';
import { ApiKeyUsageLog } from './api-key-usage-log.entity';

@Entity('api_keys')
@Index('idx_api_keys_key_prefix', ['key_prefix'])
export class ApiKey {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  mis_id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 16, nullable: false })
  key_prefix: string;

  @Column({ type: 'varchar', length: 255, nullable: false, select: false })
  key_hash: string;

  @Column({ type: 'json', nullable: true })
  scopes: string[];

  @Column({ type: 'bigint', nullable: true })
  environment_id: number;

  @Column({ type: 'json', nullable: true })
  allowed_ips: string[];

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date;

  @Column({ type: 'bigint', default: 0 })
  usage_count: number;

  @ManyToOne(() => Mis, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mis_id' })
  mis_object: Mis;

  @ManyToOne(() => Environment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'environment_id' })
  environment_object: Environment;

  @OneToMany(() => ApiKeyUsageLog, (log) => log.api_key_object)
  usage_logs: ApiKeyUsageLog[];

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
