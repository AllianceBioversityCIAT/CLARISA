import { EventEmitter } from 'events';
import { lastValueFrom, of } from 'rxjs';
import { OptionalApiKeyUsageInterceptor } from './optional-api-key-usage.interceptor';

describe('OptionalApiKeyUsageInterceptor (unit)', () => {
  const build = () => {
    const apiKeys = { validate: jest.fn() };
    const usageLog = { recordUsageAsync: jest.fn() };
    const interceptor = new OptionalApiKeyUsageInterceptor(
      apiKeys as any,
      usageLog as any,
    );
    return { interceptor, apiKeys, usageLog };
  };
  const httpContext = (headers: Record<string, string>, response: any) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          method: 'GET',
          originalUrl: `/api/concepts/meliaf/concepts?q=${'x'.repeat(600)}`,
          ip: '10.0.0.9',
        }),
        getResponse: () => response,
      }),
    }) as any;
  const next = { handle: () => of('answer') };

  it('lets a non-HTTP context through without looking at it', async () => {
    const { interceptor, apiKeys } = build();
    const ctx = { getType: () => 'rpc' } as any;
    await expect(
      lastValueFrom(await interceptor.intercept(ctx, next)),
    ).resolves.toBe('answer');
    expect(apiKeys.validate).not.toHaveBeenCalled();
  });

  it('never throws when the headers are already sent for an invalid key', async () => {
    const { interceptor, apiKeys } = build();
    apiKeys.validate.mockResolvedValue({ valid: false });
    const response = {
      headersSent: true,
      setHeader: jest.fn(() => {
        throw new Error('ERR_HTTP_HEADERS_SENT');
      }),
    };
    const obs = await interceptor.intercept(
      httpContext({ 'x-api-key': 'cl_test_abcdefghijklmnop' }, response),
      next,
    );
    await expect(lastValueFrom(obs)).resolves.toBe('answer');
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('records once on finish, clipping the path to the log column', async () => {
    const { interceptor, apiKeys, usageLog } = build();
    apiKeys.validate.mockResolvedValue({ valid: true, api_key_id: 4 });
    const response: any = Object.assign(new EventEmitter(), {
      statusCode: 200,
      headersSent: false,
      setHeader: jest.fn(),
    });
    const obs = await interceptor.intercept(
      httpContext({ 'x-api-key': 'cl_test_abcdefghijklmnop' }, response),
      next,
    );
    await lastValueFrom(obs);
    expect(usageLog.recordUsageAsync).not.toHaveBeenCalled();
    response.emit('finish');
    response.emit('finish');
    expect(usageLog.recordUsageAsync).toHaveBeenCalledTimes(1);
    const row = usageLog.recordUsageAsync.mock.calls[0][0];
    expect(row.endpoint_accessed).toHaveLength(500);
    expect(row.ip_address).toBe('10.0.0.9');
  });
});
