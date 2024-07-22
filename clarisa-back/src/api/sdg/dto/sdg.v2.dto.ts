import { ApiProperty } from '@nestjs/swagger';
import { SimpleSdgV2Dto } from './simple-sdg.v2.dto';

export class SdgV2Dto extends SimpleSdgV2Dto {
  @ApiProperty({
    description: 'The id of the SDG',
    minimum: 1,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'The route to the icon of the SDG',
    type: String,
  })
  icon: string;

  @ApiProperty({
    description: 'The hexadecimal color of the SDG',
    type: String,
  })
  color: string;

  @ApiProperty({
    description: 'The description of the SDG',
    type: String,
  })
  description: string;
}
