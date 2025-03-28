import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { CgiarEntityType } from '../../cgiar-entity-type/entities/cgiar-entity-type.entity';
import { CgiarEntity } from '../../cgiar-entity/entities/cgiar-entity.entity';
import { ImpactAreaIndicator } from '../../impact-area-indicator/entities/impact-area-indicator.entity';

@Entity('portfolios')
export class Portfolio {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date;

  //object relations
  @OneToMany(() => CgiarEntityType, (cet) => cet.portfolio_object)
  cgiar_entity_type_array: CgiarEntityType[];

  @OneToMany(() => CgiarEntity, (ce) => ce.portfolio_object)
  cgiar_entity_array: CgiarEntity[];

  @OneToMany(() => ImpactAreaIndicator, (iai) => iai.portfolio)
  impact_area_indicators: ImpactAreaIndicator[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
