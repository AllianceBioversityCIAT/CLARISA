import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { GlossaryPortfolio } from './glossary-portfolio.entity';

/**
 * Where a term stands in its editorial life. Only `approved` and `deprecated`
 * are published: a draft or a term under review never reaches a consumer.
 */
export enum GlossaryEditorialStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  DEPRECATED = 'deprecated',
}

/** The statuses the public endpoints serve. */
export const PUBLISHED_EDITORIAL_STATUSES: GlossaryEditorialStatus[] = [
  GlossaryEditorialStatus.APPROVED,
  GlossaryEditorialStatus.DEPRECATED,
];

/**
 * Reads the stored alternative labels back as a clean list. Anything that is
 * not a JSON array of strings — `null`, an empty value, text written by hand in
 * the database — degrades to `[]` instead of failing the whole read.
 */
export function parseLabels(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter((label): label is string => typeof label === 'string')
          .map((label) => label.trim())
          .filter((label) => label !== '')
      : [];
  } catch {
    return [];
  }
}

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

  /**
   * Other names readers actually use for the same concept — acronyms, older
   * wording, common variants ("IA" for "Impact assessment"). They are what lets
   * a search, or an AI tool, recognise a term written differently.
   *
   * Stored as a JSON array in a nullable text column; what travels is the
   * `alternativeLabels` getter below.
   */
  @Exclude()
  @Column({ name: 'alternative_labels', type: 'text', nullable: true })
  alternative_labels: string | null;

  /**
   * Editorial status, `approved` for every row that predates the column — so
   * what is published today stays published, unchanged. What travels is the
   * `editorialStatus` getter, which never returns an empty value.
   */
  @Exclude()
  @Column({
    name: 'editorial_status',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: GlossaryEditorialStatus.APPROVED,
  })
  editorial_status: GlossaryEditorialStatus;

  /**
   * The term that supersedes this one once it is deprecated. Retired terms are
   * never deleted, so a report that cites the old one still resolves, and a
   * reader is sent to the current wording.
   */
  @Exclude()
  @Column({ name: 'replaced_by_id', type: 'bigint', nullable: true })
  replaced_by_id: number | null;

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

  /**
   * The permanent identifier of this entry: the row id, which never changes
   * when the wording is edited. `groupId` cannot play that role — the versions
   * of a concept share it — so a consumer that needs to cite or link one
   * specific entry (a permalink, a SKOS URI) reads this one.
   *
   * Additive: `id` itself stays excluded, so no existing key changes.
   */
  @Expose()
  get termId(): number {
    return Number(this.id);
  }

  /**
   * Always an array: a row without synonyms — every row that predates the
   * column — publishes `[]`, never `null`, so a consumer can iterate it
   * without a null check.
   */
  @Expose()
  get editorialStatus(): GlossaryEditorialStatus {
    return this.editorial_status ?? GlossaryEditorialStatus.APPROVED;
  }

  /** `termId` of the replacement, or `null` while the term is current. */
  @Expose()
  get replacedByTermId(): number | null {
    return this.replaced_by_id === null || this.replaced_by_id === undefined
      ? null
      : Number(this.replaced_by_id);
  }

  @Expose()
  get alternativeLabels(): string[] {
    return parseLabels(this.alternative_labels);
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
