import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateTechnicalFieldDto } from './dto/update-technical-field.dto';
import { TechnicalFieldRepository } from './repositories/technical-field.repository';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class TechnicalFieldService {
  constructor(private _technicalFieldsRepository: TechnicalFieldRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return this._technicalFieldsRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return this._technicalFieldsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._technicalFieldsRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return this._technicalFieldsRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._technicalFieldsRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateTechnicalFieldDto: UpdateTechnicalFieldDto[]) {
    return await this._technicalFieldsRepository.save(updateTechnicalFieldDto);
  }
}
