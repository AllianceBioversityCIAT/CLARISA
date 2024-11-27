import { ApiProperty } from '@nestjs/swagger';
import { SdgV1Dto } from '../../sdg/dto/sdg.v1.dto';

export class SdgTargetV1Dto {
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
  sdgTargetCode: string;

  @ApiProperty({
    description: 'The name of the SDG Target',
    type: String,
  })
  sdgTarget: string;

  @ApiProperty({
    description: 'The SDG itself',
    type: SdgV1Dto,
  })
  sdg: SdgV1Dto;
}
