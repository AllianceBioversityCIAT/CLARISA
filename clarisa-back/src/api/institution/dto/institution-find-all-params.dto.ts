import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BaseParamsDto } from '../../../shared/entities/dtos/base-params.dto';

export class InstitutionFindAllParams extends BaseParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({
    description:
      'Show institutions from a certain date (in milis). Defaults to null (shows all institutions).',
    required: false,
    type: Number,
    name: 'from',
  })
  from?: number;
}
