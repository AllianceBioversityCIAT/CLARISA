import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CgiarEntity } from './cgiar-entity.entity';

export enum GlobalUnitLineageRelationType {
  MERGE = 'MERGE',
  SPLIT = 'SPLIT',
  SUCCESSOR = 'SUCCESSOR',
  RENAME = 'RENAME',
}

@Entity('global_unit_lineage')
export class GlobalUnitLineage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: false })
  from_global_unit_id: number;

  @Column({ type: 'bigint', nullable: false })
  to_global_unit_id: number;

  @Column({
    type: 'enum',
    enum: GlobalUnitLineageRelationType,
    nullable: false,
  })
  relation_type: GlobalUnitLineageRelationType;

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

  @ManyToOne(() => CgiarEntity, (entity) => entity.outgoing_lineages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'from_global_unit_id' })
  from_global_unit: CgiarEntity;

  @ManyToOne(() => CgiarEntity, (entity) => entity.incoming_lineages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_global_unit_id' })
  to_global_unit: CgiarEntity;
}
