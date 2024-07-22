import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { Geoposition } from './entities/geoposition.entity';
import { GeopositionRepository } from './repositories/geoposition.repository';
import { FindOptionsSelect } from 'typeorm';
import { GeopositionDto } from './dto/geoposition.dto';

@Injectable()
export class GeopositionService {
  constructor(private _geopositionsRepository: GeopositionRepository) {}
  private readonly _select: FindOptionsSelect<Geoposition> = {
    id: true,
    latitude: true,
    longitude: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<GeopositionDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._geopositionsRepository.find({
          select: this._select,
        });
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._geopositionsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
          select: this._select,
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<GeopositionDto> {
    return await this._geopositionsRepository.findOne({
      where: { id, auditableFields: { is_active: true } },
      select: this._select,
    });
  }
}
