import { Injectable, Logger } from '@nestjs/common';
import { ApiKeyUsageLogRepository } from './repositories/api-key-usage-log.repository';
import { ApiKeyRepository } from './repositories/api-key.repository';

export interface RecordApiKeyUsageInput {
  api_key_id: number;
  microservice_name: string;
  endpoint_accessed: string;
  http_method?: string;
  status_code?: number;
  ip_address?: string;
  user_agent?: string;
  response_time_ms?: number;
}

@Injectable()
export class ApiKeyUsageLogService {
  private readonly _logger = new Logger(ApiKeyUsageLogService.name);

  constructor(
    private readonly _usageLogRepository: ApiKeyUsageLogRepository,
    private readonly _apiKeyRepository: ApiKeyRepository,
  ) {}

  recordUsageAsync(input: RecordApiKeyUsageInput): void {
    setImmediate(() => {
      this._persistUsage(input).catch((err) => {
        this._logger.error(
          `Failed to persist api key usage log for key ${input.api_key_id}`,
          err?.stack ?? err,
        );
      });
    });
  }

  private async _persistUsage(input: RecordApiKeyUsageInput): Promise<void> {
    await this._usageLogRepository.save(
      this._usageLogRepository.create({
        api_key_id: input.api_key_id,
        microservice_name: input.microservice_name,
        endpoint_accessed: input.endpoint_accessed,
        http_method: input.http_method ?? null,
        status_code: input.status_code ?? null,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
        response_time_ms: input.response_time_ms ?? null,
      }),
    );
  }

  async touchKeyUsage(apiKeyId: number): Promise<void> {
    await this._apiKeyRepository
      .createQueryBuilder()
      .update()
      .set({
        last_used_at: () => 'CURRENT_TIMESTAMP',
        usage_count: () => 'usage_count + 1',
      })
      .where('id = :id', { id: apiKeyId })
      .execute();
  }
}
