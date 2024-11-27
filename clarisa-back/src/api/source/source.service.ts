import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { SourceRepository } from './repositories/source.repository';
import { SourceDto } from './dto/source.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class SourceService {
  constructor(private _sourceRepository: SourceRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<SourceDto[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this._sourceRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this._sourceRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw new BadParamsError(
          this._sourceRepository.target.toString(),
          'option',
          option,
        );
    }
  }

  async findOne(id: number): Promise<SourceDto> {
    return this._sourceRepository
      .findOneByOrFail({
        id,
        auditableFields: { is_active: true },
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._sourceRepository.target.toString(),
          id,
        );
      });
  }
}
