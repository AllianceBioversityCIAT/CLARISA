import { Injectable } from '@nestjs/common';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyDto } from '../dto/api-key.dto';

@Injectable()
export class ApiKeyMapper {
  public classToDto(apiKey: ApiKey): ApiKeyDto {
    const dto = new ApiKeyDto();
    dto.id = apiKey.id;
    dto.name = apiKey.name;
    dto.key_prefix = apiKey.key_prefix;
    dto.mis_id = apiKey.mis_id;
    dto.scopes = apiKey.scopes;
    dto.environment_id = apiKey.environment_id;
    dto.allowed_ips = apiKey.allowed_ips;
    dto.expires_at = apiKey.expires_at;
    dto.last_used_at = apiKey.last_used_at;
    dto.usage_count = apiKey.usage_count ?? 0;
    dto.is_active = apiKey.auditableFields?.is_active ?? true;
    dto.created_at = apiKey.auditableFields?.created_at;

    if (apiKey.mis_object) {
      dto.mis_acronym = apiKey.mis_object.acronym;
      dto.mis_name = apiKey.mis_object.name;
    }

    if (apiKey.environment_object) {
      dto.environment = apiKey.environment_object.acronym;
    }

    return dto;
  }

  public classListToDtoList(apiKeys: ApiKey[]): ApiKeyDto[] {
    return apiKeys.map((apiKey) => this.classToDto(apiKey));
  }
}
