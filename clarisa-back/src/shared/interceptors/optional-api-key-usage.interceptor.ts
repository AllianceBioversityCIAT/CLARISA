import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { ApiKeyService } from '../../api/api-key/api-key.service';
import { ApiKeyUsageLogService } from '../../api/api-key/api-key-usage-log.service';
import { readApiKeyHeader } from '../utils/read-api-key-header';
import { resolveClientIp } from '../utils/resolve-client-ip';
import {
  ApiKeyCaller,
  apiKeyCallerContext,
} from '../utils/api-key-caller-context';

/** Response header a public route adds when the key it received is not usable. */
export const API_KEY_STATUS_HEADER = 'X-Api-Key-Status';

/** Same service name `ApiKeyGuard` logs under, so both land in one bucket. */
const MICROSERVICE_NAME = 'clarisa-api';

/** Column widths of `api_key_usage_logs` (endpoint_accessed, user_agent). */
const MAX_LOGGED = 500;
const clip = (v: string | undefined) => v?.slice(0, MAX_LOGGED);

/**
 * Counts the platforms that read a PUBLIC route with their CLARISA API key
 * (Héctor, 2026-09-30: "revisar el uso de las plataformas conectadas a ese
 * end-point, no solo el uso del portal de búsqueda").
 *
 * The route stays public and answers exactly as before; the key only decides
 * whether the read is attributed to a platform:
 *
 * - no `X-API-Key` → nothing happens (anonymous, as always);
 * - a valid key (exists, active, not expired, IP allowed) → one row in
 *   `api_key_usage_logs`, the table `ApiKeyGuard` feeds, written once the
 *   response has finished so it carries the real status and latency;
 * - an unknown, revoked or expired key → the data is still served, nothing
 *   is recorded, and `X-Api-Key-Status: invalid` tells the platform. Never 401.
 *
 * Validation is `ApiKeyService.validate`, the one `ApiKeyGuard` uses; no scope
 * is required, because reading public data needs none: any valid key counts.
 * Nothing here can fail the request: every error is caught and logged.
 */
@Injectable()
export class OptionalApiKeyUsageInterceptor implements NestInterceptor {
  private readonly _logger = new Logger(OptionalApiKeyUsageInterceptor.name);

  constructor(
    private readonly _apiKeyService: ApiKeyService,
    private readonly _usageLogService: ApiKeyUsageLogService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const apiKey = readApiKeyHeader(request);
    if (!apiKey) return next.handle();

    const startedAt = Date.now();
    const caller = await this._identify(request, apiKey);
    if (caller === 'invalid') {
      this._markInvalid(response);
      return next.handle();
    }
    if (!caller) return next.handle();

    this._recordWhenFinished(request, response, caller, startedAt);
    // The handler (and every `await` inside it) runs inside the caller's
    // context: `handle()` binds its async resource where it is called.
    return apiKeyCallerContext.run(caller, () => next.handle());
  }

  /** `'invalid'` for a key that is not usable; `null` when it could not be checked. */
  private async _identify(
    request: Request,
    apiKey: string,
  ): Promise<ApiKeyCaller | 'invalid' | null> {
    try {
      const clientIp = resolveClientIp(request);
      const result = await this._apiKeyService.validate(
        {
          api_key: apiKey,
          microservice_name: MICROSERVICE_NAME,
          endpoint_accessed: request.originalUrl ?? request.url,
          ip_address: clientIp,
        },
        {
          clientIp,
          httpMethod: request.method,
          userAgent: request.headers['user-agent'] as string | undefined,
          // Written below, after the response, with its real status.
          recordUsage: false,
        },
      );
      if (!result?.valid || !result.api_key_id) return 'invalid';
      return { api_key_id: result.api_key_id, mis_id: result.mis?.id };
    } catch (err) {
      this._logger.warn(
        `API key not checked on ${request.method} ${request.originalUrl ?? request.url}: ${(err as Error)?.message ?? String(err)}`,
      );
      return null;
    }
  }

  private _markInvalid(response: Response): void {
    try {
      if (!response.headersSent)
        response.setHeader(API_KEY_STATUS_HEADER, 'invalid');
    } catch (err) {
      this._logger.warn(
        `${API_KEY_STATUS_HEADER} not set: ${(err as Error)?.message ?? String(err)}`,
      );
    }
  }

  private _recordWhenFinished(
    request: Request,
    response: Response,
    caller: ApiKeyCaller,
    startedAt: number,
  ): void {
    response.once('finish', () => {
      try {
        this._usageLogService.recordUsageAsync({
          api_key_id: caller.api_key_id,
          microservice_name: MICROSERVICE_NAME,
          endpoint_accessed: clip(request.originalUrl ?? request.url),
          http_method: request.method,
          status_code: response.statusCode,
          ip_address: resolveClientIp(request),
          user_agent: clip(request.headers['user-agent'] as string | undefined),
          response_time_ms: Date.now() - startedAt,
        });
      } catch (err) {
        this._logger.error(
          `API key usage not recorded for key ${caller.api_key_id}`,
          (err as Error)?.stack ?? String(err),
        );
      }
    });
  }
}
