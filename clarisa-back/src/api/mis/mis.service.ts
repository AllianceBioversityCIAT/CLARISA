import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Mis } from './entities/mis.entity';
import { MisRepository } from './repositories/mis.repository';
import { MisDto } from './dto/mis.dto';
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
    select: {
      id: true,
      name: true,
      acronym: true,
      main_contact_point_id: true,
    },
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
        return ResponseDto.createCreatedResponse(
          this._misMapper.classToSimpleDto(mis),
          MisService,
        );
      });
  }

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<MisDto[]> {
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

  async findOne(id: number): Promise<Mis> {
    return await this._misRepository.findOne({
      where: {
        id,
        auditableFields: { is_active: true },
      },
      ...this._where,
    });
  }
}
