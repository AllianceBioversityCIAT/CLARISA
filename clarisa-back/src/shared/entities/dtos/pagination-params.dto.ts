import { IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({
    description:
      'The number of records to skip before starting to return records. Defaults to 0.',
    default: 0,
    required: true,
  })
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({
    description:
      'The maximum number of records to return. Defaults to 100. Please note that using more than 1000 records via this interface is not recommended.',
    default: 100,
    required: true,
  })
  limit?: number;
}
