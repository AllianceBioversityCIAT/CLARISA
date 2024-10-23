import { Injectable } from '@nestjs/common';
import { MisService } from '../mis/mis.service';
import { CreateAppSecretDto } from './dto/create-app-secret.dto';
import { AppSecretRepository } from './repositories/app-secret.repository';
import { generate } from 'generate-password';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { AppSecretMapper } from './mappers/app-secret.mapper';
import { AppSecret } from './entities/app-secret.entity';
import { AppSecretDto } from './dto/app-secret.dto';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { BCryptPasswordEncoder } from '../../auth/utils/BCryptPasswordEncoder';
import { UserDataDto } from '../../shared/entities/dtos/user-data.dto';
import { FindManyOptions } from 'typeorm';
import { ValidateAppSecretDto } from './dto/validate-app-secret.dto';
import * as crypto from 'crypto';

@Injectable()
export class AppSecretService {
  constructor(
    private _misService: MisService,
    private _appSecretRepository: AppSecretRepository,
    private _appSecretMapper: AppSecretMapper,
    private _bcryptPasswordEncoder: BCryptPasswordEncoder,
  ) {}

  private readonly _where: FindManyOptions<AppSecret> = {
    relations: {
      receiver_mis_object: {
        environment_object: true,
      },
      sender_mis_object: {
        environment_object: true,
      },
    },
  };

  async create(createAppSecretDto: CreateAppSecretDto, userData: UserDataDto) {
    if (
      !createAppSecretDto ||
      !createAppSecretDto.sender_mis ||
      !createAppSecretDto.receiver_mis
    ) {
      throw new Error('Missing required data');
    } else if (!createAppSecretDto.sender_mis.acronym) {
      throw new Error('Missing sender MIS acronym');
    } else if (!createAppSecretDto.sender_mis.environment) {
      throw new Error('Missing sender MIS environment');
    } else if (!createAppSecretDto.receiver_mis.acronym) {
      throw new Error('Missing receiver MIS acronym');
    } else if (!createAppSecretDto.receiver_mis.environment) {
      throw new Error('Missing receiver MIS environment');
    } else if (
      createAppSecretDto.receiver_mis.acronym ==
      createAppSecretDto.sender_mis.acronym
    ) {
      throw new Error('Sender and receiver MIS acronyms cannot be the same');
    }

    const senderMis = await this._misService.findOneByAcronymAndEnvironment(
      createAppSecretDto.sender_mis.acronym,
      createAppSecretDto.sender_mis.environment,
    );
    if (!senderMis) {
      throw new Error(
        `Sender MIS with acronym "${createAppSecretDto.sender_mis.acronym}" and environment "${createAppSecretDto.sender_mis.environment}" not found`,
      );
    }

    const receiverMis = await this._misService.findOneByAcronymAndEnvironment(
      createAppSecretDto.receiver_mis.acronym,
      createAppSecretDto.receiver_mis.environment,
    );
    if (!receiverMis) {
      throw new Error(
        `Receiver MIS with acronym "${createAppSecretDto.receiver_mis.acronym}" and environment "${createAppSecretDto.receiver_mis.environment}" not found`,
      );
    }

    const existingAppSecret = await this._appSecretRepository.findOneBy({
      sender_mis_id: senderMis.id,
      receiver_mis_id: receiverMis.id,
    });

    if (existingAppSecret) {
      throw new Error(
        `AppSecret already exists between sender MIS "${senderMis.acronym}" and receiver MIS "${receiverMis.acronym} with ID "${existingAppSecret.id}"`,
      );
    }

    const secret = generate({ length: 32, numbers: true, symbols: true });
    const generatedUuid = crypto.randomUUID();

    const appSecret = this._appSecretRepository.create({
      sender_mis_id: senderMis.id,
      receiver_mis_id: receiverMis.id,
      relation_uuid: generatedUuid,
      secret: this._bcryptPasswordEncoder.encode(secret),
      auditableFields: {
        created_by: userData.userId,
      },
    });

    return this._appSecretRepository
      .save(appSecret)
      .then((appSecret) =>
        this._appSecretRepository.findOne({
          where: { id: appSecret.id },
          ...this._where,
        }),
      )
      .then((appSecret) => {
        return ResponseDto.buildCreatedResponse(
          this._appSecretMapper.classToDto({ ...appSecret, secret }),
          AppSecretService,
        );
      });
  }

  async validateAppSecret(appSecretDto: ValidateAppSecretDto) {
    if (!appSecretDto) {
      throw new Error('Missing required data');
    } else if (!appSecretDto.client_id) {
      throw new Error('Missing client ID');
    } else if (!appSecretDto.secret) {
      throw new Error('Missing secret');
    }

    const appSecret = await this._appSecretRepository.findOne({
      where: { relation_uuid: appSecretDto.client_id },
      select: { id: true, secret: true, relation_uuid: true },
      ...this._where,
    });
    if (!appSecret) {
      throw new Error('Invalid client ID');
    }

    const correctSecret = this._bcryptPasswordEncoder.matches(
      appSecret.secret,
      appSecretDto.secret,
    );
    if (!correctSecret) {
      throw new Error('Invalid combination of client ID and secret');
    }

    delete appSecret.secret;

    return ResponseDto.buildOkResponse(
      this._appSecretMapper.classToDto(appSecret),
    );
  }

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<AppSecretDto[]> {
    let appSecrets: AppSecret[] = [];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        appSecrets = await this._appSecretRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        appSecrets = await this._appSecretRepository.find({
          ...this._where,
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw Error('?!');
    }

    return this._appSecretMapper.classListToDtoList(appSecrets);
  }

  async findOne(id: number): Promise<AppSecretDto> {
    const appSecret: AppSecret = await this._appSecretRepository.findOne({
      ...this._where,
      where: {
        id,
        auditableFields: { is_active: true },
      },
    });

    return appSecret ? this._appSecretMapper.classToDto(appSecret) : null;
  }
}
