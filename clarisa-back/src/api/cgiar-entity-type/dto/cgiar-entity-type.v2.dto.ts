import { ApiProperty } from '@nestjs/swagger';
import { BasicDto } from '../../../shared/entities/dtos/basic-dto';

export class CgiarEntityTypeDtoV2 extends BasicDto {
  @ApiProperty({ required: false, example: 'CRP', description: 'Short prefix of the entity type.' })
  prefix: string;

  @ApiProperty({ type: () => BasicDto, required: false, description: 'Parent entity type.' })
  parent: BasicDto;

  @ApiProperty({ required: false, description: 'Definition of the entity type.' })
  definition: string;

  @ApiProperty({ required: false, example: 1, description: 'Hierarchy level.' })
  level: number;

  @ApiProperty({ type: () => BasicDto, required: false, description: 'Associated funding source.' })
  funding_source: BasicDto;

  @ApiProperty({ type: () => BasicDto, required: false, description: 'Associated portfolio.' })
  portfolio: BasicDto;
}
