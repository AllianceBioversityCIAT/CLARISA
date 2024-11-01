import { ApiProperty } from '@nestjs/swagger';
import { SimpleSdgV2Dto } from '../../sdg/dto/simple-sdg.v2.dto';

export class SdgTargetV2Dto {
  @ApiProperty({
    description: 'The id of the SDG Target',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The code of the SDG Target',
    type: String,
  })
  sdg_target_code: string;

  @ApiProperty({
    description: 'The name of the SDG Target',
    type: String,
  })
  sdg_target: string;

  @ApiProperty({
    description: 'The SDG itself',
    type: SimpleSdgV2Dto,
  })
  sdg: SimpleSdgV2Dto;
}
