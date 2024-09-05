import { Injectable } from '@nestjs/common';
import { AppSecret } from '../entities/app-secret.entity';
import { AppSecretDto } from '../dto/app-secret.dto';
import { MisMapper } from '../../mis/mappers/mis.mapper';

@Injectable()
export class AppSecretMapper {
  constructor(private readonly _misMapper: MisMapper) {}

  public classToDto(appSecret: AppSecret): AppSecretDto {
    const appSecretDto: AppSecretDto = new AppSecretDto();

    appSecretDto.client_id = appSecret.relation_uuid;

    if (appSecret.sender_mis_object) {
      appSecretDto.sender_mis = this._misMapper.classToSimpleDto(
        appSecret.sender_mis_object,
      );
    }

    if (appSecret.receiver_mis_object) {
      appSecretDto.receiver_mis = this._misMapper.classToSimpleDto(
        appSecret.receiver_mis_object,
      );
    }

    if (appSecret.secret) {
      appSecretDto.secret = appSecret.secret;
    }

    return appSecretDto;
  }

  public classListToDtoList(appSecrets: AppSecret[]): AppSecretDto[] {
    return appSecrets.map((appSecret) => this.classToDto(appSecret));
  }
}
