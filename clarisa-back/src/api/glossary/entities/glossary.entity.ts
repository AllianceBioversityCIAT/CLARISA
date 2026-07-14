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
