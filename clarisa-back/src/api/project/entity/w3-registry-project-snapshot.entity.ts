import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('w3_registry_project_snapshot')
@Index('idx_w3_snapshot_source_project', ['external_project_id'])
export class W3RegistryProjectSnapshot {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false })
  sync_id: number;

  @Column({ type: 'varchar', length: 128, nullable: false })
  external_project_id: string;

  @Column({ type: 'bigint', nullable: true })
  source_record_id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  external_code: string;

  @Column({ type: 'int', nullable: true })
  source_snapshot_id: number;

  @Column({ type: 'int', nullable: false, default: 2026 })
  phase: number;

  @Column({ type: 'json', nullable: false })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32, nullable: false, default: 'RECEIVED' })
  processing_status: string;

  @Column({ type: 'bigint', nullable: true })
  project_id: number;

  @Column({ type: 'json', nullable: true })
  warnings: string[];

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'datetime', nullable: false })
  ingested_at: Date;
}
