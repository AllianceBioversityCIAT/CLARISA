import { ApiProperty, PickType } from '@nestjs/swagger';
import { BasicDtoV2 } from '../../../shared/entities/dtos/basic.v2.dto';
import { UnitTypeDto } from './unit-type.dto';

export class UnitDto extends PickType(BasicDtoV2, ['code', 'description']) {
  @ApiProperty({
    description: 'The financial code of the unit',
    type: String,
  })
  financialCode: string;

  @ApiProperty({
    description: 'The type of the unit',
    type: UnitTypeDto,
  })
  unitType: UnitTypeDto;

  @ApiProperty({
    description: 'The parent unit',
    type: BasicDtoV2,
  })
  scienceGroup: BasicDtoV2;

  @ApiProperty({
    description: 'The parent unit',
    type: BasicDtoV2,
  })
  parent: BasicDtoV2;
}
