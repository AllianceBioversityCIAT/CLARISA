import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InstitutionSimpleDto } from './dto/institution-simple.dto';
import { InstitutionDto } from './dto/institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionRepository } from './repositories/institution.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class InstitutionService {
  constructor(private _institutionRepository: InstitutionRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    offset: number,
    limit: number,
    from: number = undefined,
  ): Promise<InstitutionDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._institutionRepository.target.toString(),
        'option',
        option,
      );
    }

    if (from != null && Number.isNaN(from)) {
      throw new BadParamsError(
        this._institutionRepository.target.toString(),
        'from',
        from,
      );
    }

    return this._institutionRepository.findInstitutions(
      option,
      from,
      undefined,
      offset,
      limit,
    );
  }

  async findAllSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    offset: number,
    limit: number,
  ): Promise<InstitutionSimpleDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._institutionRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._institutionRepository.findAllInstitutionsSimple(
      option,
      undefined,
      offset,
      limit,
    );
  }

  async findOne(id: number): Promise<InstitutionDto> {
    return this._institutionRepository.findInstitutionById(id).catch(() => {
      throw ClarisaEntityNotFoundError.forId(
        this._institutionRepository.target.toString(),
        id,
      );
    });
  }

  async findOneSimple(id: number): Promise<InstitutionSimpleDto> {
    return this._institutionRepository
      .findInstitutionSimpleById(id)
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._institutionRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateInitiativeDto: UpdateInstitutionDto[]) {
    return await this._institutionRepository.save(updateInitiativeDto);
  }
}
