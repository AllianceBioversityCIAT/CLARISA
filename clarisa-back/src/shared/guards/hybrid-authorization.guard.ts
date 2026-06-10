import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable, isObservable, lastValueFrom } from 'rxjs';
import { API_KEY_AUTH_CONTEXT_KEY } from '../../api/api-key/constants/api-key-auth.constants';
import { PermissionGuard } from './permission.guard';

/**
 * JWT callers: existing PermissionGuard (DB route permissions).
 * API-key callers: authorization already enforced by ApiKeyGuard + @RequireApiKeyScope.
 */
@Injectable()
export class HybridAuthorizationGuard implements CanActivate {
  constructor(private readonly _permissionGuard: PermissionGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request[API_KEY_AUTH_CONTEXT_KEY]) {
      return true;
    }

    return this._resolveGuardResult(this._permissionGuard.canActivate(context));
  }

  private async _resolveGuardResult(
    result: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (isObservable(result)) {
      return lastValueFrom(result);
    }
    return result;
  }
}
