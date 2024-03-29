import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { UpdateGeneralAcronymDto } from './dto/update-general-acronym.dto';
import { GeneralAcronym } from './entities/general-acronym.entity';
import { GeneralAcronymRepository } from './repositories/general-acronym.repository';

@Injectable()
export class GeneralAcronymService {
  constructor(private generalAcronimRepository: GeneralAcronymRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<GeneralAcronym[]> {
    switch (option) {
      case FindAllOptions.SHOW_ALL:
        return await this.generalAcronimRepository.find();
      case FindAllOptions.SHOW_ONLY_ACTIVE:
      case FindAllOptions.SHOW_ONLY_INACTIVE:
        return await this.generalAcronimRepository.find({
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

  async findOne(id: number): Promise<GeneralAcronym> {
    return await this.generalAcronimRepository.findOneBy({
      id,
      auditableFields: { is_active: true },
    });
  }

  async update(
    updateGeneralDtoList: UpdateGeneralAcronymDto[],
  ): Promise<GeneralAcronym[]> {
    return await this.generalAcronimRepository.save(updateGeneralDtoList);
  }
}
