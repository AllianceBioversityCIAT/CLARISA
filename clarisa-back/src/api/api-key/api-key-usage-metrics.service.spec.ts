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
      kind: 'key',
      system_key: 'key:2',
    });
    expect(institutions.consumers[0]).toMatchObject({
      kind: 'mis',
      system_key: 'mis:3',
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

  it('getOverview returns systems, series and heatmap with numbers; a nameless key keeps the old label', async () => {
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
        key_group_id: '8',
        key_name: '  ',
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
        kind: 'mis',
        api_key_id: null,
        api_key_name: null,
        system_key: 'mis:3',
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
        kind: 'key',
        api_key_id: 8,
        api_key_name: null,
        system_key: 'key:8',
      },
    ]);
    expect(result.series).toEqual([
      {
        bucket: '2026-09-22',
        mis_id: 3,
        calls: 60,
        errors: 1,
        avg_response_time_ms: 170,
        kind: 'mis',
        api_key_id: null,
        system_key: 'mis:3',
      },
    ]);
    expect(result.heatmap).toEqual([
      {
        day_of_week: 2,
        hour: 10,
        mis_id: 3,
        calls: 40,
        kind: 'mis',
        api_key_id: null,
        system_key: 'mis:3',
      },
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

  it('getSystemsForEndpoints narrows the Overview systems to some path prefixes, in the period', async () => {
    const qb = queryBuilder([
      {
        mis_id: '3',
        acronym: 'PRMS',
        name: 'Reporting',
        environment: 'PROD',
        calls: '12',
        errors: '1',
        avg_ms: '40.6',
        api_keys: '1',
        last_used_at: null,
      },
    ]);
    const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
    const service = new ApiKeyUsageMetricsService({} as any, logRepository);

    const result = await service.getSystemsForEndpoints(
      { from: '2026-09-01T00:00:00', to: '2026-09-30T00:00:00' },
      ['/api/meliaf-taxonomy/', '/concepts/'],
    );

    expect(qb.andWhere).toHaveBeenCalledWith(
      '(log.endpoint_accessed LIKE :endpointPrefix0 OR log.endpoint_accessed LIKE :endpointPrefix1)',
      {
        endpointPrefix0: '/api/meliaf-taxonomy/%',
        endpointPrefix1: '/concepts/%',
      },
    );
    const [, fromArgs] = qb.where.mock.calls[0];
    expect(fromArgs.from.getDate()).toBe(1);
    expect(fromArgs.from.getHours()).toBe(0);
    expect(result.systems).toEqual([
      {
        mis_id: 3,
        acronym: 'PRMS',
        name: 'Reporting',
        environment: 'PROD',
        calls: 12,
        errors: 1,
        avg_response_time_ms: 41,
        api_keys: 1,
        last_used_at: null,
        kind: 'mis',
        api_key_id: null,
        api_key_name: null,
        system_key: 'mis:3',
      },
    ]);
  });

  it('escapes LIKE wildcards in an endpoint prefix', async () => {
    const qb = queryBuilder([]);
    const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
    const service = new ApiKeyUsageMetricsService({} as any, logRepository);
    await service.getSystemsForEndpoints({}, ['/api/a_b%/']);
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(log.endpoint_accessed LIKE :endpointPrefix0)',
      { endpointPrefix0: '/api/a\\_b\\%/%' },
    );
  });

  it('the Overview keeps no endpoint filter', async () => {
    const qb = queryBuilder([]);
    const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
    const service = new ApiKeyUsageMetricsService({} as any, logRepository);
    await service.getOverview({} as any);
    for (const [clause] of qb.andWhere.mock.calls)
      expect(String(clause)).not.toMatch(/endpoint_accessed LIKE/);
  });
  describe('keys without a MIS are systems of their own (2026-09-30)', () => {
    const KEY_GROUP = 'CASE WHEN ak.mis_id IS NULL THEN ak.id ELSE NULL END';

    // What MySQL returns for: MIS 3 (PRMS) with two keys, plus two keys
    // that have no MIS. Before, the last two collapsed into one «No MIS» row.
    const systemRows = [
      {
        mis_id: '3',
        key_group_id: null,
        key_name: null,
        acronym: 'PRMS',
        name: 'Performance Results Management System',
        environment: 'PROD',
        calls: '300',
        errors: '3',
        avg_ms: '200',
        api_keys: '2',
        last_used_at: null,
      },
      {
        mis_id: null,
        key_group_id: '12',
        key_name: 'MELIAF Hub — production',
        acronym: null,
        name: null,
        environment: 'PROD',
        calls: '40',
        errors: '0',
        avg_ms: '90',
        api_keys: '1',
        last_used_at: null,
      },
      {
        mis_id: null,
        key_group_id: '40',
        key_name: 'STAR sandbox',
        acronym: null,
        name: null,
        environment: 'TEST',
        calls: '7',
        errors: '1',
        avg_ms: null,
        api_keys: '1',
        last_used_at: null,
      },
    ];

    const overviewWith = async (
      series: any[] = [],
      heat: any[] = [],
      query: any = {},
    ) => {
      const qbs = [
        queryBuilder(systemRows),
        queryBuilder(series),
        queryBuilder(heat),
      ];
      const made = [...qbs];
      const logRepository: any = {
        createQueryBuilder: jest.fn(() => qbs.shift()),
      };
      const service = new ApiKeyUsageMetricsService({} as any, logRepository);
      const result = await service.getOverview(query);
      return { result, qbs: made };
    };

    it('one MIS with two keys + two keys without MIS → three groups, labelled by MIS or key name', async () => {
      const { result } = await overviewWith();
      expect(result.systems).toHaveLength(3);
      expect(
        result.systems.map((s) => [
          s.system_key,
          s.kind,
          s.mis_id,
          s.api_key_id,
          s.acronym,
          s.environment,
          s.api_keys,
        ]),
      ).toEqual([
        ['mis:3', 'mis', 3, null, 'PRMS', 'PROD', 2],
        ['key:12', 'key', null, 12, 'MELIAF Hub — production', 'PROD', 1],
        ['key:40', 'key', null, 40, 'STAR sandbox', 'TEST', 1],
      ]);
      expect(result.systems[1]).toMatchObject({
        name: 'MELIAF Hub — production',
        api_key_name: 'MELIAF Hub — production',
      });
      for (const s of result.systems) {
        expect(s.acronym).not.toBe('No MIS');
        expect(s.name).not.toBe('Keys not linked to any system');
      }
    });

    it('groups systems, series and heatmap by MIS and by key, never by MIS alone', async () => {
      const { qbs } = await overviewWith();
      for (const qb of qbs) {
        const groups = [
          ...qb.groupBy.mock.calls,
          ...qb.addGroupBy.mock.calls,
        ].map(([g]) => g);
        expect(groups).toEqual(
          expect.arrayContaining(['ak.mis_id', KEY_GROUP]),
        );
        const selects = qb.addSelect.mock.calls.map(([expr, alias]) => [
          expr,
          alias,
        ]);
        expect(selects).toContainEqual([KEY_GROUP, 'key_group_id']);
      }
    });

    it('series and heatmap carry the same system_key as the systems', async () => {
      const { result } = await overviewWith(
        [
          {
            bucket: '2026-09-29',
            mis_id: '3',
            key_group_id: null,
            calls: '10',
            errors: '0',
            avg_ms: '1',
          },
          {
            bucket: '2026-09-29',
            mis_id: null,
            key_group_id: '12',
            calls: '4',
            errors: '0',
            avg_ms: '2',
          },
          {
            bucket: '2026-09-29',
            mis_id: null,
            key_group_id: '40',
            calls: '1',
            errors: '1',
            avg_ms: null,
          },
        ],
        [{ dow: '3', hour: '9', mis_id: null, key_group_id: '40', calls: '1' }],
      );
      expect(
        result.series.map((p) => [
          p.system_key,
          p.mis_id,
          p.api_key_id,
          p.calls,
        ]),
      ).toEqual([
        ['mis:3', 3, null, 10],
        ['key:12', null, 12, 4],
        ['key:40', null, 40, 1],
      ]);
      expect(result.heatmap[0]).toMatchObject({
        system_key: 'key:40',
        kind: 'key',
        api_key_id: 40,
        mis_id: null,
      });
    });

    it('getSystemsForEndpoints (CLR-67) gets the same per-key groups', async () => {
      const qb = queryBuilder(systemRows);
      const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
      const service = new ApiKeyUsageMetricsService({} as any, logRepository);
      const out = await service.getSystemsForEndpoints({}, [
        '/api/meliaf-taxonomy/',
      ]);
      expect(out.systems.map((s) => s.system_key)).toEqual([
        'mis:3',
        'key:12',
        'key:40',
      ]);
      expect(out.systems[1].acronym).toBe('MELIAF Hub — production');
    });

    it('key_ids alone narrows to those keys, only among keys with no MIS', async () => {
      const qb = queryBuilder([]);
      const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
      const service = new ApiKeyUsageMetricsService({} as any, logRepository);
      await service.getLogs({ key_ids: '12,40,12' } as any);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '((ak.mis_id IS NULL AND ak.id IN (:...keyIds)))',
        { keyIds: [12, 40] },
      );
    });

    it('key_ids combines with mis_ids as an OR', async () => {
      const qb = queryBuilder([]);
      const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
      const service = new ApiKeyUsageMetricsService({} as any, logRepository);
      await service.getLogs({ mis_ids: '3,7', key_ids: '12' } as any);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(ak.mis_id IN (:...misIds) OR (ak.mis_id IS NULL AND ak.id IN (:...keyIds)))',
        { misIds: [3, 7], keyIds: [12] },
      );

      qb.andWhere.mockClear();
      await service.getLogs({ mis_ids: '0', key_ids: '12' } as any);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(ak.mis_id IS NULL OR (ak.mis_id IS NULL AND ak.id IN (:...keyIds)))',
        { keyIds: [12] },
      );
    });

    it('without key_ids the mis_ids filter is the same call as before', async () => {
      const qb = queryBuilder([]);
      const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
      const service = new ApiKeyUsageMetricsService({} as any, logRepository);
      await service.getLogs({ mis_ids: '3,7' } as any);
      const clauses = qb.andWhere.mock.calls.filter(([c]) =>
        String(c).includes('mis_id'),
      );
      // getLogs builds the page and the count on the same (mocked) builder
      expect(clauses).toEqual([
        ['ak.mis_id IN (:...misIds)', { misIds: [3, 7] }],
        ['ak.mis_id IN (:...misIds)', { misIds: [3, 7] }],
      ]);
      expect(
        qb.andWhere.mock.calls.some(([c]) => String(c).includes('keyIds')),
      ).toBe(false);
    });

    it('log rows say which system they belong to', async () => {
      const qb = queryBuilder([
        {
          id: '1',
          api_key_id: '12',
          api_key_name: 'MELIAF Hub — production',
          key_prefix: 'cl_prod_x',
          mis_acronym: null,
          mis_id: null,
          microservice_name: 'clarisa-api',
          endpoint_accessed: '/api/x',
          created_at: null,
        },
        {
          id: '2',
          api_key_id: '1',
          api_key_name: 'Reporting',
          key_prefix: 'cl_prod_y',
          mis_acronym: 'PRMS',
          mis_id: '3',
          microservice_name: 'clarisa-api',
          endpoint_accessed: '/api/x',
          created_at: null,
        },
      ]);
      const logRepository: any = { createQueryBuilder: jest.fn(() => qb) };
      const service = new ApiKeyUsageMetricsService({} as any, logRepository);
      const out = await service.getLogs({} as any);
      expect(out.items.map((i) => [i.system_key, i.mis_id])).toEqual([
        ['key:12', null],
        ['mis:3', 3],
      ]);
    });
  });
});
