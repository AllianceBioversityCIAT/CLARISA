import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateGeneralAcronymDto } from './dto/update-general-acronym.dto';
import { GeneralAcronym } from './entities/general-acronym.entity';
import { GeneralAcronymRepository } from './repositories/general-acronym.repository';
import { GeneralAcronymMapper } from './mappers/general-acronym.mapper';
import { GeneralAcronymDto } from './dto/general-acronym.dto';
import { FindOptionsSelect } from 'typeorm';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class GeneralAcronymService {
  constructor(
    private _generalAcronimRepository: GeneralAcronymRepository,
    private _generalAcronimMapper: GeneralAcronymMapper,
  ) {}
  private readonly _select: FindOptionsSelect<GeneralAcronym> = {
    id: true,
    acronym: true,
    description: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<GeneralAcronymDto[]> {
    let generalAcronyms: GeneralAcronym[] = [];
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        generalAcronyms = await this._generalAcronimRepository.find({
          select: this._select,
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        generalAcronyms = await this._generalAcronimRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
        break;
      default:
        throw new BadParamsError(
          this._generalAcronimRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._generalAcronimMapper.classListToDtoList(generalAcronyms);
  }

  async findOne(id: number): Promise<GeneralAcronymDto> {
    return this._generalAcronimRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._generalAcronimRepository.target.toString(),
          id,
        );
      })
      .then((generalAcronym) =>
        this._generalAcronimMapper.classToDto(generalAcronym),
      );
  }

  async update(
    updateGeneralDtoList: UpdateGeneralAcronymDto[],
  ): Promise<GeneralAcronym[]> {
    return await this._generalAcronimRepository.save(updateGeneralDtoList);
  }
}
