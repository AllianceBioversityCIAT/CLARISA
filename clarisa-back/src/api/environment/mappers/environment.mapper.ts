import { Injectable } from '@nestjs/common';
import { Environment } from '../entities/environment.entity';
import { EnvironmentDto } from '../dto/environment.dto';
import { BasicDtoMapper } from '../../../shared/mappers/basic-dto.mapper';

@Injectable()
export class EnvironmentMapper {
  constructor(private _basicEMapper: BasicDtoMapper<Environment>) {}

  public classToDto(
    environment: Environment,
    showIsActive: boolean = false,
  ): EnvironmentDto {
    const environmentDto: EnvironmentDto = new EnvironmentDto();

    Object.assign(
      environmentDto,
      this._basicEMapper.classToDtoV2(environment, showIsActive),
    );

    environmentDto.acronym = environment.acronym;

    return environmentDto;
  }

  public classListToDtoList(
    environments: Environment[],
    showIsActive: boolean = false,
  ): EnvironmentDto[] {
    return environments.map((environment) =>
      this.classToDto(environment, showIsActive),
    );
  }
}
