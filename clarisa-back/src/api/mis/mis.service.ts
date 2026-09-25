import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Mis } from './entities/mis.entity';
import { MisRepository } from './repositories/mis.repository';
import { CreateMisDto } from './dto/create-mis.dto';
import { UserData } from '../../shared/interfaces/user-data';
import { EnvironmentService } from '../environment/environment.service';
import { UserService } from '../user/user.service';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { FindManyOptions, Like } from 'typeorm';
import { MisMapper } from './mappers/mis.mapper';

@Injectable()
export class MisService {
  constructor(
    private _misRepository: MisRepository,
    private _environmentService: EnvironmentService,
    private _userService: UserService,
    private _misMapper: MisMapper,
  ) {}

  private readonly _where: FindManyOptions<Mis> = {
    relations: {
      environment_object: true,
    },
  };

  async create(createMisDto: CreateMisDto, userData: UserData) {
    if (!createMisDto) {
      throw new Error('Missing required data');
    } else if (!createMisDto.acronym) {
      throw new Error('Missing MIS acronym');
    } else if (!createMisDto.contact_point_id) {
      throw new Error('Missing MIS contact point');
    } else if (!createMisDto.environment) {
      throw new Error('Missing MIS environment');
    } else if (!createMisDto.name) {
      throw new Error('Missing MIS name');
    }

    const contactPoint = await this._userService.findOne(
      createMisDto.contact_point_id,
    );
    if (!contactPoint) {
      throw new Error(
        `User with ID "${createMisDto.contact_point_id}" not found`,
      );
    }

    const environment = await this._environmentService.findOneByAcronym(
      createMisDto.environment,
    );
    if (!environment) {
      throw new Error(
        `Environment with acronym "${createMisDto.environment}" not found`,
      );
    }

    const existingMis = await this.findOneByAcronymAndEnvironment(
      createMisDto.acronym,
      environment.acronym,
    );
    if (existingMis) {
      throw new Error(
        `MIS with acronym "${createMisDto.acronym}" and environment "${createMisDto.environment}" already exists`,
      );
    }

    const mis = this._misRepository.create({
      acronym: createMisDto.acronym,
      auditableFields: {
        created_by: userData.userId,
      },
      environment_id: environment.code as number,
      name: createMisDto.name,
      main_contact_point_id: contactPoint.id,
    });

    return this._misRepository
      .save(mis)
      .then((mis) =>
        this._misRepository.findOne({
          where: { id: mis.id },
          ...this._where,
        }),
      )
      .then((mis) => {
        return ResponseDto.buildCreatedResponse(
          this._misMapper.classToSimpleDto(mis),
          MisService,
        );
      });
  }

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<Mis[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._misRepository.find(this._where);
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._misRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          ...this._where,
        });
      default:
        throw Error('?!');
    }
  }

  async findOneByAcronymAndEnvironment(
    acronym: string,
    environment: string,
  ): Promise<Mis> {
    return await this._misRepository.findOne({
      where: {
        acronym,
        environment_object: { acronym: Like(environment) },
        auditableFields: { is_active: true },
      },
      ...this._where,
    });
  }

  /**
   * Logical delete (Yeck, 2026-09-24): the row stays so API keys, partner
   * requests and users that point at the MIS keep their history; only
   * `is_active` flips. `findOne` already hides inactive rows, so a retired
   * MIS can no longer be linked to a new key.
   */
  async setActive(
    id: number,
    active: boolean,
    userData: UserData,
  ): Promise<ResponseDto<Mis>> {
    const mis = await this._misRepository.findOne({
      where: { id },
      ...this._where,
    });
    if (!mis) {
      throw new Error(`MIS with ID "${id}" not found`);
    }
    if (active) {
      // The uniqueness rule of `create()` must hold again when a row returns.
      const clash = await this.findOneByAcronymAndEnvironment(
        mis.acronym,
        mis.environment_object?.acronym ?? '',
      );
      if (clash && clash.id !== mis.id) {
        throw new Error(
          `An active MIS with acronym "${mis.acronym}" already exists in that environment`,
        );
      }
    }
    mis.auditableFields.is_active = active;
    mis.auditableFields.updated_by = userData.userId;
    const saved = await this._misRepository.save(mis);
    return ResponseDto.buildOkResponse(saved);
  }

  async findOne(id: number): Promise<Mis> {
    return await this._misRepository.findOne({
      where: {
        id,
        auditableFields: { is_active: true },
      },
      ...this._where,
    });
  }

  async findMetadataById(id: number): Promise<Mis> {
    return await this._misRepository.findOne({
      where: {
        id,
        auditableFields: { is_active: true },
      },
      relations: {
        mis_auth: true,
      },
    });
  }
}
