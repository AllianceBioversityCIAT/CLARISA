import { ApiProperty } from '@nestjs/swagger';

export class ValidateAppSecretDto {
  @ApiProperty({
    description: 'The client UUID',
    type: String,
    required: true,
  })
  client_id: string;

  @ApiProperty({
    description: 'The client secret',
    type: String,
    required: true,
  })
  secret?: string;
}
