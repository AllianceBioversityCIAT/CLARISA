import { Injectable } from '@nestjs/common';
import { FindManyOptions } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { ApiKeyMapper } from './mappers/api-key.mapper';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyDto, CreateApiKeyResponseDto } from './dto/api-key.dto';
import { ApiKey } from './entities/api-key.entity';
import { MisService } from '../mis/mis.service';
import { EnvironmentService } from '../environment/environment.service';
import { BCryptPasswordEncoder } from '../../auth/utils/BCryptPasswordEncoder';
import { UserData } from '../../shared/interfaces/user-data';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import {
  API_KEY_SCOPE_CATALOG,
  assertKnownApiKeyScopes,
} from './constants/api-key-scopes';

@Injectable()
export class ApiKeyService {
  constructor(
    private _apiKeyRepository: ApiKeyRepository,
    private _apiKeyMapper: ApiKeyMapper,
    private _misService: MisService,
    private _environmentService: EnvironmentService,
    private _bcryptPasswordEncoder: BCryptPasswordEncoder,
  ) {}

  private readonly _where: FindManyOptions<ApiKey> = {
    relations: {
      mis_object: { environment_object: true },
      environment_object: true,
    },
  };

  async create(
    createApiKeyDto: CreateApiKeyDto,
    userData: UserData,
  ): Promise<ResponseDto<CreateApiKeyResponseDto>> {
    const environmentAcronym = createApiKeyDto.environment?.trim();
    if (!environmentAcronym) {
      throw new Error('Missing environment');
    }

    assertKnownApiKeyScopes(createApiKeyDto.scopes);

    if (createApiKeyDto.mis_id) {
      const mis = await this._misService.findOne(createApiKeyDto.mis_id);
      if (!mis) {
        throw new Error(`MIS with ID "${createApiKeyDto.mis_id}" not found`);
      }
    }

    const environmentDto =
      await this._environmentService.findOneByAcronym(environmentAcronym);
    if (!environmentDto) {
      const available = await this._environmentService.findAll();
      const acronyms = available.map((e) => e.acronym).filter(Boolean).join(', ');
      throw new Error(
        `Environment "${environmentAcronym}" not found.${acronyms ? ` Available: ${acronyms}` : ''}`,
      );
    }
    const environmentId = environmentDto.code as number;
    const keyPrefixSegment =
      this.normalizeEnvironmentForKeyPrefix(environmentDto.acronym);

    if (createApiKeyDto.expires_at) {
      const expiresAt = new Date(createApiKeyDto.expires_at);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new Error('Invalid expires_at date');
      }
      if (expiresAt <= new Date()) {
        throw new Error('expires_at must be a future date');
      }
    }

    const { plainKey, keyPrefix, keyHash } =
      this.generateApiKey(keyPrefixSegment);

    const apiKey = this._apiKeyRepository.create({
      name: createApiKeyDto.name.trim(),
      mis_id: createApiKeyDto.mis_id ?? null,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: createApiKeyDto.scopes ?? null,
      environment_id: environmentId,
      allowed_ips: createApiKeyDto.allowed_ips ?? null,
      expires_at: createApiKeyDto.expires_at
        ? new Date(createApiKeyDto.expires_at)
        : null,
      usage_count: 0,
      auditableFields: {
        created_by: userData.userId,
      },
    });

    const saved = await this._apiKeyRepository.save(apiKey);
    const loaded = await this._apiKeyRepository.findOne({
      where: { id: saved.id },
      ...this._where,
    });

    const responseDto: CreateApiKeyResponseDto = {
      ...this._apiKeyMapper.classToDto(loaded),
      key: plainKey,
    };

    return ResponseDto.buildCreatedResponse(responseDto, ApiKeyService);
  }

  listScopeCatalog() {
    return API_KEY_SCOPE_CATALOG;
  }

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ApiKeyDto[]> {
    let apiKeys: ApiKey[] = [];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        apiKeys = await this._apiKeyRepository.find(this._where);
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        apiKeys = await this._apiKeyRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          ...this._where,
        });
        break;
      default:
        throw Error('Invalid show option');
    }

    return this._apiKeyMapper.classListToDtoList(apiKeys);
  }

  async findOne(id: number): Promise<ApiKeyDto> {
    const apiKey = await this._apiKeyRepository.findOne({
      where: { id },
      ...this._where,
    });
    return apiKey ? this._apiKeyMapper.classToDto(apiKey) : null;
  }

  async revoke(id: number, userData: UserData): Promise<ResponseDto<ApiKeyDto>> {
    const apiKey = await this._loadForUpdate(id);
    apiKey.auditableFields.is_active = false;
    apiKey.auditableFields.updated_by = userData.userId;
    await this._apiKeyRepository.save(apiKey);
    const loaded = await this._apiKeyRepository.findOne({
      where: { id },
      ...this._where,
    });
    return ResponseDto.buildOkResponse(this._apiKeyMapper.classToDto(loaded));
  }

  async remove(id: number): Promise<ResponseDto<{ success: boolean }>> {
    const apiKey = await this._apiKeyRepository.findOneBy({ id });
    if (!apiKey) {
      throw new Error(`API key with ID "${id}" not found`);
    }
    await this._apiKeyRepository.remove(apiKey);
    return ResponseDto.buildOkResponse({ success: true });
  }

  async rotate(
    id: number,
    userData: UserData,
  ): Promise<ResponseDto<CreateApiKeyResponseDto>> {
    const existing = await this._apiKeyRepository.findOne({
      where: { id },
      ...this._where,
    });
    if (!existing) {
      throw new Error(`API key with ID "${id}" not found`);
    }
    if (!existing.auditableFields?.is_active) {
      throw new Error('Cannot rotate a revoked API key');
    }

    const environmentAcronym = existing.environment_object?.acronym;
    if (!environmentAcronym) {
      throw new Error(
        'Cannot rotate API key: linked environment is missing or inactive',
      );
    }

    await this.revoke(id, userData);

    return this.create(
      {
        name: existing.name,
        mis_id: existing.mis_id ?? undefined,
        scopes: existing.scopes ?? undefined,
        environment: environmentAcronym,
        allowed_ips: existing.allowed_ips ?? undefined,
        expires_at: existing.expires_at
          ? existing.expires_at.toISOString()
          : undefined,
      },
      userData,
    );
  }

  private async _loadForUpdate(id: number): Promise<ApiKey> {
    const apiKey = await this._apiKeyRepository.findOneBy({ id });
    if (!apiKey) {
      throw new Error(`API key with ID "${id}" not found`);
    }
    return apiKey;
  }

  /** Key prefix segment from DB acronym (e.g. PROD → prod → cl_prod_) */
  private normalizeEnvironmentForKeyPrefix(acronym: string): string {
    return acronym.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private generateApiKey(environmentCode: string): {
    plainKey: string;
    keyPrefix: string;
    keyHash: string;
  } {
    const prefix = `cl_${environmentCode}_`;
    const randomPart = crypto
      .randomBytes(30)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 40);
    const plainKey = `${prefix}${randomPart}`;
    const keyHash = this._bcryptPasswordEncoder.encode(plainKey);
    const keyPrefix = plainKey.slice(0, 16);

    return { plainKey, keyPrefix, keyHash };
  }
}
