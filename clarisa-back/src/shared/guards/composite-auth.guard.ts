import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Observable, isObservable, lastValueFrom } from 'rxjs';
import { Request } from 'express';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { readApiKeyHeader } from '../utils/read-api-key-header';

/**
 * Accepts either X-API-Key (platform / microservice) or JWT (panel users).
 * When X-API-Key is present it takes precedence; otherwise the existing JWT flow runs unchanged.
 */
@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private readonly _apiKeyGuard: ApiKeyGuard,
    private readonly _jwtAuthGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (readApiKeyHeader(request)) {
      return this._apiKeyGuard.canActivate(context);
    }

    return this._resolveGuardResult(this._jwtAuthGuard.canActivate(context));
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
