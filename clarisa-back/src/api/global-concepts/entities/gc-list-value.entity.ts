import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One value of a controlled list. `scope` is a scheme code, or '' for values
 * shared by every scheme. Values are immutable once used (V21): add a new one
 * and deactivate the old instead of renaming.
 */
@Entity('gc_lists')
export class GcListValue {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50, default: '' })
  scope: string;

  @Column({ type: 'varchar', length: 50 })
  list_code: string;

  @Column({ type: 'varchar', length: 100 })
  value: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', default: 1 })
  is_active: boolean;
}
