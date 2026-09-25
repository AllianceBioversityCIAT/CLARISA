import { ApiKeyUsageMetricsService } from './api-key-usage-metrics.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * The two aggregates added on 2026-09-24 for the redesigned Usage panel:
 * `getEndpointUsage` (endpoint × consumers) and `getMisActivity` (last use per
 * MIS). The query builders are mocked; what is tested is the merge and the
 * shape the panel relies on.
 */
function queryBuilder(rows: any[]) {
  const qb: any = {};
  for (const method of [
    'select',
    'addSelect',
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'limit',
    'offset',
  ]) {
    qb[method] = jest.fn(() => qb);
  }
  qb.getRawMany = jest.fn(async () => rows);
  qb.getRawOne = jest.fn(async () => rows[0]);
  return qb;
}

describe('ApiKeyUsageMetricsService — endpoint and MIS aggregates', () => {
  it('getEndpointUsage merges the consumers of each endpoint and totals them', async () => {
    const endpointRows = [
      {
        microservice_name: 'clarisa-api',
        endpoint: '/api/institutions',
        http_method: 'GET',
        total_requests: '120',
        error_count: '2',
        avg_response_time_ms: '87.4',
        unique_api_keys: '2',
        last_used_at: new Date('2026-09-24T10:00:00Z'),
      },
      {
        microservice_name: 'reports',
        endpoint: '/api/email/send',
        http_method: 'POST',
        total_requests: '5',
        error_count: null,
        avg_response_time_ms: null,
        unique_api_keys: '1',
        last_used_at: null,
      },
    ];
    const consumerRows = [
      {
        microservice_name: 'clarisa-api',
        endpoint: '/api/institutions',
        http_method: 'GET',
        api_key_id: '1',
        api_key_name: 'Reporting Tool',
        key_prefix: 'cl_prod_abc',
        mis_id: '3',
        mis_acronym: 'PRMS',
        total_requests: '100',
        last_used_at: new Date('2026-09-24T10:00:00Z'),
      },
      {
        microservice_name: 'clarisa-api',
        endpoint: '/api/institutions',
        http_method: 'GET',
        api_key_id: '2',
        api_key_name: 'STAR',
        key_prefix: 'cl_prod_def',
        mis_id: null,
        mis_acronym: null,
        total_requests: '20',
        last_used_at: new Date('2026-09-20T10:00:00Z'),
      },
      {
        microservice_name: 'reports',
        endpoint: '/api/email/send',
        http_method: 'POST',
        api_key_id: '1',
        api_key_name: 'Reporting Tool',
        key_prefix: 'cl_prod_abc',
        mis_id: '3',
        mis_acronym: 'PRMS',
        total_requests: '5',
        last_used_at: null,
      },
    ];

    const logRepository: any = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(queryBuilder(endpointRows))
        .mockReturnValueOnce(queryBuilder(consumerRows)),
    };
    const service = new ApiKeyUsageMetricsService({} as any, logRepository);

    const result = await service.getEndpointUsage({
      from: '2026-09-01',
      to: '2026-09-24',
    });

    expect(result.total_requests).toBe(125);
    expect(result.items).toHaveLength(2);

    const [institutions, email] = result.items;
    expect(institutions).toMatchObject({
      microservice_name: 'clarisa-api',
      endpoint: '/api/institutions',
      http_method: 'GET',
      total_requests: 120,
      error_count: 2,
      avg_response_time_ms: 87,
      unique_api_keys: 2,
    });
    expect(institutions.consumers.map((c) => c.api_key_name)).toEqual([
      'Reporting Tool',
      'STAR',
    ]);
    expect(institutions.consumers[1]).toMatchObject({
      api_key_id: 2,
      mis_id: null,
      mis_acronym: null,
      total_requests: 20,
    });

    expect(email).toMatchObject({
      error_count: 0,
      avg_response_time_ms: null,
      last_used_at: null,
    });
    expect(email.consumers).toHaveLength(1);
  });

  it('getEndpointUsage returns an empty page without a second query when nothing was logged', async () => {
    const logRepository: any = {
      createQueryBuilder: jest.fn().mockReturnValueOnce(queryBuilder([])),
    };
    const service = new ApiKeyUsageMetricsService({} as any, logRepository);

    const result = await service.getEndpointUsage({});

    expect(result.items).toEqual([]);
    expect(result.total_requests).toBe(0);
    expect(logRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('getMisActivity maps one row per MIS and labels the unassigned bucket', async () => {
    const rows = [
      {
        mis_id: '3',
        mis_acronym: 'PRMS',
        mis_name: 'Performance Results Management System',
        total_keys: '4',
        active_keys: '3',
        usage_count: '13004',
        last_used_at: new Date('2026-09-24T09:00:00Z'),
      },
      {
        mis_id: null,
        mis_acronym: null,
        mis_name: null,
        total_keys: '1',
        active_keys: '0',
        usage_count: null,
        last_used_at: null,
      },
    ];
    const apiKeyRepository: any = {
      createQueryBuilder: jest.fn().mockReturnValueOnce(queryBuilder(rows)),
    };
    const service = new ApiKeyUsageMetricsService(apiKeyRepository, {} as any);

    const result = await service.getMisActivity();

    expect(result).toEqual([
      {
        mis_id: 3,
        mis_acronym: 'PRMS',
        mis_name: 'Performance Results Management System',
        total_keys: 4,
        active_keys: 3,
        usage_count: 13004,
        last_used_at: rows[0].last_used_at,
      },
      {
        mis_id: null,
        mis_acronym: '—',
        mis_name: 'Unassigned',
        total_keys: 1,
        active_keys: 0,
        usage_count: 0,
        last_used_at: null,
      },
    ]);
  });

  // The MySQL driver replaces EVERY `?` of the SQL text with a parameter,
  // including one inside a string literal. A `'?'` in a raw expression took
  // the `from` date and broke `usage/endpoints` on clarisatest (2026-09-25).
  it('never writes a literal question mark into the raw SQL of this service', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'api-key-usage-metrics.service.ts'),
      'utf8',
    );
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/'\?'/);
  });

  it('getOverview returns systems, series and heatmap with numbers, and labels the no-MIS bucket', async () => {
    const systems = [
      {
        mis_id: '3',
        acronym: 'PRMS',
        name: 'PRMS',
        environment: 'PROD',
        calls: '120',
        errors: '2',
        avg_ms: '180.4',
        api_keys: '2',
        last_used_at: new Date('2026-09-24T10:00:00Z'),
      },
      {
        mis_id: null,
        acronym: null,
        name: null,
        environment: null,
        calls: '5',
        errors: null,
        avg_ms: null,
        api_keys: '1',
        last_used_at: null,
      },
    ];
    const series = [
      {
        bucket: '2026-09-22',
        mis_id: '3',
        calls: '60',
        errors: '1',
        avg_ms: '170',
      },
    ];
    const heat = [{ dow: '2', hour: '10', mis_id: '3', calls: '40' }];
    const qbs = [
      queryBuilder(systems),
      queryBuilder(series),
      queryBuilder(heat),
    ];
    const logRepository: any = {
      createQueryBuilder: jest.fn(() => qbs.shift()),
    };
    const service = new ApiKeyUsageMetricsService({} as any, logRepository);

    const result = await service.getOverview({
      from: '2026-09-01',
      to: '2026-09-25',
      granularity: 'week',
    });

    expect(result.granularity).toBe('week');
    expect(result.systems).toEqual([
      {
        mis_id: 3,
        acronym: 'PRMS',
        name: 'PRMS',
        environment: 'PROD',
        calls: 120,
        errors: 2,
        avg_response_time_ms: 180,
        api_keys: 2,
        last_used_at: systems[0].last_used_at,
      },
      {
        mis_id: null,
        acronym: 'No MIS',
        name: 'Keys not linked to any system',
        environment: null,
        calls: 5,
        errors: 0,
        avg_response_time_ms: null,
        api_keys: 1,
        last_used_at: null,
      },
    ]);
    expect(result.series).toEqual([
      {
        bucket: '2026-09-22',
        mis_id: 3,
        calls: 60,
        errors: 1,
        avg_response_time_ms: 170,
      },
    ]);
    expect(result.heatmap).toEqual([
      { day_of_week: 2, hour: 10, mis_id: 3, calls: 40 },
    ]);
  });

  it('mis_ids narrows the log query to several systems, «0» meaning no MIS', async () => {
    const qb = queryBuilder([]);
    const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
    const service = new ApiKeyUsageMetricsService({} as any, logRepository);

    await service.getLogs({ mis_ids: '3,7,0' } as any);
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(ak.mis_id IN (:...misIds) OR ak.mis_id IS NULL)',
      { misIds: [3, 7] },
    );

    qb.andWhere.mockClear();
    await service.getLogs({ mis_ids: '3,3' } as any);
    expect(qb.andWhere).toHaveBeenCalledWith('ak.mis_id IN (:...misIds)', {
      misIds: [3],
    });

    qb.andWhere.mockClear();
    await service.getLogs({ mis_ids: '0' } as any);
    expect(qb.andWhere).toHaveBeenCalledWith('ak.mis_id IS NULL');
  });
});
