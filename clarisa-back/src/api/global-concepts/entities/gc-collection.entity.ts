import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A curated subset of one scheme that does not touch the hierarchy. */
@Entity('gc_collections')
export class GcCollection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  scheme_id: number;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'tinyint', default: 0 })
  ordered: boolean;
}

@Entity('gc_collection_members')
export class GcCollectionMember {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  collection_id: number;

  /** Always a concept of the collection's own scheme (V33). */
  @Column({ type: 'bigint' })
  concept_id: number;

  @Column({ type: 'int', nullable: true })
  position: number | null;
}
