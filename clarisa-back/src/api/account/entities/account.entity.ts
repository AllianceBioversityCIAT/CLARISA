import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';
import { AccountType } from '../../account-type/entities/account-type.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  financial_code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  //relations

  @Column({ type: 'bigint', nullable: false })
  account_type_id: number;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  //object relations

  @ManyToOne(() => AccountType, (a) => a.accounts)
  @JoinColumn({ name: 'account_type_id' })
  //@Expose()
  account_type: AccountType;

  @ManyToOne(() => Account, (a) => a.children)
  @JoinColumn({ name: 'parent_id' })
  //@Expose()
  parent: Account;

  @OneToMany(() => Account, (a) => a.parent)
  children: Account[];

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
