import { ApiProperty } from '@nestjs/swagger';
import { UserLoginDataDto } from '../../api/user/dto/user-login-data.dto';

export class LoginResponseDto {
  @ApiProperty({
    description: 'The access token of the user',
    type: String,
  })
  access_token: string;

  @ApiProperty({
    description: 'The user data',
    type: UserLoginDataDto,
  })
  user: UserLoginDataDto;
}
