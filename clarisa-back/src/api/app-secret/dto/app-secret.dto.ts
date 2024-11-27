import { ApiProperty } from '@nestjs/swagger';
import { MisDto } from '../../mis/dto/mis.dto';

export class AppSecretDto {
  @ApiProperty({
    description: 'The sender MIS',
    type: MisDto,
    required: true,
  })
  sender_mis: MisDto;

  @ApiProperty({
    description: 'The receiver MIS',
    type: MisDto,
    required: true,
  })
  receiver_mis: MisDto;

  @ApiProperty({
    description: 'The client UUID',
    type: String,
  })
  client_id: string;

  @ApiProperty({
    description: 'The client secret',
    type: String,
    required: false,
  })
  secret?: string;
}
