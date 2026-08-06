import { ApiProperty } from '@nestjs/swagger';
import { BasicDto } from '../../../shared/entities/dtos/basic-dto';
import { GlobalUnitLineageDto } from './global-unit-lineage.dto';

export class CgiarEntityDtoV2 extends BasicDto {
  @ApiProperty({ required: false, example: 1, description: 'Internal ID of the entity.' })
  id?: number;

  @ApiProperty({ required: false, example: 'Alliance', description: 'Short name of the entity.' })
  short_name: string;

  @ApiProperty({ example: 'CIAT', description: 'Acronym of the entity.' })
  acronym: string;

  @ApiProperty({ required: false, description: 'Composed code of the entity.' })
  compose_code?: string;

  @ApiProperty({ required: false, example: 2024, description: 'Reference year.' })
  year?: number;

  @ApiProperty({ type: () => BasicDto, description: 'Entity type (Center, CRP, Platform, etc.).' })
  entity_type: BasicDto;

  @ApiProperty({ type: () => BasicDto, required: false, description: 'Parent entity.' })
  parent: BasicDto;

  @ApiProperty({ type: () => BasicDto, required: false, description: 'Associated portfolio.' })
  portfolio: BasicDto;

  @ApiProperty({ required: false, description: 'Start date of the entity.' })
  start_date: string;

  @ApiProperty({ required: false, description: 'End date of the entity (if no longer active).' })
  end_date: string;

  @ApiProperty({ required: false, example: 1, description: 'Hierarchy level.' })
  level: number;

  @ApiProperty({ type: () => GlobalUnitLineageDto, isArray: true, required: false, description: 'Incoming lineage relations.' })
  incoming_lineages?: GlobalUnitLineageDto[];

  @ApiProperty({ type: () => GlobalUnitLineageDto, isArray: true, required: false, description: 'Outgoing lineage relations.' })
  outgoing_lineages?: GlobalUnitLineageDto[];

  @ApiProperty({ required: false, example: true, description: 'Whether the entity is active.' })
  is_active?: boolean;
}
