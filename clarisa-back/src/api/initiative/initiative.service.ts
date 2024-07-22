import { Injectable } from '@nestjs/common';
import { FindAllOptions } from '../../shared/entities/enums/find-all-options';
import { InitiativeDto } from './dto/initiative.dto';
import { UpdateInitiativeDto } from './dto/update-initiative.dto';
import { InitiativeRepository } from './repositories/initiative.repository';

@Injectable()
export class InitiativeService {
  constructor(private initiativesRepository: InitiativeRepository) {}

  async findAll(
    option: FindAllOptions = FindAllOptions.SHOW_ONLY_ACTIVE,
  ): Promise<InitiativeDto[]> {
    if (!Object.values<string>(FindAllOptions).includes(option)) {
      throw Error('?!');
    }

    return this.initiativesRepository.findAllInitiatives(option);
  }

  async findOne(id: number): Promise<InitiativeDto> {
    return this.initiativesRepository.findOneInitiativeById(id);
  }

  async findOneByOfficialCode(official_code: string): Promise<InitiativeDto> {
    return this.initiativesRepository.findOneInitiativeByOfficialCode(
      official_code,
    );
  }

  async update(updateInitiativeDto: UpdateInitiativeDto[]) {
    return await this.initiativesRepository.save(updateInitiativeDto);
  }
}
