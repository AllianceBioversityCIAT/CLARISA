import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import {
  DEFAULT_VALIDATE_RATE_LIMIT,
  DEFAULT_VALIDATE_RATE_WINDOW_MS,
} from '../constants/api-key-auth.constants';

interface RateBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class ApiKeyValidateRateLimitGuard implements CanActivate {
  private readonly _buckets = new Map<string, RateBucket>();
  private readonly _limit = Number(
    process.env.API_KEY_VALIDATE_RATE_LIMIT ?? DEFAULT_VALIDATE_RATE_LIMIT,
  );
  private readonly _windowMs = Number(
    process.env.API_KEY_VALIDATE_RATE_WINDOW_MS ??
      DEFAULT_VALIDATE_RATE_WINDOW_MS,
  );

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this._resolveClientIp(request);
    const now = Date.now();
    const bucket = this._buckets.get(ip);

    if (!bucket || now >= bucket.resetAt) {
      this._buckets.set(ip, { count: 1, resetAt: now + this._windowMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > this._limit) {
      throw new HttpException(
        'Too many validation requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private _resolveClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }
}
