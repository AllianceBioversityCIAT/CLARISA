import { ApiProperty } from '@nestjs/swagger';

export class SdgTargetIpsrDto {
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
    description: 'The code of the SDG',
    minimum: 1,
    type: Number,
  })
  usndCode: number;
}
