import { ApiProperty } from '@nestjs/swagger';
import { SdgTargetV2Dto } from '../../sdg-target/dto/sdg-target.v2.dto';

export class SdgIndicatorV2Dto {
  @ApiProperty({
    description: 'The id of the SDG indicator',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The UNSD indicator code',
    type: String,
  })
  unsd_indicator_code: string;

  @ApiProperty({
    description: 'The indicator code',
    type: String,
  })
  indicator_code: string;

  @ApiProperty({
    description: 'The indicator name',
    type: String,
  })
  indicator_name: string;

  @ApiProperty({
    description: 'The SDG target',
    type: SdgTargetV2Dto,
  })
  sdg_target: SdgTargetV2Dto;
}
