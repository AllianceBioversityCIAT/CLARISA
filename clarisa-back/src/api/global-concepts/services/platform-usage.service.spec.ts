import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CONCEPTS_ENDPOINT_PREFIXES,
  PlatformUsageService,
} from './platform-usage.service';

const day = (offset = 0) =>
  new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

describe('PlatformUsageService', () => {
  const system = (mis_id: number | null, calls: number) => ({
    mis_id,
    acronym: mis_id ? `MIS${mis_id}` : 'No MIS',
    name: 'x',
    environment: 'TEST',
    calls,
    errors: 0,
    avg_response_time_ms: 10,
    api_keys: 1,
    last_used_at: null,
  });
  const build = (systems = [system(3, 12), system(null, 3)]) => {
    const metrics = {
      getSystemsForEndpoints: jest.fn(async () => ({
        period: { from: 'a', to: 'b' },
        systems,
      })),
    };
    const usage = {
      countedReads: jest.fn(async () => ({
        total: 40,
        keyed: 9,
        anonymous: 31,
      })),
    };
    const loader = {
      scheme: jest.fn(async (_m: unknown, code: string) => {
        if (code !== 'concepts') throw new NotFoundException();
        return { id: 1, code };
      }),
    };
    const service = new PlatformUsageService(
      metrics as any,
      usage as any,
      loader as any,
      { manager: {} } as any,
    );
    return { service, metrics, usage, loader };
  };

  it('narrows the key log to Concepts paths and adds the anonymous line', async () => {
    const { service, metrics, usage } = build();
    const out = await service.byPlatform('concepts', {
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(metrics.getSystemsForEndpoints).toHaveBeenCalledWith(
      { from: '2026-09-01T00:00:00', to: '2026-09-30T00:00:00' },
      [
        '/api/meliaf-taxonomy/',
        '/meliaf-taxonomy/',
        '/api/concepts/',
        '/concepts/',
        '/api/global-concepts/',
      ],
    );
    expect(usage.countedReads).toHaveBeenCalledWith('2026-09-01', '2026-09-30');
    expect(out).toMatchObject({
      scope: 'all-schemes',
      from: '2026-09-01',
      to: '2026-09-30',
      platform_calls: 15,
      counted_reads: { total: 40, keyed: 9, anonymous: 31 },
    });
    expect(out.systems).toHaveLength(2);
    expect(out.endpoint_prefixes).toEqual(CONCEPTS_ENDPOINT_PREFIXES);
  });

  it('defaults to the last 30 days, today included, and honours days', async () => {
    const { service, usage } = build();
    await service.byPlatform('concepts');
    expect(usage.countedReads).toHaveBeenLastCalledWith(day(29), day(0));
    await service.byPlatform('concepts', { days: '7' });
    expect(usage.countedReads).toHaveBeenLastCalledWith(day(6), day(0));
    await service.byPlatform('concepts', { days: '9999' });
    expect(usage.countedReads).toHaveBeenLastCalledWith(day(364), day(0));
  });

  it('answers an empty period with no systems and zero calls', async () => {
    const { service } = build([]);
    const out = await service.byPlatform('concepts', { days: 7 });
    expect(out.systems).toEqual([]);
    expect(out.platform_calls).toBe(0);
  });

  it.each([
    [{ from: '2026-9-1', to: '2026-09-30' }],
    [{ from: '2026-02-30', to: '2026-03-01' }],
    [{ from: '2026-09-30', to: '2026-09-01' }],
  ])('refuses a bad period %j with 400', async (q) => {
    const { service, metrics } = build();
    await expect(service.byPlatform('concepts', q)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(metrics.getSystemsForEndpoints).not.toHaveBeenCalled();
  });

  it('404s an unknown scheme before reading anything', async () => {
    const { service, metrics } = build();
    await expect(service.byPlatform('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(metrics.getSystemsForEndpoints).not.toHaveBeenCalled();
  });
});
