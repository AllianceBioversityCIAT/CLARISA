import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';
import { BaseAuthenticator } from './utils/interface/BaseAuthenticator';
import { LDAPAuth } from './utils/LDAPAuth';
import { DBAuth } from './utils/DBAuth';
import { UserService } from '../api/user/user.service';
import { User } from '../api/user/entities/user.entity';
import { Immutable } from '../shared/utils/deep-immutable';
import { DBError } from '../shared/errors/db.error';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: Immutable<UserService>,
    private readonly jwtService: Immutable<JwtService>,
    private readonly moduleRef: Immutable<ModuleRef>,
  ) {}

  async validateUser(login: string, pass: string): Promise<User | undefined> {
    const cleanedLogin = login.trim().toLowerCase();
    const user: User | null =
      (await this.usersService.findOneByEmail(cleanedLogin, false)) ??
      (await this.usersService.findOneByUsername(cleanedLogin, false));
    let authenticator: BaseAuthenticator;

    if (user) {
      authenticator = this.moduleRef.get(
        user.is_cgiar_user ? LDAPAuth : DBAuth,
      );
      const authResult: boolean = await authenticator
        .authenticate(user.email, pass)
        .catch((err: unknown) => {
          throw new HttpException(
            err as Record<string, unknown>,
            err instanceof DBError
              ? HttpStatus.UNAUTHORIZED
              : HttpStatus.INTERNAL_SERVER_ERROR,
          );
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

  login(user: Immutable<User>): LoginDto {
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
        permissions: [...(user.permissions ?? [])],
        email: user.email,
        id: user.id,
      },
    };
  }
}
