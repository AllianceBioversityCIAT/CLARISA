import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Mis } from './entities/mis.entity';
import { MisRepository } from './repositories/mis.repository';
import { MisDto } from './dto/mis.dto';
import { CreateMisDto } from './dto/create-mis.dto';
import { UserDataDto } from '../../shared/entities/dtos/user-data.dto';
import { EnvironmentService } from '../environment/environment.service';
import { UserService } from '../user/user.service';
import { ResponseDto } from '../../shared/entities/dtos/response.dto';
import { FindManyOptions, Like } from 'typeorm';
import { MisMapper } from './mappers/mis.mapper';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ExistingEntityError } from '../../shared/errors/existing-entity-error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

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

  async create(createMisDto: CreateMisDto, userData: UserDataDto) {
    this.validateOnCreation(createMisDto);

    const contactPoint = await this._userService.findOne(
      createMisDto.contact_point_id,
    );
    if (!contactPoint) {
      throw new BadParamsError(
        this._misRepository.target.toString(),
        'createMisDto.contact_point_id',
        createMisDto.contact_point_id,
        `User with ID "${createMisDto.contact_point_id}" not found`,
      );
    }

    const environment = await this._environmentService.findOneByAcronym(
      createMisDto.environment,
    );
    if (!environment) {
      throw new BadParamsError(
        this._misRepository.target.toString(),
        'createMisDto.environment',
        createMisDto.environment,
        `Environment with acronym "${createMisDto.environment}" not found`,
      );
    }

    const existingMis = await this.findOneByAcronymAndEnvironment(
      createMisDto.acronym,
      environment.acronym,
    );
    if (existingMis) {
      throw new ExistingEntityError(
        this._misRepository.target.toString(),
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
      .then((mis) => this.findOne(mis.id))
      .then((mis) => {
        return ResponseDto.buildCreatedResponse(mis, MisService);
      });
  }

  private validateOnCreation(createMisDto: CreateMisDto) {
    if (!createMisDto) {
      throw new BadParamsError(
        this._misRepository.target.toString(),
        'createMisDto',
        createMisDto,
        'Missing required data',
      );
    } else if (!createMisDto.acronym) {
      throw new BadParamsError(
        this._misRepository.target.toString(),
        'createMisDto.acronym',
        createMisDto.acronym,
        'Missing MIS acronym',
      );
    } else if (!createMisDto.contact_point_id) {
      throw new BadParamsError(
        this._misRepository.target.toString(),
        'createMisDto.contact_point_id',
        createMisDto.contact_point_id,
        'Missing MIS contact point',
      );
    } else if (!createMisDto.environment) {
      throw new BadParamsError(
        this._misRepository.target.toString(),
        'createMisDto.environment',
        createMisDto.environment,
        'Missing MIS environment',
      );
    } else if (!createMisDto.name) {
      throw new BadParamsError(
        this._misRepository.target.toString(),
        'createMisDto.name',
        createMisDto.name,
        'Missing MIS name',
      );
    }
  }

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<MisDto[]> {
    let mises: Mis[] = [];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        mises = await this._misRepository.find(this._where);
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        mises = await this._misRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          ...this._where,
        });
        break;
      default:
        throw new BadParamsError(
          this._misRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._misMapper.classListToDtoList(mises);
  }

  async findOneByAcronymAndEnvironment(
    acronym: string,
    environment: string,
  ): Promise<MisDto> {
    return this._misRepository
      .findOneOrFail({
        where: {
          acronym,
          environment_object: { acronym: Like(environment) },
          auditableFields: { is_active: true },
        },
        ...this._where,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forMultipleParams(
          this._misRepository.target.toString(),
          [{ acronym }, { environment }],
        );
      })
      .then((mis) => this._misMapper.classToDto(mis));
  }

  async findOne(id: number): Promise<MisDto> {
    return await this._misRepository
      .findOneOrFail({
        where: {
          id,
          auditableFields: { is_active: true },
        },
        ...this._where,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._misRepository.target.toString(),
          id,
        );
      })
      .then((mis) => this._misMapper.classToDto(mis));
  }
}
