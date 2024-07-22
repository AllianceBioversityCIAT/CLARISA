import { OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { BasicDtoV1 } from './basic.v1.dto';

export class BasicDtoV2 extends OmitType(BasicDtoV1, ['id'] as const) {
  @ApiProperty({
    description: 'The id of the entity',
    minimum: 1,
    oneOf: [{ type: 'number' }, { type: 'string' }],
  })
  code: string | number;
}
