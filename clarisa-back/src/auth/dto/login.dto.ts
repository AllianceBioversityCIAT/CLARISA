import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'The username or email of the user',
    type: String,
    required: true,
  })
  login: string;

  @ApiProperty({
    description: 'The password of the user',
    type: String,
    required: true,
  })
  password: string;
}
