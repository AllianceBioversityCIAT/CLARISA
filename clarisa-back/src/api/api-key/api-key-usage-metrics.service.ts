import { Injectable } from '@nestjs/common';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { ApiKeyUsageLogRepository } from './repositories/api-key-usage-log.repository';
import {
  ApiKeyUsageQueryDto,
  UsageLogsQueryDto,
  UsageSummaryQueryDto,
} from './dto/usage-query.dto';
import {
  ApiKeyUsageStatsResponseDto,
  UsageLogsResponseDto,
  UsageSummaryResponseDto,
} from './dto/usage-metrics.dto';
import {
  resolveUsageDateRange,
  toIsoPeriod,
} from './utils/usage-date-range';

interface UsageFilterParams {
  from: Date;
  to: Date;
  mis_id?: number;
  api_key_id?: number;
  microservice_name?: string;
}

@Injectable()
export class ApiKeyUsageMetricsService {
  constructor(
    private readonly _apiKeyRepository: ApiKeyRepository,
    private readonly _usageLogRepository: ApiKeyUsageLogRepository,
  ) {}

  async getSummary(
    query: UsageSummaryQueryDto,
  ): Promise<UsageSummaryResponseDto> {
    const range = resolveUsageDateRange(query.from, query.to);
    const filters = this._buildFilters(range, query);

    const [
      totalsRow,
      byMis,
      byMisMicroservice,
      byMicroservice,
      keys,
      timeSeries,
      keyCounts,
    ] = await Promise.all([
      this._aggregateTotals(filters),
      this._aggregateByMis(filters),
      this._aggregateMisMicroserviceMatrix(filters),
      this._aggregateByMicroservice(filters),
      this._aggregateKeysInPeriod(filters),
      this._aggregateTimeSeries(filters, query.granularity ?? 'day'),
      this._countKeyStatuses(),
    ]);

    return {
      period: toIsoPeriod(range),
      totals: {
        total_requests: totalsRow.total_requests,
        error_count: totalsRow.error_count,
        avg_response_time_ms: totalsRow.avg_response_time_ms,
        active_keys: keyCounts.active_keys,
        revoked_keys: keyCounts.revoked_keys,
        expiring_within_30_days: keyCounts.expiring_within_30_days,
      },
      by_mis: byMis,
      by_mis_microservice: byMisMicroservice,
      by_microservice: byMicroservice,
      keys,
      time_series: timeSeries,
    };
  }

  async getKeyUsage(
    apiKeyId: number,
    query: ApiKeyUsageQueryDto,
  ): Promise<ApiKeyUsageStatsResponseDto> {
    const apiKey = await this._apiKeyRepository.findOne({
      where: { id: apiKeyId },
      relations: {
        mis_object: true,
        environment_object: true,
      },
    });

    if (!apiKey) {
      throw new Error(`API key with ID "${apiKeyId}" not found`);
    }

    const range = resolveUsageDateRange(query.from, query.to);
    const filters = this._buildFilters(range, {
      ...query,
      api_key_id: apiKeyId,
    });
    const granularity = query.granularity ?? 'day';

    const [totalsRow, timeSeries, byMicroservice, topEndpoints, activeDays] =
      await Promise.all([
        this._aggregateTotals(filters),
        this._aggregateTimeSeries(filters, granularity),
        this._aggregateByMicroserviceForKey(filters),
        this._aggregateTopEndpoints(filters),
        this._countActiveDays(filters),
      ]);

    return {
      period: toIsoPeriod(range),
      api_key: {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        mis_acronym: apiKey.mis_object?.acronym ?? null,
        mis_name: apiKey.mis_object?.name ?? null,
        environment: apiKey.environment_object?.acronym ?? null,
        is_active: apiKey.auditableFields?.is_active ?? true,
        expires_at: apiKey.expires_at ?? null,
      },
      totals: {
        total_requests: totalsRow.total_requests,
        error_count: totalsRow.error_count,
        avg_response_time_ms: totalsRow.avg_response_time_ms,
        active_days: activeDays,
      },
      time_series: timeSeries,
      by_microservice: byMicroservice,
      top_endpoints: topEndpoints,
    };
  }

