import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateImpactAreaDto } from './dto/update-impact-area.dto';
import { ImpactArea } from './entities/impact-area.entity';
import { ImpactAreaRepository } from './repositories/impact-area.repository';
import { ImpactAreaMapper } from './mappers/impact-area.mapper';
import { ImpactAreaDto } from './dto/impact-area.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class ImpactAreaService {
  constructor(
    private _impactAreasRepository: ImpactAreaRepository,
    private _impactAreaMapper: ImpactAreaMapper,
  ) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<ImpactAreaDto[]> {
    let impactAreas: ImpactArea[] = [];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        impactAreas = await this._impactAreasRepository.find();
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        impactAreas = await this._impactAreasRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
        break;
      default:
        throw new BadParamsError(
          this._impactAreasRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._impactAreaMapper.classListToDtoList(impactAreas);
  }

  async findOne(id: number): Promise<ImpactAreaDto> {
    return this._impactAreasRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._impactAreasRepository.target.toString(),
          id,
        );
      })
      .then((impactArea) => this._impactAreaMapper.classToDto(impactArea));
  }

  async update(updateImpactAreaDto: UpdateImpactAreaDto[]) {
    return await this._impactAreasRepository.save(updateImpactAreaDto);
  }
}
