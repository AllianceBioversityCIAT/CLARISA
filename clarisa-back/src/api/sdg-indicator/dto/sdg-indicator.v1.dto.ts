import { ApiProperty } from '@nestjs/swagger';
import { SdgTargetV1Dto } from '../../sdg-target/dto/sdg-target.v1.dto';

export class SdgIndicatorV1Dto {
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
  unsdIndicatorCode: string;

  @ApiProperty({
    description: 'The indicator code',
    type: String,
  })
  indicatorCode: string;

  @ApiProperty({
    description: 'The indicator name',
    type: String,
  })
  indicatorName: string;

  @ApiProperty({
    description: 'The SDG target',
    type: SdgTargetV1Dto,
  })
  sdgTarget: SdgTargetV1Dto;
}
