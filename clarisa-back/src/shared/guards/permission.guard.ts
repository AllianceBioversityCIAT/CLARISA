import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { User } from '../../api/user/entities/user.entity';
import { UserService } from '../../api/user/user.service';
import { IS_CLARISA_PAGE } from '../decorators/clarisa-page.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly _logger = new Logger(PermissionGuard.name);
  private userService: UserService;

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isClarisaPage: boolean | undefined = this.reflector.get<boolean>(
      IS_CLARISA_PAGE,
      context.getClass(),
    );
    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;
    // `originalUrl` carries the query string in Express, and the permission
    // check below is a substring match, so anything the caller appends to the
    // URL would be compared against their own permissions: appending
    // `?x=/api/countries` made any route look permitted to a user whose only
    // permission was `/api/countries`. Only the path is authorised. Dropping
    // characters can never grant a permission that is denied today, so this is
    // strictly more restrictive than the previous behaviour.
    const originalUrl = request.originalUrl as string;
    const route = originalUrl?.split('?')[0] ?? originalUrl;

    if (!userPayload?.email) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const userDb: User = await this._getUserService().findOneByEmail(
      userPayload.email,
    );

    if (!userDb) {
      throw new UnauthorizedException('Authenticated user was not found');
    }

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
      throw new ForbiddenException(
        `User is not permitted to access route ${route}`,
      );
    }

    return true;
  }

  private _getUserService(): UserService {
    if (!this.userService) {
      this.userService = this.moduleRef.get(UserService, { strict: false });
    }
    if (!this.userService) {
      throw new UnauthorizedException('User service is unavailable');
    }
    return this.userService;
  }
}
