import { AuditableDto } from '../../../shared/entities/dtos/auditable-dto';

export class CreateMisDto extends AuditableDto {
  name: string;
  acronym: string;
  contact_point_id: number;
  environment: string;
}
