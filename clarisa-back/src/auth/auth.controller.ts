import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../shared/guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiBody({
    type: LoginDto,
    required: true,
    description: 'The data to login a user',
    examples: {
      username: {
        summary: 'Example of a login request (username)',
        value: {
          login: 'test',
          password: 'password',
        },
      },
      email: {
        summary: 'Example of a login request (email)',
        value: {
          login: 'test@example.com',
          password: 'password',
        },
      },
    },
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiOperation({
    summary: 'Login a user based on the provided data',
  })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
