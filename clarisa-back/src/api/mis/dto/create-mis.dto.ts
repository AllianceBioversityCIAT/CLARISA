import { ApiProperty } from '@nestjs/swagger';
import { AuditableDto } from '../../../shared/entities/dtos/auditable-dto';

export class CreateMisDto extends AuditableDto {
  @ApiProperty({
    description: "The MIS' name",
    type: String,
  })
  name: string;

  @ApiProperty({
    description: "The MIS' acronym",
    type: String,
  })
  acronym: string;

  @ApiProperty({
    description: "The MIS' contact point user id",
    minimum: 1,
    type: Number,
  })
  contact_point_id: number;

  @ApiProperty({
    description: "The MIS' environment",
    type: String,
    examples: ['PROD', 'DEV', 'LOCAL'],
  })
  environment: string;
}
