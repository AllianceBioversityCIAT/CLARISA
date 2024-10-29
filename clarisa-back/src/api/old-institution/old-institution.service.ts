import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InstitutionSimpleDto } from '../institution/dto/institution-simple.dto';
import { InstitutionDto } from '../institution/dto/institution.dto';
import { UpdateOldInstitutionDto } from './dto/update-old-institution.dto';
import { OldInstitutionRepository } from './repositories/old-institution.repository';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class OldInstitutionService {
  constructor(private _oldInstitutionRepository: OldInstitutionRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    from: number = undefined,
  ): Promise<InstitutionDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._oldInstitutionRepository.target.toString(),
        'option',
        option,
      );
    }

    if (from != null && Number.isNaN(from)) {
      throw new BadParamsError(
        this._oldInstitutionRepository.target.toString(),
        'from',
        from,
      );
    }

    return this._oldInstitutionRepository.findInstitutions(
      option,
      undefined,
      from,
    );
  }

  async findAllSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InstitutionSimpleDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw new BadParamsError(
        this._oldInstitutionRepository.target.toString(),
        'option',
        option,
      );
    }

    return this._oldInstitutionRepository.findAllInstitutionsSimple(option);
  }

  async findOne(id: number): Promise<InstitutionDto> {
    return this._oldInstitutionRepository.findInstitutionById(id).catch(() => {
      throw ClarisaEntityNotFoundError.forId(
        this._oldInstitutionRepository.target.toString(),
        id,
      );
    });
  }

  async update(updateInitiativeDto: UpdateOldInstitutionDto[]) {
    return await this._oldInstitutionRepository.save(updateInitiativeDto);
  }
}
