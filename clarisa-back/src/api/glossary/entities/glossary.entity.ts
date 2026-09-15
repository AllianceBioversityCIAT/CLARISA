import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { GlossaryPortfolio } from './glossary-portfolio.entity';

@Entity('glossary')
export class Glossary {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  applicationName: string;

  /**
   * The concept this row is a version of, or `null` when the row is its own
   * concept — which is what every row that predates the grouping is.
   *
   * Stored and never read directly by consumers: what travels is `groupId`,
   * the resolved value, so the caller never has to know about the `null`.
   */
  @Exclude()
  @Column({ name: 'group_id', type: 'bigint', nullable: true })
  group_id: number;

  @Expose({ name: 'term' })
  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  definition: string;

  /**
   * Where the definition comes from — the document, framework or body that
   * states it (e.g. "CGIAR 2025-2030 Portfolio Narrative"). Free text: the
   * sources are heterogeneous and several are not reachable by URL.
   */
  @Expose({ name: 'source' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  source: string;

  /** Link to the source, when it has a public one. */
  @Expose({ name: 'sourceUrl' })
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl: string;

  /**
   * Date of the referenced material, not of the database row: it tells the
   * reader how current the definition is. `date` and not `timestamp` — the
   * sources are dated by day at best, and a timezone would shift the day.
   *
   * Typed `string` because that is what a `date` column is in TypeORM's model:
   * the day travels as `YYYY-MM-DD` end to end and is never rebuilt into a
   * `Date`, which would reintroduce the timezone that the column type avoids.
   */
  @Expose({ name: 'referenceDate' })
  @Column({ name: 'reference_date', type: 'date', nullable: true })
  referenceDate: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'tinyint', nullable: false, default: () => '0' })
  show_in_dashboard: boolean;

  //object relations

  @Exclude()
  @OneToMany(() => GlossaryPortfolio, (gp) => gp.glossary_object)
  glossary_portfolio_array: GlossaryPortfolio[];

  /**
   * The concept this row belongs to. Two rows that share it are two versions of
   * the same term — typically one per portfolio — and a reader can render them
   * together instead of as unrelated entries.
   *
   * `COALESCE(group_id, id)`: a row that was never related is its own group, so
   * this is always a number and every term published before the grouping keeps
   * a stable, unique value.
   */
  @Expose()
  get groupId(): number {
    return Number(this.group_id ?? this.id);
  }

  @Expose()
  get portfolios(): { id: number; name: string; acronym: string }[] {
    return (this.glossary_portfolio_array ?? [])
      .filter((gp) => gp.auditableFields?.is_active && gp.portfolio_object)
      .map((gp) => ({
        id: gp.portfolio_object.id,
        name: gp.portfolio_object.name,
        acronym: gp.portfolio_object.acronym,
      }));
  }

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