  async getLogs(query: UsageLogsQueryDto): Promise<UsageLogsResponseDto> {
    const range = resolveUsageDateRange(query.from, query.to);
    const filters = this._buildFilters(range, query);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const qb = this._baseLogQuery(filters)
      .select([
        'log.id AS id',
        'log.api_key_id AS api_key_id',
        'ak.name AS api_key_name',
        'ak.key_prefix AS key_prefix',
        'mis.acronym AS mis_acronym',
        'log.microservice_name AS microservice_name',
        'log.endpoint_accessed AS endpoint_accessed',
        'log.http_method AS http_method',
        'log.status_code AS status_code',
        'log.ip_address AS ip_address',
        'log.response_time_ms AS response_time_ms',
        'log.created_at AS created_at',
      ])
      .orderBy('log.created_at', 'DESC')
      .offset(offset)
      .limit(limit);

    const countQb = this._baseLogQuery(filters).select(
      'COUNT(log.id)',
      'total',
    );

    const [items, countRow] = await Promise.all([
      qb.getRawMany(),
      countQb.getRawOne<{ total: string }>(),
    ]);

    return {
      period: toIsoPeriod(range),
      total: Number(countRow?.total ?? 0),
      items: items.map((row) => ({
        id: Number(row.id),
        api_key_id: Number(row.api_key_id),
        api_key_name: row.api_key_name,
        key_prefix: row.key_prefix,
        mis_acronym: row.mis_acronym ?? null,
        microservice_name: row.microservice_name,
        endpoint_accessed: row.endpoint_accessed,
        http_method: row.http_method ?? null,
        status_code: row.status_code != null ? Number(row.status_code) : null,
        ip_address: row.ip_address ?? null,
        response_time_ms:
          row.response_time_ms != null ? Number(row.response_time_ms) : null,
        created_at: row.created_at,
      })),
    };
  }

  private _buildFilters(
    range: { from: Date; to: Date },
    query: UsageSummaryQueryDto,
  ): UsageFilterParams {
    return {
      from: range.from,
      to: range.to,
      mis_id: query.mis_id,
      api_key_id: query.api_key_id,
      microservice_name: query.microservice_name?.trim() || undefined,
    };
  }

  private _baseLogQuery(filters: UsageFilterParams) {
    const qb = this._usageLogRepository
      .createQueryBuilder('log')
      .innerJoin('log.api_key_object', 'ak')
      .leftJoin('ak.mis_object', 'mis')
      .where('log.created_at >= :from', { from: filters.from })
      .andWhere('log.created_at <= :to', { to: filters.to });

    if (filters.api_key_id) {
      qb.andWhere('log.api_key_id = :apiKeyId', {
        apiKeyId: filters.api_key_id,
      });
    }

    if (filters.mis_id) {
      qb.andWhere('ak.mis_id = :misId', { misId: filters.mis_id });
    }

    if (filters.microservice_name) {
      qb.andWhere('log.microservice_name = :microserviceName', {
        microserviceName: filters.microservice_name,
      });
    }

    return qb;
  }

  private async _aggregateTotals(filters: UsageFilterParams) {
    const row = await this._baseLogQuery(filters)
      .select('COUNT(log.id)', 'total_requests')
      .addSelect(
        'SUM(CASE WHEN log.status_code >= 400 THEN 1 ELSE 0 END)',
        'error_count',
      )
      .addSelect('AVG(log.response_time_ms)', 'avg_response_time_ms')
      .getRawOne<{
        total_requests: string;
        error_count: string;
        avg_response_time_ms: string | null;
      }>();

    return {
      total_requests: Number(row?.total_requests ?? 0),
      error_count: Number(row?.error_count ?? 0),
      avg_response_time_ms:
        row?.avg_response_time_ms != null
          ? Math.round(Number(row.avg_response_time_ms))
          : null,
    };
  }

