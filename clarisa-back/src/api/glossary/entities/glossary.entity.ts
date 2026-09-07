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
   */
  @Expose({ name: 'referenceDate' })
  @Column({ name: 'reference_date', type: 'date', nullable: true })
  referenceDate: Date;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'tinyint', nullable: false, default: () => '0' })
  show_in_dashboard: boolean;

  //object relations

  @Exclude()
  @OneToMany(() => GlossaryPortfolio, (gp) => gp.glossary_object)
  glossary_portfolio_array: GlossaryPortfolio[];

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
