import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * A parameter of the platform that an administrator changes from the panel
 * (Parameters page) instead of a deploy. One row per key; `value` is text.
 */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ name: 'setting_key', type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by_email: string | null;
}
