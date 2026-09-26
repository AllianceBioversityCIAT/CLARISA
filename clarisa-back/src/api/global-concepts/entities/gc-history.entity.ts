import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonColumn } from '../utils/json-column';

export type GcFieldChange = { from: unknown; to: unknown };

export enum GcHistoryAction {
  CREATE = 'create',
  UPDATE = 'update',
  DIRECT_EDIT = 'direct_edit',
  STATUS = 'status',
  LABELS = 'labels',
  RELATIONS = 'relations',
  MAPPINGS = 'mappings',
  MERGE = 'merge',
  IMPORT = 'import',
  REQUEST_APPLIED = 'request_applied',
}

/**
 * Append-only change log. Its auto-increment `id` is the cursor of the change
 * feed (V31): two rows can share `changed_at`, never an id.
 */
@Entity('gc_history')
export class GcHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  concept_id: number;

  @Column({ type: 'varchar', length: 30 })
  action: GcHistoryAction;

  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<Record<string, GcFieldChange>>({}),
  })
  changes: Record<string, GcFieldChange>;

  /** Kept for audit, never published. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  changed_by_email: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  changed_at: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tx_id: string | null;

  @Column({ type: 'bigint', nullable: true })
  proposal_id: number | null;

  @Column({ type: 'bigint', nullable: true })
  release_id: number | null;
}
