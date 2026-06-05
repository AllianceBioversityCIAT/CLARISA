import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeyService } from '../../api/api-key/api-key.service';
import {
  API_KEY_AUTH_CONTEXT_KEY,
  API_KEY_HEADER,
} from '../../api/api-key/constants/api-key-auth.constants';
import { ApiKeyAuthContext } from '../../api/api-key/interfaces/api-key-auth-context';
import { REQUIRE_API_KEY_SCOPE } from '../decorators/require-api-key-scope.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly _apiKeyService: ApiKeyService,
    private readonly _reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this._readApiKeyHeader(request);

    if (!apiKey) {
      throw new UnauthorizedException({
        valid: false,
        error: 'Missing X-API-Key header',
      });
    }

    const requiredScope = this._reflector.get<string | undefined>(
      REQUIRE_API_KEY_SCOPE,
      context.getHandler(),
    );

    const result = await this._apiKeyService.validate(
      {
        api_key: apiKey,
        required_scope: requiredScope,
        microservice_name: 'clarisa-api',
        endpoint_accessed: request.originalUrl ?? request.url,
        ip_address: this._resolveClientIp(request),
      },
      {
        clientIp: this._resolveClientIp(request),
        httpMethod: request.method,
        userAgent: request.headers['user-agent'] as string | undefined,
        recordUsage: true,
      },
    );

    if (!result.valid) {
      throw new UnauthorizedException(result);
    }

    const authContext: ApiKeyAuthContext = {
      api_key_id: result.api_key_id!,
      key_prefix: result.key_prefix!,
      mis_id: result.mis?.id,
      mis: result.mis,
      environment: result.environment,
      scopes: result.scopes,
    };

    (request as Request & { [API_KEY_AUTH_CONTEXT_KEY]: ApiKeyAuthContext })[
      API_KEY_AUTH_CONTEXT_KEY
    ] = authContext;

    return true;
  }

  private _readApiKeyHeader(request: Request): string | undefined {
    const raw = request.headers[API_KEY_HEADER];
    if (Array.isArray(raw)) {
      return raw[0]?.trim();
    }
    return typeof raw === 'string' ? raw.trim() : undefined;
  }

  private _resolveClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? undefined;
  }
}
