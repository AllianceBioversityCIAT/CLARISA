import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InstitutionSimpleDto } from './dto/institution-simple.dto';
import { InstitutionDto } from './dto/institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionRepository } from './repositories/institution.repository';

@Injectable()
export class InstitutionService {
  constructor(private institutionRepository: InstitutionRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    offset: number,
    limit: number,
    from: number = undefined,
  ): Promise<InstitutionDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    if (from != null && Number.isNaN(from)) {
      throw Error('?!');
    }

    return this.institutionRepository.findInstitutions(
      option,
      from,
      undefined,
      offset,
      limit,
    );
  }

  async findAllSimple(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
    offset: number,
    limit: number,
  ): Promise<InstitutionSimpleDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.institutionRepository.findAllInstitutionsSimple(
      option,
      undefined,
      offset,
      limit,
    );
  }

  async findOne(id: number): Promise<InstitutionDto> {
    return this.institutionRepository.findInstitutionById(id);
  }

  async findOneSimple(id: number): Promise<InstitutionSimpleDto> {
    return this.institutionRepository.findInstitutionSimpleById(id);
  }

  async update(updateInitiativeDto: UpdateInstitutionDto[]) {
    return await this.institutionRepository.save(updateInitiativeDto);
  }
}
