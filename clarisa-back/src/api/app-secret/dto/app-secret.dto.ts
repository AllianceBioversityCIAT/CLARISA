import { ApiProperty } from '@nestjs/swagger';
import { CreateAppSecretDto } from './create-app-secret.dto';

export class AppSecretDto extends CreateAppSecretDto {
  @ApiProperty({
    description: 'The client UUID',
    type: String,
  })
  client_id: string;

  @ApiProperty({
    description: 'The client secret',
    type: String,
  })
  secret?: string;
}
