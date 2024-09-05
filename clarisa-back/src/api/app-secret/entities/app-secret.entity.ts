import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mis } from '../../mis/entities/mis.entity';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { Exclude } from 'class-transformer';

@Entity('application_secrets')
export class AppSecret {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  relation_uuid: string;

  @Column({ type: 'text', nullable: false, select: false })
  secret: string;

  // relations
  @Column()
  sender_mis_id: number;

  @Column()
  receiver_mis_id: number;

  // object relations
  @ManyToOne(() => Mis, (mr) => mr.mis_receiver_array)
  @JoinColumn({ name: 'receiver_mis_id' })
  receiver_mis_object: Mis;

  @ManyToOne(() => Mis, (ms) => ms.mis_sender_array)
  @JoinColumn({ name: 'sender_mis_id' })
  sender_mis_object: Mis;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
