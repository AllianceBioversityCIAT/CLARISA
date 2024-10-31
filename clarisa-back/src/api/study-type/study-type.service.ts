import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateStudyTypeDto } from './dto/update-study-type.dto';
import { StudyTypeRepository } from './repositories/study-type.repository';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class StudyTypeService {
  constructor(private _studyTypesRepository: StudyTypeRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._studyTypesRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._studyTypesRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._studyTypesRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return this._studyTypesRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._studyTypesRepository.target.toString(),
          id,
        );
      });
  }

  async update(updateStudyTypeDto: UpdateStudyTypeDto[]) {
    return await this._studyTypesRepository.save(updateStudyTypeDto);
  }
}
