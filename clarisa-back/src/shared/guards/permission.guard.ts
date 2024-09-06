import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from '../../api/user/entities/user.entity';
import { UserService } from '../../api/user/user.service';
import { IS_CLARISA_PAGE } from '../decorators/clarisa-page.decorator';
import { Immutable } from '../utils/deep-immutable';
import { Request } from 'express';

@Injectable()
export class PermissionGuard implements CanActivate {
  private userService: UserService;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  private readonly CLARISA_ADMIN_ID = 3043;
  constructor(
    private reflector: Immutable<Reflector>,
    private moduleRef: Immutable<ModuleRef>,
  ) {
    this.userService = this.moduleRef.get(UserService, { strict: false });
  }

  canActivate(
    context: Immutable<ExecutionContext>,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isClarisaPage: boolean | undefined = this.reflector.get<boolean>(
      IS_CLARISA_PAGE,
      context.getClass(),
    );
    const request: Request = context.switchToHttp().getRequest();
    const userPayload = request.user as User;
    const route = request.originalUrl;

    return this.userService
      .findOneByEmail(userPayload.email)
      .then((userDb: Immutable<User>) => {
        if (isClarisaPage) {
          //TODO extract this magic constant
          return userDb.id === this.CLARISA_ADMIN_ID;
        }

        return (userDb.permissions ?? []).some((p) => route.includes(p));
      });
  }
}
