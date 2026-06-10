import { Request } from 'express';
import { API_KEY_HEADER } from '../../api/api-key/constants/api-key-auth.constants';

export function readApiKeyHeader(request: Request): string | undefined {
  const raw = request.headers[API_KEY_HEADER];
  if (Array.isArray(raw)) {
    const value = raw[0]?.trim();
    return value || undefined;
  }
  const value = typeof raw === 'string' ? raw.trim() : undefined;
  return value || undefined;
}
