import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * `broader`: `concept_id` is narrower than `related_concept_id` (directed;
 * narrower is never stored). `related`: symmetric, stored once with the lower
 * id first (V8). Both ends always belong to the same scheme (V7).
 */
export enum GcRelationKind {
  BROADER = 'broader',
  RELATED = 'related',
}

@Entity('gc_relations')
export class GcRelation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  concept_id: number;

  @Column({ type: 'bigint' })
  related_concept_id: number;

  @Column({ type: 'varchar', length: 20 })
  kind: GcRelationKind;
}
