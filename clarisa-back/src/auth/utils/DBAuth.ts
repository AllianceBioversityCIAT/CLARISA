import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { User } from '../../api/user/entities/user.entity';
import { UserService } from '../../api/user/user.service';
import { BaseMessageDTO } from './BaseMessageDTO';
import { BCryptPasswordEncoder } from './BCryptPasswordEncoder';
import { BaseAuthenticator } from './interface/BaseAuthenticator';
import { BasePasswordEncoder } from './interface/BasePasswordEncoder';
import { LegacyPasswordEncoder } from './LegacyPasswordEncoder';

@Injectable()
export class DBAuth implements BaseAuthenticator {
  @Inject()
  private usersService: UserService;

  private passwordEncoder: BasePasswordEncoder;
  private readonly errorDto: BaseMessageDTO = {
    name: 'INVALID_CREDENTIALS',
    description: 'The supplied credentials are invalid',
    httpCode: 401,
  };

  constructor(private moduleRef: ModuleRef) {}

  authenticate(
    username: string,
    password: string,
  ): Promise<boolean | BaseMessageDTO> {
    return this.usersService
      .findOneByEmailWithPassword(username)
      .then((user: User) => {
        const userPass: string = user?.password;
        if (!userPass) {
          return this.errorDto;
        }

        this.passwordEncoder = this.moduleRef.get(
          this.isLegacyPassword(user.password)
            ? LegacyPasswordEncoder
            : BCryptPasswordEncoder,
        );

        if (this.passwordEncoder.matches(userPass, password)) {
          return true;
        } else {
          return this.errorDto;
        }
      });
  }

  public isLegacyPassword(incomingPassword: string): boolean {
    const newLocal = incomingPassword.split('$').length;
    return newLocal !== 4;
  }
}
