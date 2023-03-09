import { Expose } from 'class-transformer';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { CgiarEntity } from '../../cgiar-entity/entities/cgiar-entity.entity';

@Entity('global_unit_types')
export class CgiarEntityType extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  @Expose({ name: 'code' })
  id: number;

  @Column({ type: 'text', nullable: true })
  name: string;

  @OneToMany(() => CgiarEntity, (ce) => ce.cgiar_entity_object)
  cgiar_entity_array: CgiarEntity[];
}
