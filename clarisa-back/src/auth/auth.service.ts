import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';
import { BaseAuthenticator } from './utils/interface/BaseAuthenticator';
import { LDAPAuth } from './utils/LDAPAuth';
import { DBAuth } from './utils/DBAuth';
import { BaseMessageDTO } from './utils/BaseMessageDTO';
import { UserService } from '../api/user/user.service';
import { User } from '../api/user/entities/user.entity';

@Injectable()
export class AuthService {
  /**
   * The single answer to «those credentials do not work».
   *
   * 🛑 One object, used by every failing path on purpose. Before this, the three
   * ways of failing answered three different things — an unknown login got a 401
   * with `{statusCode, message}`, a wrong database password got the generic
   * `Unauthorized` of the passport guard, and a wrong LDAP password got a **500**
   * whose body said `SERVER_NOT_FOUND`. Any of those differences tells an
   * attacker which logins exist, and the 500 told every consumer of the API that
   * CLARISA had broken when all that happened is that someone mistyped.
   *
   * The wording never says whether the account exists, and it must stay that way.
   */
  private static readonly INVALID_CREDENTIALS: BaseMessageDTO = {
    name: 'INVALID_CREDENTIALS',
    description:
      'Invalid credentials. Please check the provided login data and try again.',
    httpCode: HttpStatus.UNAUTHORIZED,
  };

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

    if (!user) {
      throw AuthService.invalidCredentials();
    }

    const authenticator: BaseAuthenticator = this.moduleRef.get(
      user.is_cgiar_user ? LDAPAuth : DBAuth,
    );

    const authResult: boolean | BaseMessageDTO = await authenticator
      .authenticate(user.email, pass)
      .catch((err) => {
        throw AuthService.asHttpException(err);
      });

    // Only a plain `true` is a successful authentication. Everything else is the
    // authenticator's own failure DTO — `DBAuth` *resolves* it instead of
    // rejecting, and that used to fall through this method returning `undefined`,
    // so the answer came from the passport guard as a bare `Unauthorized`.
    if (authResult !== true) {
      throw AuthService.invalidCredentials();
    }

    return user;
  }

  async login(user: User) {
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

  /** 401 with the shared body. Built fresh so no caller can mutate the constant. */
  private static invalidCredentials(): HttpException {
    return new HttpException(
      { ...AuthService.INVALID_CREDENTIALS },
      HttpStatus.UNAUTHORIZED,
    );
  }

  /**
   * An authenticator rejection, turned into the response the client sees.
   *
   * A credential failure is collapsed into the shared 401 so it is impossible to
   * tell it apart from an unknown login. Anything else —directory unreachable, a
   * misconfigured bind, an unexpected throw— keeps its own status, because those
   * really are server problems and hiding them behind a 401 would send whoever
   * is affected to retype a password that was never the issue.
   */
  private static asHttpException(err: any): HttpException {
    if (err instanceof HttpException) {
      return err;
    }

    if (
      err?.httpCode === HttpStatus.UNAUTHORIZED ||
      err?.name === 'INVALID_CREDENTIALS'
    ) {
      return AuthService.invalidCredentials();
    }

    // `err.httpCode` used to be passed straight to `HttpException`, so anything
    // that was not a `BaseMessageDTO` — a TypeError, a driver error — produced an
    // exception with an undefined status.
    return new HttpException(
      err,
      typeof err?.httpCode === 'number'
        ? err.httpCode
        : HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
