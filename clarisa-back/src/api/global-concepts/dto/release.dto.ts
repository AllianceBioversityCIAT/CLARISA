import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PublishReleaseDto {
  @IsString()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: 'version must be semantic, e.g. 1.0.0',
  })
  version: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
