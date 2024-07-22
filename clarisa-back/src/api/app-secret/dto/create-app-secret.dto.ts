import { ApiProperty } from '@nestjs/swagger';
import { SimpleMisDto } from '../../mis/dto/simple-mis.dto';

export class CreateAppSecretDto {
  @ApiProperty({
    description: 'The sender MIS',
    type: SimpleMisDto,
    required: true,
  })
  sender_mis: SimpleMisDto;

  @ApiProperty({
    description: 'The receiver MIS',
    type: SimpleMisDto,
    required: true,
  })
  receiver_mis: SimpleMisDto;
}
