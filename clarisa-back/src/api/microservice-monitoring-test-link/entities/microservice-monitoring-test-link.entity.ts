import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/entities/extends/auditable-entity.entity';

@Entity('microservice_monitoring_test_links')
export class MicroserviceMonitoringTestLink {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  link: string;

  @Column({ type: 'text', nullable: false })
  cron_expression: string;

  @Column({ type: 'text', nullable: false })
  html_tag: string;

  @Column({ type: 'text', nullable: false })
  html_tag_attribute: string;

  @Column({ type: 'text', nullable: false })
  html_tag_attribute_value: string;

  //auditable fields

  @Exclude()
  @Column(() => AuditableEntity, { prefix: '' })
  auditableFields: AuditableEntity;
}
