import { Request } from 'express';

/**
 * Client IP as the API-key checks see it: the first `X-Forwarded-For` hop
 * (the load balancer adds the rest), else the socket address. Shared by
 * `ApiKeyGuard` and `OptionalApiKeyUsageInterceptor` so both apply the same
 * IP allow-list rule and log the same address.
 */
export function resolveClientIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip ?? request.socket?.remoteAddress ?? undefined;
}
