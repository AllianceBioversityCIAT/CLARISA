import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { AuditableDto } from '../../../shared/entities/dtos/auditable-dto';

export class CreateMisDto extends AuditableDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message:
      'acronym must contain only letters, numbers, underscores, and hyphens',
  })
  acronym: string;

  @IsInt()
  @Min(1)
  contact_point_id: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  environment: string;
}
