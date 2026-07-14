import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Portfolio } from '../../portfolio/entities/portfolio.entity';
import { Glossary } from './glossary.entity';

@Entity('glossary_portfolios')
export class GlossaryPortfolio {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  //relations

  @Column({ type: 'bigint', nullable: false })
  glossary_id: number;

  @Column({ type: 'bigint', nullable: false })
  portfolio_id: number;

  //object relations

  @ManyToOne(() => Glossary, (g) => g.glossary_portfolio_array)
  @JoinColumn({ name: 'glossary_id' })
  glossary_object: Glossary;

  @ManyToOne(() => Portfolio, (p) => p.glossary_portfolio_array)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio_object: Portfolio;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
