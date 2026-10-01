import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { jsonColumn } from '../utils/json-column';

export enum GcProposalType {
  NEW = 'new',
  EDIT = 'edit',
  MERGE = 'merge',
  DEPRECATE = 'deprecate',
  PROMOTE = 'promote',
}

/** submitted → in_review ⇄ changes_requested → validation → approved | rejected */
export enum GcProposalState {
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  CHANGES_REQUESTED = 'changes_requested',
  VALIDATION = 'validation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum GcProposalOrigin {
  FORM = 'form',
  PLATFORM = 'platform',
  CLARISA_USER = 'clarisa_user',
}

/** A concept request (the Partner Requests pattern). */
@Entity('gc_proposals')
export class GcProposal {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20 })
  type: GcProposalType;

  @Column({ type: 'bigint' })
  scheme_id: number;

  /** Source concept (edit, deprecate, merge source, promote source). */
  @Column({ type: 'bigint', nullable: true })
  concept_id: number | null;

  /** Merge survivor, or the concept a promote/new request created. */
  @Column({ type: 'bigint', nullable: true })
  target_concept_id: number | null;

  @Column({ type: 'bigint', nullable: true })
  target_scheme_id: number | null;

  /** Concept version the edit was written against (V16). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  base_version: string | null;

  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<Record<string, unknown>>({}),
  })
  payload: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  rationale: string | null;

  /** The person asking; for platforms it is asserted by the platform (V38). */
  @Column({ type: 'varchar', length: 255 })
  requester_email: string;

  @Column({ type: 'varchar', length: 20 })
  origin: GcProposalOrigin;

  @Column({ type: 'varchar', length: 50, nullable: true })
  origin_platform: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  external_request_id: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  access_token_hash: string | null;

  @Column({
    type: 'text',
    nullable: true,
    transformer: jsonColumn<Record<string, unknown> | null>(null),
  })
  ai_recommendation: Record<string, unknown> | null;

  @Column({ type: 'datetime', nullable: true })
  no_objection_until: Date | null;

  @Column({ type: 'varchar', length: 30, default: GcProposalState.SUBMITTED })
  state: GcProposalState;

  @Column({ type: 'text', nullable: true })
  decision_note: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  decided_by_email: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

@Entity('gc_proposal_events')
export class GcProposalEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  proposal_id: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  from_state: GcProposalState | null;

  @Column({ type: 'varchar', length: 30 })
  to_state: GcProposalState;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actor_email: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  at: Date;
}

@Entity('gc_email_verifications')
export class GcEmailVerification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 128 })
  token_hash: string;

  @Column({
    type: 'text',
    transformer: jsonColumn<Record<string, unknown>>({}),
  })
  proposal_draft: Record<string, unknown>;

  @Column({ type: 'datetime' })
  expires_at: Date;

  @Column({ type: 'datetime', nullable: true })
  used_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

@Entity('gc_outbox')
export class GcOutbox {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 30 })
  kind: string;

  @Column({
    type: 'text',
    transformer: jsonColumn<Record<string, unknown>>({}),
  })
  payload: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  next_attempt_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
