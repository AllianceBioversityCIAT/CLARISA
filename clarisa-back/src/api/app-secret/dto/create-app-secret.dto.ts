import { ApiProperty } from '@nestjs/swagger';
import { CreateAppSecretMisDto } from './create-app-secret-mis.dto';

export class CreateAppSecretDto {
  @ApiProperty({
    description: 'The sender MIS',
    type: CreateAppSecretMisDto,
    required: true,
  })
  sender_mis: CreateAppSecretMisDto;

  @ApiProperty({
    description: 'The receiver MIS',
    type: CreateAppSecretMisDto,
    required: true,
  })
  receiver_mis: CreateAppSecretMisDto;
}
