import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Institution } from './institution.entity';

/**
 * Vocabulary frozen to the one already in production for `global_unit_lineage`.
 * `RENAME` is stored as 'NEW' there, and it stays that way here on purpose: two
 * sibling lineage tables speaking different dialects would be worse than one
 * odd-looking mapping, and PRMS's `default:` branch would launder any unknown
 * value back into 'NEW' regardless.
 */
export enum InstitutionLineageRelationType {
  MERGE = 'MERGE',
  SPLIT = 'SPLIT',
  SUCCESSOR = 'SUCCESSOR',
  RENAME = 'NEW',
}

/**
 * Directed edge between two institutions: `from_institution_id` was replaced by
 * `to_institution_id`. An edge table rather than a scalar FK on `institutions`
 * because a FK only models N->1, cannot express a split, and going from object
 * to array later would not be an additive API change.
 */
@Entity('institution_lineage')
export class InstitutionLineage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /** predecessor. NULL means the institution was not born out of another one */
  @Column({ type: 'bigint', nullable: true })
  from_institution_id: number;

  /** successor */
  @Column({ type: 'bigint', nullable: false })
  to_institution_id: number;

  @Column({
    type: 'enum',
    enum: InstitutionLineageRelationType,
    nullable: false,
  })
  relation_type: InstitutionLineageRelationType;

  /** date of the real-world fact, not of the database row */
  @Column({ type: 'date', nullable: true })
  change_date: string;

  /** why the change happened — the skos:historyNote of this edge */
  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @Column({ type: 'bigint', nullable: true })
  created_by: number;

  @ManyToOne(
    () => Institution,
    (institution) => institution.outgoing_lineages,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'from_institution_id' })
  from_institution: Institution;

  @ManyToOne(
    () => Institution,
    (institution) => institution.incoming_lineages,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'to_institution_id' })
  to_institution: Institution;
}
