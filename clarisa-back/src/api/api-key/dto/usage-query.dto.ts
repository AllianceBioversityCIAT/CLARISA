import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UsageDateRangeQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class UsageSummaryQueryDto extends UsageDateRangeQueryDto {
  @IsOptional()
  @IsIn(['day', 'week'])
  granularity?: 'day' | 'week' = 'day';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mis_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  api_key_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  microservice_name?: string;
}

export class ApiKeyUsageQueryDto extends UsageDateRangeQueryDto {
  @IsOptional()
  @IsIn(['day', 'week'])
  granularity?: 'day' | 'week' = 'day';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  microservice_name?: string;
}

export class UsageLogsQueryDto extends UsageSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
