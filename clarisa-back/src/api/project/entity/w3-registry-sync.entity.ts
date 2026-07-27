import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('w3_registry_sync')
export class W3RegistrySync {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 32, nullable: false, default: 'RUNNING' })
  status: string;

  @Column({ type: 'datetime', nullable: false })
  started_at: Date;

  @Column({ type: 'datetime', nullable: true })
  finished_at: Date;

  @Column({ type: 'int', nullable: true })
  source_snapshot_id: number;

  @Column({ type: 'int', nullable: true })
  expected_count: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  processed_count: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  created_count: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  updated_count: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  warning_count: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;
}
