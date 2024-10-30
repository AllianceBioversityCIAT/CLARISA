import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { User } from '../../api/user/entities/user.entity';
import { UserService } from '../../api/user/user.service';
import { BaseMessageDTO } from './BaseMessageDTO';
import { BCryptPasswordEncoder } from './BCryptPasswordEncoder';
import { BaseAuthenticator } from './interface/BaseAuthenticator';
import { BasePasswordEncoder } from './interface/BasePasswordEncoder';
import { LegacyPasswordEncoder } from './LegacyPasswordEncoder';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';

@Injectable()
export class DBAuth extends BaseAuthenticator {
  @Inject()
  private usersService: UserService;

  private passwordEncoder: BasePasswordEncoder;
  private readonly errorDto: BaseMessageDTO = {
    name: 'INVALID_CREDENTIALS',
    description: 'The supplied credentials are invalid',
  };

  constructor(private moduleRef: ModuleRef) {
    super(DBAuth.name);
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    this._logger.verbose(`Trying DB login of user: ${username}`);
    return this.usersService
      .findOneByEmail(username, false)
      .catch((err) => {
        this._logger.error(err);
        throw new UnauthorizedError(this.errorDto.description, this.errorDto);
      })
      .then((user: User) => {
        const userPass: string = user.password;

        this.passwordEncoder = this.moduleRef.get(
          this.isLegacyPassword(user.password)
            ? LegacyPasswordEncoder
            : BCryptPasswordEncoder,
        );

        if (this.passwordEncoder.matches(userPass, password)) {
          return true;
        } else {
          throw new UnauthorizedError(this.errorDto.description, this.errorDto);
        }
      });
  }

  public isLegacyPassword(incomingPassword: string): boolean {
    const splitCount = incomingPassword.split('$').length;
    return splitCount !== 4;
  }
}
