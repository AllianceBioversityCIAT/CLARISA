import { AuditableDto } from 'src/shared/entities/dtos/auditable-dto';

export class CreatePolicyStageDto extends AuditableDto {
  name: string;

  definition: string;

  source_id: number;
}
