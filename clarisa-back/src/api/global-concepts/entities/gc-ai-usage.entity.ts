import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Monthly AI spend, so the cap survives restarts and several instances (D8). */
@Entity('gc_ai_usage')
export class GcAiUsage {
  /** `YYYY-MM`, UTC. */
  @PrimaryColumn({ type: 'char', length: 7 })
  month: string;

  @Column({ type: 'int', default: 0 })
  calls: number;

  @Column({ type: 'bigint', default: 0 })
  input_tokens: number;

  @Column({ type: 'bigint', default: 0 })
  output_tokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost_usd: string;
}
