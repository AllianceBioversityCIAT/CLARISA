import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';
import { BaseAuthenticator } from './utils/interface/BaseAuthenticator';
import { LDAPAuth } from './utils/LDAPAuth';
import { DBAuth } from './utils/DBAuth';
import { BaseMessageDTO } from './utils/BaseMessageDTO';
import { UserService } from '../api/user/user.service';
import { User } from '../api/user/entities/user.entity';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private moduleRef: ModuleRef,
  ) {}

  async validateUser(login: string, pass: string) {
    login = login.trim().toLowerCase();
    const user: User =
      (await this.usersService.findOneByEmail(login, false)) ??
      (await this.usersService.findOneByUsername(login, false));
    let authenticator: BaseAuthenticator;

    if (user) {
      authenticator = this.moduleRef.get(
        user.is_cgiar_user ? LDAPAuth : DBAuth,
      );
      const authResult: boolean | BaseMessageDTO = await authenticator
        .authenticate(user.email, pass)
        .catch((err) => {
          throw new HttpException(err, err.httpCode);
        });
      if (authResult.constructor.name === Boolean.name) {
        return user;
      }
    } else {
      throw new HttpException(
        'Invalid credentials. Please check the provided login data and try again.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async login(user: User): Promise<LoginResponseDto> {
    const payload = {
      login: user.email,
      sub: user.id,
      permissions: user.permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        username: user.username,
        name: `${user.first_name} ${user.last_name}`,
        permissions: user.permissions,
        email: user.email,
        id: user.id,
      },
    };
  }
}