  private async _aggregateTimeSeries(
    filters: UsageFilterParams,
    granularity: 'day' | 'week',
  ) {
    const dateExpr =
      granularity === 'week'
        ? "DATE_FORMAT(log.created_at, '%x-W%v')"
        : 'DATE(log.created_at)';

    const rows = await this._baseLogQuery(filters)
      .select(dateExpr, 'bucket')
      .addSelect('COUNT(log.id)', 'count')
      .addSelect('AVG(log.response_time_ms)', 'avg_response_time_ms')
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{
        bucket: string;
        count: string;
        avg_response_time_ms: string | null;
      }>();

    return rows.map((row) => ({
      date: String(row.bucket),
      count: Number(row.count),
      avg_response_time_ms:
        row.avg_response_time_ms != null
          ? Math.round(Number(row.avg_response_time_ms))
          : null,
    }));
  }

  private async _aggregateByMis(filters: UsageFilterParams) {
    const rows = await this._baseLogQuery(filters)
      .select('ak.mis_id', 'mis_id')
      .addSelect('mis.acronym', 'mis_acronym')
      .addSelect('mis.name', 'mis_name')
      .addSelect('env.acronym', 'environment')
      .addSelect('COUNT(log.id)', 'total_requests')
      .addSelect('COUNT(DISTINCT ak.id)', 'api_key_count')
      .addSelect('COUNT(DISTINCT log.microservice_name)', 'microservices_used')
      .leftJoin('ak.environment_object', 'env')
      .groupBy('ak.mis_id')
      .addGroupBy('mis.acronym')
      .addGroupBy('mis.name')
      .addGroupBy('env.acronym')
      .orderBy('total_requests', 'DESC')
      .getRawMany();

    return rows.map((row) => ({
      mis_id: row.mis_id != null ? Number(row.mis_id) : null,
      mis_acronym: row.mis_acronym ?? '—',
      mis_name: row.mis_name ?? 'Unassigned',
      environment: row.environment ?? null,
      total_requests: Number(row.total_requests),
      api_key_count: Number(row.api_key_count),
      microservices_used: Number(row.microservices_used),
    }));
  }

  private async _aggregateMisMicroserviceMatrix(filters: UsageFilterParams) {
    const rows = await this._baseLogQuery(filters)
      .select('ak.mis_id', 'mis_id')
      .addSelect('mis.acronym', 'mis_acronym')
      .addSelect('mis.name', 'mis_name')
      .addSelect('env.acronym', 'environment')
      .addSelect('log.microservice_name', 'microservice_name')
      .addSelect('COUNT(log.id)', 'total_requests')
      .leftJoin('ak.environment_object', 'env')
      .groupBy('ak.mis_id')
      .addGroupBy('mis.acronym')
      .addGroupBy('mis.name')
      .addGroupBy('env.acronym')
      .addGroupBy('log.microservice_name')
      .orderBy('total_requests', 'DESC')
      .getRawMany();

    return rows.map((row) => ({
      mis_id: row.mis_id != null ? Number(row.mis_id) : null,
      mis_acronym: row.mis_acronym ?? '—',
      mis_name: row.mis_name ?? 'Unassigned',
      environment: row.environment ?? null,
      microservice_name: row.microservice_name,
      total_requests: Number(row.total_requests),
    }));
  }

  private async _aggregateByMicroservice(filters: UsageFilterParams) {
    const rows = await this._baseLogQuery(filters)
      .select('log.microservice_name', 'microservice_name')
      .addSelect('COUNT(log.id)', 'total_requests')
      .addSelect('COUNT(DISTINCT log.api_key_id)', 'unique_api_keys')
      .groupBy('log.microservice_name')
      .orderBy('total_requests', 'DESC')
      .getRawMany();

    const total = rows.reduce(
      (sum, row) => sum + Number(row.total_requests),
      0,
    );

    return rows.map((row) => {
      const count = Number(row.total_requests);
      return {
        microservice_name: row.microservice_name,
        total_requests: count,
        unique_api_keys: Number(row.unique_api_keys),
        percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
      };
    });
  }

