import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateTechnicalFieldDto } from './dto/update-technical-field.dto';
import { TechnicalFieldRepository } from './repositories/technical-field.repository';
import { BasicDtoV1 } from '../../shared/entities/dtos/basic.v1.dto';

@Injectable()
export class TechnicalFieldService {
  constructor(private technicalFieldsRepository: TechnicalFieldRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<BasicDtoV1[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.technicalFieldsRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.technicalFieldsRepository.find({
          where: {
            auditableFields: {
              is_active: option === FindAllOptions.SHOW_ONLY_ACTIVE,
            },
          },
        });
      default:
        throw Error('?!');
    }
  }

  async findOne(id: number): Promise<BasicDtoV1> {
    return await this.technicalFieldsRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(updateTechnicalFieldDto: UpdateTechnicalFieldDto[]) {
    return await this.technicalFieldsRepository.save(updateTechnicalFieldDto);
  }
}
