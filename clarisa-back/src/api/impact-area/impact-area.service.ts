import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateImpactAreaDto } from './dto/update-impact-area.dto';
import { ImpactArea } from './entities/impact-area.entity';
import { ImpactAreaRepository } from './repositories/impact-area.repository';
import { ImpactAreaMapper } from './mappers/impact-area.mapper';
import { ImpactAreaDto } from './dto/impact-area.dto';

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
        throw Error('?!');
    }

    return this._impactAreaMapper.classListToDtoList(impactAreas);
  }

  async findOne(id: number): Promise<ImpactAreaDto> {
    const impactArea: ImpactArea = await this._impactAreasRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });

    return impactArea ? this._impactAreaMapper.classToDto(impactArea) : null;
  }

  async update(updateImpactAreaDto: UpdateImpactAreaDto[]) {
    return await this._impactAreasRepository.save(updateImpactAreaDto);
  }
}
