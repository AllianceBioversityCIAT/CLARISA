import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Icon register, field names as the schema's "Icon register" sheet (low priority per CGIAR). */
@Entity('gc_icons')
export class GcIcon {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /** The sheet's `icon_id` (e.g. IC2374). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon_code: string | null;

  /** Internal concept id (V29), never the term_id. */
  @Column({ type: 'bigint' })
  concept_id: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  icon_status: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  file_format: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  designer: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  designer_country: string | null;

  @Column({ type: 'int', nullable: true })
  year_created: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rights_and_licence: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  alt_text: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  file_link_primary: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  file_link_backup: string | null;

  @Column({ type: 'date', nullable: true })
  date_added: string | null;
}
