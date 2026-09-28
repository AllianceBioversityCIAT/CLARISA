import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * `pref` is only for languages other than the scheme's default (the default
 * one is `gc_concepts.preferred_label`, V4). `hidden` holds misspellings and
 * old names used for matching; `discouraged` is a status, not a kind (V5).
 */
export enum GcLabelKind {
  PREF = 'pref',
  ALT = 'alt',
  HIDDEN = 'hidden',
  ACRONYM = 'acronym',
}

export enum GcLabelStatus {
  ACTIVE = 'active',
  DISCOURAGED = 'discouraged',
}

@Entity('gc_labels')
export class GcLabel {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  concept_id: number;

  @Column({ type: 'varchar', length: 500 })
  label: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 20, default: GcLabelKind.ALT })
  kind: GcLabelKind;

  @Column({ type: 'varchar', length: 20, default: GcLabelStatus.ACTIVE })
  status: GcLabelStatus;
}
