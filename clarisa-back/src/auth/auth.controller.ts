import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../shared/guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiBody({
    type: LoginDto,
    required: true,
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
