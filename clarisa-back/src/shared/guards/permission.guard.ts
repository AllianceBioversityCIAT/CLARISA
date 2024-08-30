import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from '../../api/user/entities/user.entity';
import { UserService } from '../../api/user/user.service';
import { IS_CLARISA_PAGE } from '../decorators/clarisa-page.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private userService: UserService;
  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {
    this.userService = this.moduleRef.get(UserService, { strict: false });
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isClarisaPage: boolean | undefined = this.reflector.get<boolean>(
      IS_CLARISA_PAGE,
      context.getClass(),
    );
    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;
    const route = request.originalUrl as string;

    return this.userService
      .findOneByEmail(userPayload.email)
      .then((userDb: User) => {
        if (isClarisaPage) {
          //TODO extract this magic constant
          return userDb.id === 3043;
        }

        const isRoutePermitted = (userDb.permissions ?? []).some((p) =>
          route.includes(p),
        );
        if (!isRoutePermitted) {
          this._logger.error(
            `User ${userDb.email} tried to access route ${route} without permission`,
          );
        }

        return isRoutePermitted;
      });
  }
}
