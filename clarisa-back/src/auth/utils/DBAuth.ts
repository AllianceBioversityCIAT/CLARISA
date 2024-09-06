import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { User } from '../../api/user/entities/user.entity';
import { UserService } from '../../api/user/user.service';
import { BCryptPasswordEncoder } from './BCryptPasswordEncoder';
import { BaseAuthenticator } from './interface/BaseAuthenticator';
import { BasePasswordEncoder } from './interface/BasePasswordEncoder';
import { LegacyPasswordEncoder } from './LegacyPasswordEncoder';
import { Immutable } from '../../shared/utils/deep-immutable';
import { DBError } from '../../shared/errors/db.error';

@Injectable()
export class DBAuth implements BaseAuthenticator {
  private passwordEncoder!: BasePasswordEncoder;

  constructor(
    private moduleRef: Immutable<ModuleRef>,
    private userService: Immutable<UserService>,
  ) {}

  authenticate(username: string, password: string): Promise<boolean> {
    return this.userService
      .findOneByEmail(username, false)
      .then((user: Immutable<User | null>) => {
        const userPass = user?.password;

        if (!userPass) {
          return false;
        }

        this.passwordEncoder = this.moduleRef.get(
          this.isLegacyPassword(userPass)
            ? LegacyPasswordEncoder
            : BCryptPasswordEncoder,
        );

        return this.passwordEncoder.matches(userPass, password);
      })
      .catch((err: unknown) => {
        throw new DBError(err);
      });
  }

  public isLegacyPassword(incomingPassword: string): boolean {
    const newLocal = incomingPassword.split('$').length;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return newLocal !== 4;
  }
}
