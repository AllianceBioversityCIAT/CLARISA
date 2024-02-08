import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { CgiarEntity } from '../../cgiar-entity/entities/cgiar-entity.entity';

@Entity('frameworks')
export class Framework {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'tinyint', width: 1, nullable: false, default: () => '0' })
  currently_in_use: boolean;

  //object relations
  @OneToMany(() => CgiarEntity, (ce) => ce.framework_object)
  cgiar_entity_array: CgiarEntity[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
