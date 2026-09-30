import { AsyncLocalStorage } from 'async_hooks';

/** The platform behind a request that carried a valid, active API key. */
export interface ApiKeyCaller {
  api_key_id: number;
  mis_id?: number;
}

/**
 * Request-scoped marker set by `OptionalApiKeyUsageInterceptor` on the public
 * routes, so code deep inside a read (the anonymous usage counters) can tell
 * a platform's read from an anonymous one without every service taking the
 * request as a parameter. Empty outside such a request.
 */
export const apiKeyCallerContext = new AsyncLocalStorage<ApiKeyCaller>();

export const currentApiKeyCaller = (): ApiKeyCaller | undefined =>
  apiKeyCallerContext.getStore();
