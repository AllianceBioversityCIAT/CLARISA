import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A released, immutable version of a scheme. The snapshot holds every public
 * concept as it was; `release_uri` is stored once and never recomputed (V32).
 */
@Entity('gc_releases')
export class GcRelease {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  scheme_id: number;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'varchar', length: 500 })
  release_uri: string;

  @Column({ type: 'bigint', nullable: true })
  previous_release_id: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  released_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  license: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  released_by_email: string | null;

  /** JSON array of the public concepts, in the public API shape. */
  @Column({ type: 'longtext' })
  snapshot: string;
}
