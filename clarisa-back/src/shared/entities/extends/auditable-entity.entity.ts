import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../../api/user/entities/user.entity';

export class AuditableEntity {
  @Exclude({ toPlainOnly: true })
  @Column()
  @CreateDateColumn({ type: 'timestamp', nullable: false })
  created_at: Date;

  @Exclude({ toPlainOnly: true })
  @CreateDateColumn({ type: 'timestamp', nullable: true })
  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'tinyint', width: 1, nullable: false, default: () => '1' })
  is_active: boolean;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'bigint', nullable: false })
  created_by: number;

  // TODO change nullable: false
  @Exclude({ toPlainOnly: true })
  @Column({ type: 'bigint', nullable: true })
  updated_by: number;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'text', nullable: true })
  modification_justification: string;

  //object "relations"

  @Exclude()
  created_by_object: User;

  @Exclude()
  updated_by_object: User;
}
