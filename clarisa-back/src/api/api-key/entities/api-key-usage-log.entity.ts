import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiKey } from './api-key.entity';

@Entity('api_key_usage_logs')
@Index('idx_usage_logs_created_at', ['created_at'])
@Index('idx_usage_logs_microservice', ['microservice_name'])
export class ApiKeyUsageLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false })
  api_key_id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  microservice_name: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  endpoint_accessed: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  http_method: string;

  @Column({ type: 'int', nullable: true })
  status_code: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string;

  @Column({ type: 'int', nullable: true })
  response_time_ms: number;

  @Column({
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at: Date;

  @ManyToOne(() => ApiKey, (key) => key.usage_logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'api_key_id' })
  api_key_object: ApiKey;
}
