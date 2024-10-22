import { ApiProperty } from '@nestjs/swagger';
import { FindAllOptions } from '../enums/find-all-options';
import { IsOptional } from 'class-validator';
import { PaginationParamsDto } from './pagination-params.dto';

export class BaseParamsDto extends PaginationParamsDto {
  @IsOptional()
  @ApiProperty({
    description: 'Show active, inactive or all entities. Defaults to active.',
    required: false,
    enum: FindAllOptions,
    name: 'show',
  })
  show: FindAllOptions;
}
