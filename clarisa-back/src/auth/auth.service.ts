import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';
import { BaseAuthenticator } from './utils/interface/BaseAuthenticator';
import { LDAPAuth } from './utils/LDAPAuth';
import { DBAuth } from './utils/DBAuth';
import { UserService } from '../api/user/user.service';
import { User } from '../api/user/entities/user.entity';
import { LoginResponseDto } from './dto/login-response.dto';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { BaseHttpError } from '../shared/errors/base-http-error';
import { ResponseDto } from '../shared/entities/dtos/response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private moduleRef: ModuleRef,
  ) {}

  async validateUser(login: string, pass: string) {
    login = login.trim().toLowerCase();
    const user: User = await this.usersService
      .findOneByEmail(login, false)
      .catch(() => {
        return this.usersService
          .findOneByUsername(login, false)
          .catch((error) => {
            throw ResponseDto.buildCustomResponse(
              error.additionalData,
              error.message,
              error.status,
            );
          });
      });

    const authenticator: BaseAuthenticator = this.moduleRef.get(
      user.is_cgiar_user ? LDAPAuth : DBAuth,
    );

    return authenticator
      .authenticate(user.email, pass)
      .catch((error) => {
        if (error instanceof BaseHttpError) {
          throw ResponseDto.buildCustomResponse(
            error.additionalData,
            error.message,
            error.status,
          );
        }
      })
      .then(() => {
        return user;
      });
  }

  async login(user: User): Promise<LoginResponseDto> {
    const payload = {
      login: user.email,
      sub: user.id,
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