  private async _aggregateByMicroserviceForKey(filters: UsageFilterParams) {
    const items = await this._aggregateByMicroservice(filters);
    return items.map((item) => ({
      label: item.microservice_name,
      total_requests: item.total_requests,
      percentage: item.percentage,
    }));
  }

  private async _aggregateTopEndpoints(filters: UsageFilterParams) {
    const rows = await this._baseLogQuery(filters)
      .select('log.endpoint_accessed', 'endpoint_accessed')
      .addSelect('COUNT(log.id)', 'total_requests')
      .groupBy('log.endpoint_accessed')
      .orderBy('total_requests', 'DESC')
      .limit(10)
      .getRawMany();

    const total = rows.reduce(
      (sum, row) => sum + Number(row.total_requests),
      0,
    );

    return rows.map((row) => {
      const count = Number(row.total_requests);
      return {
        label: row.endpoint_accessed,
        total_requests: count,
        percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
      };
    });
  }

  private async _aggregateKeysInPeriod(filters: UsageFilterParams) {
    const rows = await this._baseLogQuery(filters)
      .select('ak.id', 'id')
      .addSelect('ak.name', 'name')
      .addSelect('ak.key_prefix', 'key_prefix')
      .addSelect('mis.acronym', 'mis_acronym')
      .addSelect('mis.name', 'mis_name')
      .addSelect('env.acronym', 'environment')
      .addSelect('ak.usage_count', 'usage_count')
      .addSelect('ak.last_used_at', 'last_used_at')
      .addSelect('ak.expires_at', 'expires_at')
      .addSelect('ak.is_active', 'is_active')
      .addSelect('COUNT(log.id)', 'requests_in_period')
      .leftJoin('ak.environment_object', 'env')
      .groupBy('ak.id')
      .addGroupBy('ak.name')
      .addGroupBy('ak.key_prefix')
      .addGroupBy('mis.acronym')
      .addGroupBy('mis.name')
      .addGroupBy('env.acronym')
      .addGroupBy('ak.usage_count')
      .addGroupBy('ak.last_used_at')
      .addGroupBy('ak.expires_at')
      .addGroupBy('ak.is_active')
      .orderBy('requests_in_period', 'DESC')
      .getRawMany();

    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      key_prefix: row.key_prefix,
      mis_acronym: row.mis_acronym ?? null,
      mis_name: row.mis_name ?? null,
      environment: row.environment ?? null,
      usage_count: Number(row.usage_count ?? 0),
      last_used_at: row.last_used_at ?? null,
      requests_in_period: Number(row.requests_in_period),
      is_active: Boolean(Number(row.is_active ?? 1)),
      expires_at: row.expires_at ?? null,
    }));
  }

  private async _countActiveDays(filters: UsageFilterParams): Promise<number> {
    const row = await this._baseLogQuery(filters)
      .select('COUNT(DISTINCT DATE(log.created_at))', 'active_days')
      .getRawOne<{ active_days: string }>();

    return Number(row?.active_days ?? 0);
  }

  private async _countKeyStatuses() {
    const row = await this._apiKeyRepository
      .createQueryBuilder('ak')
      .select(
        'SUM(CASE WHEN ak.is_active = 1 THEN 1 ELSE 0 END)',
        'active_keys',
      )
      .addSelect(
        'SUM(CASE WHEN ak.is_active = 0 THEN 1 ELSE 0 END)',
        'revoked_keys',
      )
      .addSelect(
        'SUM(CASE WHEN ak.expires_at IS NOT NULL AND ak.expires_at <= DATE_ADD(NOW(), INTERVAL 30 DAY) AND ak.is_active = 1 THEN 1 ELSE 0 END)',
        'expiring_within_30_days',
      )
      .getRawOne<{
        active_keys: string;
        revoked_keys: string;
        expiring_within_30_days: string;
      }>();

    return {
      active_keys: Number(row?.active_keys ?? 0),
      revoked_keys: Number(row?.revoked_keys ?? 0),
      expiring_within_30_days: Number(row?.expiring_within_30_days ?? 0),
    };
  }
}
