import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mis } from './mis.entity';

@Entity('mises_auth')
export class MisAuth {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'number', nullable: false })
  mis_id: number;

  @OneToOne(() => Mis, (m) => m.mis_auth)
  @JoinColumn({ name: 'mis_id' })
  mis_object: Mis;

  @Column({ type: 'text', nullable: false })
  auth_url: string;

  @Column({ type: 'text', nullable: false })
  cognito_client_id: string;

  @Column({ type: 'text', nullable: false })
  cognito_client_secret: string;
}
