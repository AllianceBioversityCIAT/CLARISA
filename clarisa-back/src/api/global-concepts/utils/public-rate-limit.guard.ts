import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

const WINDOW_MS = 60_000;
const PER_CLIENT = 120;
/** Backstop for everyone together: a spoofed X-Forwarded-For only dodges the per-client bucket. */
const GLOBAL = 1200;

/**
 * In-memory fixed-window limit for the anonymous, CPU-bound routes (text
 * suggestions and MCP). Per process, which is enough to stop one client from
 * saturating it; the real edge limit belongs to the CDN/load balancer.
 */
@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private window = 0;
  private total = 0;
  private hits = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const slot = Math.floor(now / WINDOW_MS);
    if (slot !== this.window) {
      this.window = slot;
      this.total = 0;
      this.hits.clear();
    }
    const forwarded = String(req.headers['x-forwarded-for'] ?? '')
      .split(',')[0]
      .trim();
    const client = forwarded || req.ip || 'unknown';
    const n = (this.hits.get(client) ?? 0) + 1;
    this.hits.set(client, n);
    this.total++;
    if (n > PER_CLIENT || this.total > GLOBAL) {
      throw new HttpException(
        'Too many requests; slow down and retry in a minute',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
