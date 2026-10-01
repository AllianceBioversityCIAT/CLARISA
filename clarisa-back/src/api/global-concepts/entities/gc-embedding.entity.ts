import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumn } from '../utils/json-column';

/**
 * One embedding per concept and model (task 3.4). `text_hash` is the hash of
 * the text that was embedded, so a refresh only pays for concepts whose label
 * or definition changed. Derived data: dropping the table loses nothing.
 */
@Entity('gc_embeddings')
export class GcEmbedding {
  @PrimaryColumn({ type: 'bigint' })
  concept_id: number;

  @PrimaryColumn({ type: 'varchar', length: 60 })
  model: string;

  @Column({ type: 'char', length: 64 })
  text_hash: string;

  @Column({ type: 'mediumtext', transformer: jsonColumn<number[]>([]) })
  vector: number[];

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
