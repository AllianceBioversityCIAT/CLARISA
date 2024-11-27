import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InitiativeDto } from './dto/initiative.dto';
import { UpdateInitiativeDto } from './dto/update-initiative.dto';
import { InitiativeRepository } from './repositories/initiative.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class InitiativeService {
  constructor(private _initiativesRepository: InitiativeRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InitiativeDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._initiativesRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._initiativesRepository.findAllInitiatives(option);
  }

  async findOne(id: number): Promise<InitiativeDto> {
    return this._initiativesRepository.findOneInitiativeById(id).catch(() => {
      throw ClarisaEntityNotFoundError.forId(
        this._initiativesRepository.target.toString(),
        id,
      );
    });
  }

  async findOneByOfficialCode(officialCode: string): Promise<InitiativeDto> {
    return this._initiativesRepository
      .findOneInitiativeByOfficialCode(officialCode)
      .catch(() => {
        throw ClarisaEntityNotFoundError.forSingleParam(
          this._initiativesRepository.target.toString(),
          'officialCode',
          officialCode,
        );
      });
  }

  async update(updateInitiativeDto: UpdateInitiativeDto[]) {
    return await this._initiativesRepository.save(updateInitiativeDto);
  }
}
