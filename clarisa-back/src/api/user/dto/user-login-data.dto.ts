import { ApiProperty } from '@nestjs/swagger';

export class UserLoginDataDto {
  @ApiProperty({
    description: 'The username of the user',
    type: String,
  })
  username: string;

  @ApiProperty({
    description: 'The full name of the user',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'The permissionss of the user',
    type: [String],
  })
  permissions: string[];

  @ApiProperty({
    description: 'The email of the user',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'The id of the user',
    type: Number,
  })
  id: number;
}
