export class UsagePeriodDto {
  from: string;
  to: string;
}

export class UsageTotalsDto {
  total_requests: number;
  error_count: number;
  avg_response_time_ms: number | null;
}

export class UsageTimeSeriesPointDto {
  date: string;
  count: number;
  avg_response_time_ms: number | null;
}

export class UsageBreakdownItemDto {
  label: string;
  total_requests: number;
  percentage: number;
}

export class MisUsageSummaryItemDto {
  mis_id: number | null;
  mis_acronym: string;
  mis_name: string;
  environment: string | null;
  total_requests: number;
  api_key_count: number;
  microservices_used: number;
}

export class MicroserviceUsageItemDto {
  microservice_name: string;
  total_requests: number;
  unique_api_keys: number;
  percentage: number;
}

export class MisMicroserviceUsageItemDto {
  mis_id: number | null;
  mis_acronym: string;
  mis_name: string;
  environment: string | null;
  microservice_name: string;
  total_requests: number;
}

export class ApiKeyUsageListItemDto {
  id: number;
  name: string;
  key_prefix: string;
  mis_acronym: string | null;
  mis_name: string | null;
  environment: string | null;
  usage_count: number;
  last_used_at: Date | null;
  requests_in_period: number;
  is_active: boolean;
  expires_at: Date | null;
}

export class UsageLogItemDto {
  id: number;
  api_key_id: number;
  api_key_name: string;
  key_prefix: string;
  mis_acronym: string | null;
  microservice_name: string;
  endpoint_accessed: string;
  http_method: string | null;
  status_code: number | null;
  ip_address: string | null;
  response_time_ms: number | null;
  created_at: Date;
}

export class UsageSummaryResponseDto {
  period: UsagePeriodDto;
  totals: UsageTotalsDto & {
    active_keys: number;
    revoked_keys: number;
    expiring_within_30_days: number;
  };
  by_mis: MisUsageSummaryItemDto[];
  by_mis_microservice: MisMicroserviceUsageItemDto[];
  by_microservice: MicroserviceUsageItemDto[];
  keys: ApiKeyUsageListItemDto[];
  time_series: UsageTimeSeriesPointDto[];
}

export class ApiKeyUsageStatsResponseDto {
  period: UsagePeriodDto;
  api_key: {
    id: number;
    name: string;
    key_prefix: string;
    mis_acronym: string | null;
    mis_name: string | null;
    environment: string | null;
    is_active: boolean;
    expires_at: Date | null;
  };
  totals: UsageTotalsDto & { active_days: number };
  time_series: UsageTimeSeriesPointDto[];
  by_microservice: UsageBreakdownItemDto[];
  top_endpoints: UsageBreakdownItemDto[];
}

export class UsageLogsResponseDto {
  period: UsagePeriodDto;
  total: number;
  items: UsageLogItemDto[];
}

export class EndpointConsumerDto {
  api_key_id: number;
  api_key_name: string;
  key_prefix: string;
  mis_id: number | null;
  mis_acronym: string | null;
  total_requests: number;
  last_used_at: Date | null;
}

export class EndpointUsageItemDto {
  /** Name the caller reported (`clarisa-api` for direct calls to this API) */
  microservice_name: string;
  /** Request path without its query string */
  endpoint: string;
  http_method: string | null;
  total_requests: number;
  error_count: number;
  avg_response_time_ms: number | null;
  unique_api_keys: number;
  last_used_at: Date | null;
  consumers: EndpointConsumerDto[];
}

export class EndpointUsageResponseDto {
  period: UsagePeriodDto;
  total_requests: number;
  items: EndpointUsageItemDto[];
}

export class MisActivityItemDto {
  mis_id: number | null;
  mis_acronym: string;
  mis_name: string;
  total_keys: number;
  active_keys: number;
  usage_count: number;
  last_used_at: Date | null;
}

export class OverviewSystemDto {
  /** `null` = keys with no MIS */
  mis_id: number | null;
  acronym: string;
  name: string;
  environment: string | null;
  calls: number;
  errors: number;
  avg_response_time_ms: number | null;
  api_keys: number;
  last_used_at: Date | null;
}

export class OverviewSeriesPointDto {
  /** `YYYY-MM-DD`; with `granularity=week`, the Monday of the week */
  bucket: string;
  mis_id: number | null;
  calls: number;
  errors: number;
  avg_response_time_ms: number | null;
}

export class OverviewHeatCellDto {
  /** 1 = Sunday … 7 = Saturday (MySQL `DAYOFWEEK`) */
  day_of_week: number;
  /** 0-23, in the database clock */
  hour: number;
  mis_id: number | null;
  calls: number;
}

export class UsageOverviewResponseDto {
  period: UsagePeriodDto;
  granularity: 'day' | 'week';
  systems: OverviewSystemDto[];
  series: OverviewSeriesPointDto[];
  heatmap: OverviewHeatCellDto[];
}
