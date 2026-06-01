import { ApiProperty } from '@nestjs/swagger';

export class BasicDto {
  @ApiProperty({ example: 1, description: 'Internal code / identifier of the record.' })
  code: string | number;

  @ApiProperty({ required: false, example: 'Name', description: 'Display name of the record.' })
  name?: string;

  @ApiProperty({ required: false, description: 'Optional description of the record.' })
  description?: string;

  @ApiProperty({ required: false, example: true, description: 'Whether the record is active.' })
  is_active?: boolean;
}
