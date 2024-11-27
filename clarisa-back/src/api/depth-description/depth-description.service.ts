import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateDepthDescriptionDto } from './dto/update-depth-description.dto';
import { DepthDescription } from './entities/depth-description.entity';
import { DepthDescriptionRepository } from './repositories/depth-description.repository';
import { DepthDescriptionMapper } from './mappers/depth-description.mapper';
import { FindOptionsSelect } from 'typeorm';
import { DepthDescriptionDto } from './dto/depth-description.dto';
import { BadParamsError } from '../../shared/errors/bad-params.error';
import { ClarisaEntityNotFoundError } from '../../shared/errors/clarisa-entity-not-found.error';

@Injectable()
export class DepthDescriptionService {
  constructor(
    private _depthDescriptionRepository: DepthDescriptionRepository,
    private _depthDescriptionMapper: DepthDescriptionMapper,
  ) {}
  private readonly _select: FindOptionsSelect<DepthDescription> = {
    id: true,
    name: true,
  };

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<DepthDescriptionDto[]> {
    let result: DepthDescription[] = [];

    switch (option) {
      case FindAllOptions.SHOW_ALL:
        result = await this._depthDescriptionRepository.find({
          select: this._select,
        });
        break;
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        result = await this._depthDescriptionRepository.find({
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
          this._depthDescriptionRepository.target.toString(),
          'option',
          option,
        );
    }

    return this._depthDescriptionMapper.classListToDtoList(result);
  }

  async findOne(id: number): Promise<DepthDescriptionDto> {
    return this._depthDescriptionRepository
      .findOneOrFail({
        where: { id, auditableFields: { is_active: true } },
        select: this._select,
      })
      .catch(() => {
        throw ClarisaEntityNotFoundError.forId(
          this._depthDescriptionRepository.target.toString(),
          id,
        );
      })
      .then((depthDescription) =>
        this._depthDescriptionMapper.classToDto(depthDescription),
      );
  }

  async update(updateDepthDescriptionDto: UpdateDepthDescriptionDto[]) {
    return await this._depthDescriptionRepository.save(
      updateDepthDescriptionDto,
    );
  }
}
